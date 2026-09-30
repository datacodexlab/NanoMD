interface ModelConfig {
    id: string;
    extra: Record<string, unknown>;
}

// Tried in order. GLM is a reasoning model: with thinking on, a short text takes 40s+.
const MODELS: ModelConfig[] = [
    { id: "@cf/zai-org/glm-4.7-flash", extra: { chat_template_kwargs: { enable_thinking: false } } },
    { id: "@cf/mistralai/mistral-small-3.1-24b-instruct", extra: {} },
];
const MODEL_TIMEOUT_MS = 15000;
const MAX_CHARS = 50000;

function extractTranslation(response: any): string | null {
    if (typeof response?.response === "string") return response.response;
    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content.map((p: any) => typeof p === "string" ? p : (p?.text ?? "")).join("").trim();
    }
    if (typeof response?.choices?.[0]?.text === "string") return response.choices[0].text;
    return null;
}

async function runModel(env: any, model: ModelConfig, messages: unknown[]): Promise<string | null> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), MODEL_TIMEOUT_MS);
    });
    try {
        const res = await Promise.race([env.AI.run(model.id, { messages, ...model.extra }), timeout]);
        const text = extractTranslation(res);
        return text && text.trim() ? text : null;
    } finally {
        clearTimeout(timer);
    }
}

function buildPrompt(targetLang: "ar" | "en", useContext: boolean): string {
    const lang = targetLang === "ar" ? "Arabic" : "English";
    const rule = useContext
        ? "Infer the document domain internally before translating. Do not reveal the inferred domain. Choose natural terminology for that domain."
        : "Translate directly without domain analysis.";
    return `You are a professional Markdown translator. Translate the following Markdown text to ${lang}. Rules:
1. ${rule}
2. Preserve ALL Markdown formatting (headers, bold, italic, lists, links, tables, etc.)
3. Do NOT translate code blocks or inline code
4. Do NOT translate URLs or file paths
5. Do NOT add explanations or notes
6. Output ONLY the translated text
7. Maintain the original paragraph structure
8. Do NOT repeat the original term in parentheses after its translation`;
}

export async function onRequestPost(context: any) {
    const { request, env } = context;
    try {
        const ip = request.headers.get("CF-Connecting-IP") || "unknown";
        const rlKey = `rl_${ip}_${Math.floor(Date.now() / 60000)}`;
        const count = parseInt(await env.SHARED_CONTENT.get(rlKey) || "0");
        if (count >= 50) {
            return new Response(JSON.stringify({ error: "تجاوزت الحد المسموح للترجمة. حاول مرة أخرى بعد دقيقة." }), {
                status: 429, headers: { "Content-Type": "application/json" }
            });
        }
        await env.SHARED_CONTENT.put(rlKey, (count + 1).toString(), { expirationTtl: 60 });

        const body = await request.json() as { text?: string; targetLang?: "ar" | "en"; useContextTranslation?: boolean };
        if (!body.text || !body.targetLang) {
            return new Response(JSON.stringify({ error: "النص واللغة الهدف مطلوبان" }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }
        if (body.text.length > MAX_CHARS) {
            return new Response(JSON.stringify({ error: `النص يتجاوز الحد الأقصى (${MAX_CHARS} حرف)` }), {
                status: 400, headers: { "Content-Type": "application/json" }
            });
        }

        const prompt = buildPrompt(body.targetLang, body.useContextTranslation ?? true);
        const messages = [{ role: "system", content: prompt }, { role: "user", content: body.text }];

        let translated: string | null = null;
        for (const model of MODELS) {
            try {
                translated = await runModel(env, model, messages);
            } catch {
                translated = null;
            }
            if (translated) break;
        }

        if (!translated) throw new Error("Empty response");

        return new Response(JSON.stringify({ translated }), {
            status: 200, headers: { "Content-Type": "application/json" }
        });
    } catch {
        return new Response(JSON.stringify({ error: "حدث خطأ في خدمة الترجمة." }), {
            status: 503, headers: { "Content-Type": "application/json" }
        });
    }
}

const PRIMARY_MODEL = "@cf/zai-org/glm-4.7-flash";
const FALLBACK_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
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
7. Maintain the original paragraph structure`;
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
        try {
            const res = await env.AI.run(PRIMARY_MODEL, { messages });
            translated = extractTranslation(res);
        } catch {
            const res = await env.AI.run(FALLBACK_MODEL, { messages });
            translated = extractTranslation(res);
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

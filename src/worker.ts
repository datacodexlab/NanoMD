import { getAssetFromKV } from "@cloudflare/kv-asset-handler";
// @ts-ignore
import manifestJSON from "__STATIC_CONTENT_MANIFEST";

const assetManifest = JSON.parse(manifestJSON);
const PRIMARY_TRANSLATION_MODEL = "@cf/zai-org/glm-4.7-flash";
const FALLBACK_TRANSLATION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";
const MAX_TRANSLATION_CHARS = 50000;

function extractTranslation(response: any): string | null {
    if (typeof response?.response === "string") {
        return response.response;
    }

    const choiceContent = response?.choices?.[0]?.message?.content;
    if (typeof choiceContent === "string") {
        return choiceContent;
    }

    if (Array.isArray(choiceContent)) {
        return choiceContent
            .map((part) => {
                if (typeof part === "string") return part;
                if (typeof part?.text === "string") return part.text;
                return "";
            })
            .join("")
            .trim();
    }

    if (typeof response?.choices?.[0]?.text === "string") {
        return response.choices[0].text;
    }

    return null;
}

function isUnexpectedModelResponse(error: unknown): boolean {
    return error instanceof Error && error.message.startsWith("Unexpected translation response");
}

function buildTranslationPrompt(targetLang: "ar" | "en", useContextTranslation: boolean): string {
    const targetLanguage = targetLang === "ar" ? "Arabic" : "English";
    const contextRule = useContextTranslation
        ? "Infer the document domain internally before translating. Do not reveal the inferred domain or any analysis. Choose natural terminology and tone for that domain."
        : "Translate directly without adding domain analysis.";

    return `You are a professional Markdown translator. Translate the following Markdown text to ${targetLanguage}. Rules:
1. ${contextRule}
2. Preserve ALL Markdown formatting (headers, bold, italic, lists, links, tables, etc.)
3. Do NOT translate code blocks (\`\`\` or inline \`code\`)
4. Do NOT translate URLs or file paths
5. Do NOT add explanations, notes, labels, or analysis
6. Output ONLY the translated text
7. Maintain the original paragraph structure`;
}

async function runTranslation(env: any, model: string, systemPrompt: string, text: string): Promise<string> {
    const response = await env.AI.run(model, {
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text }
        ]
    });

    const translated = extractTranslation(response);
    if (!translated) {
        throw new Error(`Unexpected translation response from ${model}`);
    }

    return translated;
}

export default {
    async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // API Route: POST /api/share
        if (request.method === "POST" && url.pathname === "/api/share") {
            try {
                // Check body size limit (500KB)
                const contentLength = parseInt(request.headers.get("content-length") || "0");
                if (contentLength > 500 * 1024) {
                    return new Response(JSON.stringify({ error: "Content exceeds 500KB limit" }), {
                        status: 413,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const body = await request.json() as { content?: string };
                if (!body.content) {
                    return new Response(JSON.stringify({ error: "Content is required" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                if (new Blob([body.content]).size > 500 * 1024) {
                    return new Response(JSON.stringify({ error: "Content exceeds 500KB limit" }), {
                        status: 413,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Generate 8-character random ID
                const id = Math.random().toString(36).substring(2, 10);
                
                // Store in KV with 30-day TTL (2592000 seconds)
                await env.SHARED_CONTENT.put(id, body.content, { expirationTtl: 2592000 });

                return new Response(JSON.stringify({ id }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: "Invalid request" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // API Route: POST /api/translate
        if (request.method === "POST" && url.pathname === "/api/translate") {
            try {
                // Rate Limiting (50 requests / minute)
                const ip = request.headers.get("CF-Connecting-IP") || "unknown";
                const rlKey = `rl_${ip}_${Math.floor(Date.now() / 60000)}`;
                const currentCount = parseInt(await env.SHARED_CONTENT.get(rlKey) || "0");
                
                if (currentCount >= 50) {
                    return new Response(JSON.stringify({ error: "تجاوزت الحد المسموح للترجمة. حاول مرة أخرى بعد دقيقة." }), {
                        status: 429,
                        headers: { "Content-Type": "application/json" }
                    });
                }
                await env.SHARED_CONTENT.put(rlKey, (currentCount + 1).toString(), { expirationTtl: 60 });

                const body = await request.json() as { text?: string, targetLang?: "ar" | "en", useContextTranslation?: boolean };
                if (!body.text || !body.targetLang) {
                    return new Response(JSON.stringify({ error: "النص واللغة الهدف مطلوبان" }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                if (body.text.length > MAX_TRANSLATION_CHARS) {
                    return new Response(JSON.stringify({ error: `النص يتجاوز الحد الأقصى (${MAX_TRANSLATION_CHARS} حرف)` }), {
                        status: 400,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const systemPrompt = buildTranslationPrompt(body.targetLang, body.useContextTranslation ?? true);

                try {
                    let translated: string;

                    try {
                        translated = await runTranslation(env, PRIMARY_TRANSLATION_MODEL, systemPrompt, body.text);
                    } catch (primaryError) {
                        if (isUnexpectedModelResponse(primaryError)) {
                            throw primaryError;
                        }
                        console.warn("[NanoMD] Primary translation model failed, trying fallback.", primaryError);
                        translated = await runTranslation(env, FALLBACK_TRANSLATION_MODEL, systemPrompt, body.text);
                    }

                    return new Response(JSON.stringify({ translated }), {
                        status: 200,
                        headers: { "Content-Type": "application/json" }
                    });
                } catch (aiError) {
                    return new Response(JSON.stringify({ error: "حدث خطأ في خدمة الترجمة. الحصة اليومية قد تكون انتهت أو الخدمة غير متاحة مؤقتاً." }), {
                        status: 503,
                        headers: { "Content-Type": "application/json" }
                    });
                }
            } catch (e) {
                return new Response(JSON.stringify({ error: "طلب غير صالح" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // API Route: GET /api/share/:id
        if (request.method === "GET" && url.pathname.startsWith("/api/share/")) {
            const id = url.pathname.split("/").pop();
            if (!id) {
                return new Response(JSON.stringify({ error: "Invalid ID" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                });
            }

            try {
                const content = await env.SHARED_CONTENT.get(id);
                if (!content) {
                    return new Response(JSON.stringify({ error: "Content not found or expired" }), {
                        status: 404,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                return new Response(JSON.stringify({ content }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (e) {
                return new Response(JSON.stringify({ error: "Server error" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        try {
            return await getAssetFromKV(
                {
                    request,
                    waitUntil: ctx.waitUntil.bind(ctx),
                },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: assetManifest,
                }
            );
        } catch (e) {
            // If asset not found, serve index.html for SPA routing
            try {
                const notFoundResponse = await getAssetFromKV(
                    {
                        request: new Request(new URL("/index.html", request.url).toString(), request),
                        waitUntil: ctx.waitUntil.bind(ctx),
                    },
                    {
                        ASSET_NAMESPACE: env.__STATIC_CONTENT,
                        ASSET_MANIFEST: assetManifest,
                    }
                );
                return new Response(notFoundResponse.body, {
                    ...notFoundResponse,
                    status: 200,
                });
            } catch {
                return new Response("Not Found", { status: 404 });
            }
        }
    },
};

// Repairs UTF-8 text transmitted as Latin-1 bytes (some HTTP clients don't set charset).
// Only attempts repair when ALL chars are ≤ U+00FF — the signature of UTF-8 bytes
// stored as Latin-1 code points. Proper Unicode (any char > U+00FF) is returned as-is.
function tryRepairEncoding(str: string): string {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 0xFF) return str;
    }
    try {
        const bytes = new Uint8Array(str.length);
        for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
        return str;
    }
}

export async function onRequestPost(context: any) {
    const { request, env } = context;
    try {
        const contentLength = parseInt(request.headers.get("content-length") || "0");
        if (contentLength > 500 * 1024) {
            return new Response(JSON.stringify({ error: "Content exceeds 500KB limit" }), {
                status: 413, headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }
        const body = await request.json() as { content?: string; mode?: string; expiresIn?: number };
        if (!body.content) {
            return new Response(JSON.stringify({ error: "Content is required" }), {
                status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }
        const content = tryRepairEncoding(body.content);
        if (new Blob([content]).size > 500 * 1024) {
            return new Response(JSON.stringify({ error: "Content exceeds 500KB limit" }), {
                status: 413, headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }
        const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        const mode = body.mode === 'review' ? 'review' : undefined;
        const ttl = (body.expiresIn && body.expiresIn > 0 && body.expiresIn <= 2592000)
            ? Math.floor(body.expiresIn)
            : 2592000;
        const stored = mode ? JSON.stringify({ content, mode }) : content;
        await env.SHARED_CONTENT.put(id, stored, { expirationTtl: ttl });
        return new Response(JSON.stringify({ id }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    } catch {
        return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }
}

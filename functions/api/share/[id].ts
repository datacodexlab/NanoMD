export async function onRequestGet(context: any) {
    const { params, env } = context;
    const id = params.id;
    if (!id) {
        return new Response(JSON.stringify({ error: "Invalid ID" }), {
            status: 400, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }
    try {
        const raw = await env.SHARED_CONTENT.get(id);
        if (!raw) {
            return new Response(JSON.stringify({ error: "Content not found or expired" }), {
                status: 404, headers: { "Content-Type": "application/json; charset=utf-8" }
            });
        }
        // Backward compatibility: plain string or JSON { content, mode }
        let content = raw;
        let mode: string | undefined;
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.content === 'string') {
                content = parsed.content;
                mode = parsed.mode;
            }
        } catch {
            // plain string — old format
        }
        return new Response(JSON.stringify({ content, ...(mode ? { mode } : {}) }), {
            status: 200, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    } catch {
        return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500, headers: { "Content-Type": "application/json; charset=utf-8" }
        });
    }
}

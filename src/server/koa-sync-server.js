export function createKoaSyncServer({
    getFullData,
    heartbeatInterval = 15000,
    heartbeatMessage = ': heartbeat\n\n',
    maxClients = 0,
    auth = null,
} = {}) {
    if (typeof getFullData !== 'function') throw new Error('createSSE: getFullData must be a function');

    const clients = new Set();
    const heartbeatTimers = new WeakMap();

    function cleanupClient(res) {
        clients.delete(res);
        const timer = heartbeatTimers.get(res);
        if (timer) {
            clearInterval(timer);
            heartbeatTimers.delete(res);
        }
        try { res.end(); } catch (_) {}
    }

    async function handler(ctx) {
        if (auth) {
            try {
                const result = await auth(ctx);
                if (!result && typeof result !== 'object') {
                    ctx.status = 401;
                    ctx.body = 'Unauthorized';
                    return;
                }
                ctx.state.auth = result;
            } catch (err) {
                ctx.status = 500;
                ctx.body = 'Auth failed';
                return;
            }
        }

        if (maxClients > 0 && clients.size >= maxClients) {
            ctx.status = 503;
            ctx.body = 'Too many connections, please try later';
            return;
        }

        ctx.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        });
        ctx.respond = false;
        ctx.res.statusCode = 200;
        ctx.req.socket.setTimeout(0);
        clients.add(ctx.res);

        try {
            const data = await getFullData(ctx);
            ctx.res.write(`data: ${JSON.stringify({ type: 'full', data })}\n\n`);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Internal server error';
            try { ctx.res.write(`event: server-error\ndata: ${JSON.stringify({ message })}\n\n`); } catch (_) {}
            cleanupClient(ctx.res);
            return;
        }

        const timer = setInterval(() => {
            try { ctx.res.write(heartbeatMessage); } catch (_) { cleanupClient(ctx.res); }
        }, heartbeatInterval);
        heartbeatTimers.set(ctx.res, timer);

        const cleanup = () => cleanupClient(ctx.res);
        ctx.req.on('close', cleanup);
        ctx.req.on('error', cleanup);
        ctx.res.on('close', cleanup);
        ctx.res.on('error', cleanup);
    }

    function broadcast(data, { exclude } = {}) {
        const payload = `data: ${JSON.stringify({ type: 'increment', data })}\n\n`;
        for (const client of [...clients]) {
            if (client === exclude) continue;
            try {
                if (client.writable) client.write(payload);
            } catch (_) {
                cleanupClient(client);
            }
        }
    }

    function disconnect() {
        for (const client of clients) {
            cleanupClient(client);
        }
    }

    return {
        handler,
        broadcast,
        disconnect,
        get clientCount() { return clients.size; }
    };
}
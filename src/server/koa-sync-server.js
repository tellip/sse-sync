import assert from 'assert'

export function createKoaSyncServer({
    getFullData,
    heartbeatInterval = 15000,
    heartbeatMessage = ': heartbeat\n\n',
    maxClients = 0,
    auth = null,
} = {}) {
    assert(
        typeof getFullData === 'function' &&
        Number.isInteger(heartbeatInterval) && heartbeatInterval >= 1000 &&
        typeof heartbeatMessage === 'string' &&
        Number.isInteger(maxClients) && maxClients >= 0 &&
        (typeof auth === 'function' || auth === null),
        'Invalid parameters for createKoaSyncServer'
    )

    const clients = new Set();
    const heartbeatTimers = new WeakMap();

    function cleanupClient(res) {
        clients.delete(res);
        const timer = heartbeatTimers.get(res);
        if (timer) {
            clearInterval(timer);
            heartbeatTimers.delete(res);
        }
        try {
            res.end();
        } catch (_) {
        }
    }

    return {
        async handler(ctx) {
            assert(
                ctx &&
                typeof ctx.set === 'function' &&
                ctx.req &&
                ctx.res &&
                typeof ctx.res.write === 'function' &&
                ctx.req.socket &&
                typeof ctx.req.socket.setTimeout === 'function' &&
                ctx.state,
                'Invalid parameters for createKoaSyncServer().handler'
            );

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
                ctx.res.write(`data: ${JSON.stringify({type: 'full', data})}\n\n`);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Internal server error';
                try {
                    ctx.res.write(`event: server-error\ndata: ${JSON.stringify({message})}\n\n`);
                } catch (_) {
                }
                cleanupClient(ctx.res);
                return;
            }

            const timer = setInterval(() => {
                try {
                    ctx.res.write(heartbeatMessage);
                } catch (_) {
                    cleanupClient(ctx.res);
                }
            }, heartbeatInterval);
            heartbeatTimers.set(ctx.res, timer);

            const cleanup = () => cleanupClient(ctx.res);
            ctx.req.on('close', cleanup);
            ctx.req.on('error', cleanup);
            ctx.res.on('close', cleanup);
            ctx.res.on('error', cleanup);
        },
        broadcast(data, {exclude} = {}) {
            const payload = `data: ${JSON.stringify({type: 'increment', data})}\n\n`;
            for (const client of [...clients]) {
                if (client === exclude) continue;
                try {
                    if (client.writable) client.write(payload);
                } catch (_) {
                    cleanupClient(client);
                }
            }
        },
        disconnect() {
            for (const client of clients) {
                cleanupClient(client);
            }
        },
        get clientCount() {
            return clients.size;
        }
    };
}
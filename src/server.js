import assert from 'assert';
import {createSession} from 'better-sse';

export function createSyncServer({
    getFullData,
    heartbeatInterval = 15000,
    maxClients = 0,
} = {}) {
    assert(
        typeof getFullData === 'function' &&
        Number.isInteger(heartbeatInterval) && heartbeatInterval >= 1000 &&
        Number.isInteger(maxClients) && maxClients >= 0,
        'Invalid parameters for createSyncServer'
    );

    const sessions = new Map();

    return {
        async handler(req, res) {
            if (maxClients > 0 && sessions.size >= maxClients) {
                res.writeHead(503, {'Content-Type': 'text/plain'});
                res.end('Too many connections, please try later');
                return;
            }

            const session = await createSession(req, res, {
                statusCode: 200,
                keepAlive: heartbeatInterval,
            });
            sessions.set(session, res);
            session.on('disconnected', () => {
                sessions.delete(session);
            });

            try {
                session.push({type: 'full', data: await getFullData(req, res)})
            } catch (err) {
                try {
                    session.push({message: err instanceof Error ? err.message : 'Internal server error'}, 'server-error');
                } finally {
                    res.end()
                }
            }
        },

        broadcast(data, {exclude} = {}) {
            for (const [session, res] of [...sessions]) if (session !== exclude) try {
                session.push({type: 'increment', data})
            } catch (_) {
                res.end()
            }
        },

        disconnect() {
            for (const [, res] of [...sessions]) res.end();
            sessions.clear();
        },

        get clientCount() {
            return sessions.size;
        },
    };
}
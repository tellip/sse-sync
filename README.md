# sse-sync

Minimal SSE-based data sync between a Koa server and browser clients.

## Install

```bash
npm install sse-sync
```

## Usage

### Server (Koa)

```js
import Koa from 'koa';
import { createKoaSyncServer } from 'sse-sync/server';

const app = new Koa();
const sse = createKoaSyncServer({
  getFullData: async (ctx) => ({ message: 'Hello' }),
});

app.use(sse.handler);
app.listen(3000);

// Broadcast incremental updates
sse.broadcast({ message: 'update' });
```

### Client (Browser)

```js
import { createSyncClient } from 'sse-sync/client';

const client = createSyncClient('/sse', {
  onFull: (data) => console.log('Initial data:', data),
  onIncrement: (data) => console.log('Update:', data),
});

client.connect();
// client.close();
```

## API

### Server: `createKoaSyncServer(options)`

- `options.getFullData(ctx)` – async function, returns the initial dataset.
- `options.heartbeatInterval` (default `15000`) – ms between heartbeats.
- `options.maxClients` (default `0` = unlimited)
- `options.auth(ctx)` – optional async auth function.
- Returns `{ handler, broadcast, disconnect, clientCount }`.

### Client: `createSyncClient(url, options)`

- `options.onFull(data)` / `onIncrement(data)` – data callbacks.
- `options.onServerError(err)`, `onError(err)`, `onOpen()`, `onClose()`.
- `options.reconnectDelay` (default `3000`), `exponentialBackoff` (default `true`).
- `options.maxReconnectAttempts` (default `Infinity`).
- Returns `{ connect, close, status }`.

## Protocol

- `full` – initial dataset sent on connection.
- `increment` – incremental updates broadcast by server.
- `server-error` – custom event for server-side errors.

## License

MIT
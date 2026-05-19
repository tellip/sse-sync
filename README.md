# sse-sync

Minimal SSE-based data sync between a Node.js HTTP server and browser clients.

## Install

```bash
npm install sse-sync
```

## Usage

### Server (Node.js HTTP)

```js
import http from 'http';
import { createSyncServer } from 'sse-sync/server';

const sse = createSyncServer({
  getSnapshot: async (req, res) => ({ message: 'Hello' }),
});

const server = http.createServer((req, res) => {
  if (req.url === '/sse') {
    return sse.handler(req, res);
  }
  // handle other routes...
  res.writeHead(404).end();
});

server.listen(3000);

// Broadcast an update
sse.broadcast({ message: 'update' });
```

> **Compatible with any framework** (Express, Koa, etc.) – just pass the native `req`/`res` to `sse.handler`.

### Client (Browser)

```js
import { fetchSyncSource } from 'sse-sync/client';

const controller = new AbortController();

fetchSyncSource('/sse', {
  onSnapshot: (data) => console.log('Initial state:', data),
  onUpdate: (data) => console.log('Update:', data),
  signal: controller.signal,
});

// To disconnect: controller.abort();
```

## API

### Server: `createSyncServer(options)`

- `options.getSnapshot(req, res)` – async function, returns the snapshot of the current state when a client connects.
- `options.heartbeatInterval` (default `15000`) – ms between heartbeats.
- `options.maxClients` (default `0` = unlimited)
- Returns `{ handler, broadcast, disconnect, clientCount }`.
  - `handler(req, res)` – native Node.js HTTP request handler (async).
  - `broadcast(data, { exclude? })` – push an update to all connected clients.
  - `disconnect()` – close all client connections.
  - `clientCount` – number of currently connected clients.

### Client: `fetchSyncSource(url, options)`

Wraps [@microsoft/fetch-event-source](https://github.com/Azure/fetch-event-source). Returns the underlying `Promise` (resolves when the connection closes cleanly).

- `options.onSnapshot(data)` – called when the initial snapshot is received.
- `options.onUpdate(data)` – called for each subsequent update.
- Any option supported by `fetchEventSource` can be passed through (e.g. `signal`, `headers`, `onopen`, `onclose`, `onerror`).
- Use an `AbortController` (`options.signal`) to disconnect.

## Protocol

- `snapshot` – a snapshot of the current state sent when a client connects.
- `update` – an incremental update broadcast by the server.
- `server-error` – custom event for server-side errors.

## License

ISC
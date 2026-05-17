// sync-client.js
export function createSyncClient(url, {
    onFull,
    onIncrement,
    onServerError,
    onError,
    onOpen,
    onClose,
    reconnectDelay = 3000,
    maxReconnectAttempts = Infinity,
    autoCloseOnUnload = true,
    exponentialBackoff = true,
    maxReconnectDelay = 30000
} = {}) {
    let eventSource = null;
    let reconnectAttempts = 0;
    let reconnectTimer = null;
    let closed = false;
    let status = 'disconnected';

    function connect() {
        if (closed) return;

        // 关闭可能存在的旧连接
        if (eventSource) {
            eventSource.close();
            clearTimeout(reconnectTimer);
        }

        status = 'connecting';
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
            reconnectAttempts = 0;
            status = 'open';
            onOpen?.();
        };

        eventSource.onmessage = (event) => {
            try {
                const { type, data } = JSON.parse(event.data);
                if (type === 'full') {
                    onFull?.(data);
                } else if (type === 'increment') {
                    onIncrement?.(data);
                }
            } catch (err) {
                onError?.(err);
            }
        };

        // 服务端自定义事件改用 'server-error'，避免与浏览器 error 事件冲突
        eventSource.addEventListener('server-error', (event) => {
            try {
                const payload = JSON.parse(event.data);
                onServerError?.(new Error(payload.message || 'Server error'));
            } catch {
                onServerError?.(new Error('Unknown server error'));
            }
        });

        eventSource.onerror = () => {
            eventSource.close();
            if (closed) return;

            if (reconnectAttempts < maxReconnectAttempts) {
                const delay = exponentialBackoff
                    ? Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay)
                    : reconnectDelay;
                reconnectTimer = setTimeout(() => {
                    reconnectAttempts++;
                    connect();
                }, delay);
            } else {
                closed = true;
                status = 'closed';
                onError?.(new Error('Max reconnect attempts reached'));
                onClose?.();
            }
        };
    }

    function close() {
        closed = true;
        status = 'closed';
        if (eventSource) eventSource.close();
        clearTimeout(reconnectTimer);
        onClose?.();
    }

    if (autoCloseOnUnload && typeof window !== 'undefined') {
        window.addEventListener('beforeunload', close);
    }

    return {
        connect,
        close,
        get status() { return status; }
    };
}
import {SSE} from 'sse.js';

export function createSyncClient(...args) {
    const es = new SSE(...args);

    es.addEventListener('message', e => {
        e.preventDefault();
        const {type, data} = JSON.parse(e.data);
        es.dispatchEvent(new CustomEvent(type, {detail: data}));
    });

    es.addEventListener('server-error', e => {
        throw e
    });

    if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => es.close());

    return es;
}
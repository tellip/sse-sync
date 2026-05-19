import invariant from 'tiny-invariant'
import {fetchEventSource} from "@microsoft/fetch-event-source";

export function fetchSyncSource(url, {onSnapshot, onUpdate, ...rest} = {}) {
    invariant(
        (!onSnapshot || typeof onSnapshot === 'function') &&
        (!onUpdate || typeof onUpdate === 'function'),
        'Invalid parameters for createSyncServer'
    )

    return fetchEventSource(url, {
        ...rest,
        onmessage(ev) {
            try {
                if (ev.event === 'server-error') rest.onerror?.(new Error(JSON.parse(ev.data)));
                else {
                    const fn = {snapshot: onSnapshot, update: onUpdate}[ev.event];
                    if (fn) fn(JSON.parse(ev.data))
                    else rest.onmessage?.(ev);
                }
            } catch (e) {
                rest.onerror?.(e);
            }
        }
    });
}
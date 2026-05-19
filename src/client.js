import invariant from 'tiny-invariant'
import {fetchEventSource} from "@microsoft/fetch-event-source";

export function fetchSyncSource(url, {onFull, onIncrement, ...rest} = {}) {
    invariant(
        (!onFull || typeof onFull === 'function') &&
        (!onIncrement || typeof onIncrement === 'function'),
        'Invalid parameters for createSyncServer'
    )

    return fetchEventSource(url, {
        ...rest,
        onmessage(ev) {
            try {
                if (ev.event === 'server-error') rest.onerror?.(new Error(JSON.parse(ev.data)));
                else {
                    const fn = {full: onFull, increment: onIncrement}[ev.event];
                    if (fn) fn(JSON.parse(ev.data))
                    else rest.onmessage?.(ev);
                }
            } catch (e) {
                rest.onerror?.(e);
            }
        }
    });
}
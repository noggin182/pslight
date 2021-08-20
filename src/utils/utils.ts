import { isObservable, MonoTypeOperatorFunction, Observable, of, switchMap } from 'rxjs';

export function mapObject<T extends Record<string, unknown>, U>(object: T, callback: (value: T[keyof T], name: string, object: T) => U): { [P in keyof T]: U } {
    return Object.fromEntries(Object.entries(object).map(([name, value]) => [name, callback(value as T[keyof T], name, object)])) as { [P in keyof T]: U };
}

/** Return true if value is an object */
export function isObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function onlyIf(other: Observable<boolean>): MonoTypeOperatorFunction<boolean> {
    return function (source: Observable<boolean>) {
        const falseNonCompleting = new Observable<boolean>(s => s.next(false));
        return other.pipe(switchMap(enabled => enabled ? falseNonCompleting : source));
    };
}

/**
 * Combines a dictionary of Observables into a single stream
 * 
 * Internally, combineThenPartial will wait for all Observables to emit at least one value. It will then
 * emit a dictionary containing the latest value of all child Observables (Initially, this is similar to combineLatest)
 * 
 * After the initial complete dictionary has been emitted, a partial dictionary will be emitted every time a child
 * Observable emits, containing only the value of the updated Obsersable with the other keys omitted
 */
export function combineThenPartial(record: Record<string, Observable<unknown>>): Observable<Record<string, unknown>> {
    const entries = Object.entries(record);
    const waiting = Symbol('WaitingForInitialValue');

    return !entries.length ? of({}) : new Observable(subscriber => {
        let keysRequired = entries.length;
        let cache: Record<string, unknown> | undefined = mapObject(record, () => waiting);
        let active = keysRequired;
        const subscriptions = entries.map(([name, value$]) => value$.subscribe({
            next: (value) => {
                if (cache === undefined) {
                    subscriber.next({ [name]: value });
                } else {
                    if (cache[name] === waiting) {
                        keysRequired--;
                    }
                    cache[name] = value;
                    if (keysRequired === 0) {
                        subscriber.next(cache);
                        cache = undefined;
                    }
                }
            },
            complete: () => {
                if (!--active) {
                    subscriber.complete();
                }
            }
        }));
        return () => subscriptions.forEach(s => s.unsubscribe());
    });
}

type DeepUnwrapObservable<T>
    = T extends Record<string, unknown> ? { [P in keyof T]?: DeepUnwrapObservable<T[P]> }
    : T extends Observable<infer U> ? U : T;

/**
 * Returns a single observable containing the a flat object where the values of any nested obser flattening observable values.
 * The first value e
 * @param object 
 * @returns 
 */
export function flattenAndWatch<T extends Record<string, unknown>>(object: T): Observable<DeepUnwrapObservable<T>> {
    return walk(object) as Observable<DeepUnwrapObservable<T>>;
    function walk(value: unknown): Observable<unknown> {
        if (isObservable(value)) {
            return value;
        } else if (isObject(value)) {
            return combineThenPartial(mapObject(value, (v) => walk(v)));
        } else {
            return of(value);
        }
    }
}

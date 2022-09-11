import { asyncScheduler, MonoTypeOperatorFunction, Observable, SchedulerLike, Subscription, tap } from 'rxjs';

export function resetAfter<T>(timeout: number, resetValue: T, scheduler: SchedulerLike = asyncScheduler): MonoTypeOperatorFunction<T> {
    return (source$) => {
        return new Observable<T>(subscriber => {
            let activeTask: Subscription | null = null;

            const clearTask = () => {
                if (activeTask) {
                    activeTask.unsubscribe();
                    activeTask = null;
                }
            };

            const emitReset = () => {
                clearTask();
                subscriber.next(resetValue);
            };

            const resetTimeout = () => {
                clearTask();
                activeTask = scheduler.schedule(emitReset, timeout);
            };

            return source$.pipe(tap(resetTimeout)).subscribe(subscriber);
        });
    };
}

import isRpi from 'detect-rpi';
import { BehaviorSubject, Observable } from 'rxjs';

export class PsPowerMonitor {
    constructor() {
        if (isRpi()) {
            // TODO: hook up to GPIO
            this.isMocked = false;
        } else {
            this.isMocked = true;
        }
    }

    private powerSubject$ = new BehaviorSubject(false);
    powerStatus$: Observable<boolean> = this.powerSubject$;
    get currentStatus(): boolean { return this.powerSubject$.value; }
    set currentStatus(status: boolean) {
        if (!this.isMocked) {
            throw new Error('Setting currentStatus is only supported by a mocked PsPowerMonitor');
        }
        this.powerSubject$.next(status);
    }

    readonly isMocked: boolean;
}
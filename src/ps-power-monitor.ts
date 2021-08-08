import { Gpio, ValueCallback } from 'onoff';
import { BehaviorSubject, Observable } from 'rxjs';

export class PsPowerMonitor {
    constructor(gpio: Gpio | undefined) {
        if (gpio) {
            this.isMocked = false;
            gpio.watch(this.handleGpioChange);
            gpio.read(this.handleGpioChange);
        } else {
            this.isMocked = true;
        }
    }

    private handleGpioChange: ValueCallback = (err, value) => {
        if (!err) {
            this.powerSubject$.next(value == Gpio.HIGH);
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
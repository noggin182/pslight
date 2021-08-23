import { Gpio, ValueCallback } from 'onoff';
import { BehaviorSubject } from 'rxjs';
import { WritableSubject } from './utils/writable-subject';

export class PsPowerMonitor {
    constructor(gpio: Gpio | undefined) {
        if (gpio) {
            this.isMocked = false;
            this.powerStatus$ = new BehaviorSubject<boolean>(false);
            gpio.watch(this.handleGpioChange);
            gpio.read(this.handleGpioChange);
        } else {
            this.isMocked = true;
            this.powerStatus$ = new WritableSubject<boolean>(false);
        }
    }

    private handleGpioChange: ValueCallback = (err, value) => {
        if (!err) {
            this.powerStatus$.next(value == Gpio.HIGH);
        }
    }

    readonly powerStatus$: BehaviorSubject<boolean>;
    readonly isMocked: boolean;
}
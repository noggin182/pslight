import { Gpio, ValueCallback } from 'onoff';
import { BehaviorSubject } from 'rxjs';

export class GpioPsPowerMonitor {
    constructor(gpio: Gpio) {
        gpio.watch(this.handleGpioChange);
        gpio.read(this.handleGpioChange);
    }

    private handleGpioChange: ValueCallback = (err, value) => {
        if (!err) {
            this.powerStatusSubject$.next(value == Gpio.HIGH);
        }
    }

    private readonly powerStatusSubject$ = new BehaviorSubject<boolean>(false);
    readonly powerStatus$ = this.powerStatusSubject$.asObservable();
}

import { PslightHost } from 'pslight-core';
import { BehaviorSubject } from 'rxjs';

export class PslightWebHost implements PslightHost {
    readonly psPowerSubject$ = new BehaviorSubject<boolean>(false);
    private readonly psLedBehavior$ = new BehaviorSubject<string>('000000');

    readonly psPowerStatus$ = this.psPowerSubject$;
    readonly psLedStatus$ = this.psLedBehavior$;

    writeLedValues(values: Uint32Array): void {
        this.psLedBehavior$.next(Array.from(values).map(c => c.toString(16).padStart(6, '0')).join('-'));
    }
}

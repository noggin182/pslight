import { Observable } from 'rxjs';

export interface PslightHost {
    psPowerStatus$: Observable<boolean>;
    writeLedValues(values: Uint32Array): void;
}

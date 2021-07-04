import { Observable } from 'rxjs';
import { LedStrip } from './abstract-led-strip';
import { PsnClient } from './psn/client';

export interface PslightHost {
    readonly psPowerStatus$: Observable<boolean>;
    readonly psnClient: PsnClient;
    readonly ledStrip: LedStrip;
}

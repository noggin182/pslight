import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { PsnClient } from './client';

export class PresenceMonitor {
    constructor(private readonly psnClient: PsnClient) {

    }

    private readonly accounts: { [accountId: string]: Subject<boolean> } = {};
    private nextCheck: NodeJS.Timer | undefined;

    public enable(enable: boolean): void {
        if (enable && !this.nextCheck) {
            this.nextCheck = global.setTimeout(() => this.poll(), 1000);
        } else if (!enable) {

            for (const subject of Object.values(this.accounts)) {
                subject.next(false);
            }
            if (this.nextCheck) {
                global.clearTimeout(this.nextCheck);
                this.nextCheck = undefined;
            }
        }
    }

    public watch(accountId: string): Observable<boolean> {
        const subject = this.accounts[accountId] ??= new Subject<boolean>();
        return subject.pipe(distinctUntilChanged());
    }

    private async poll() {
        console.log('polling');
        const presences = await this.psnClient.getPresences(Object.keys(this.accounts));
        for (const [accountId, presence] of Object.entries(presences)) {
            this.accounts[accountId]?.next(presence);
        }
        this.nextCheck = global.setTimeout(() => this.poll(), 1000);
    }
}
import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { PsnClient } from './client';

export class PresenceMonitor {
    constructor(private readonly psnClient: PsnClient) {
    }

    private readonly accounts: { [accountId: string]: Subject<boolean> } = {};
    private currentPoller: { cancel: () => void } | undefined;

    public enable(enable: boolean): void {
        if (enable && !this.currentPoller) {
            this.currentPoller = this.startPolling();
        } else if (!enable && this.currentPoller) {
            this.currentPoller.cancel();
            this.currentPoller = undefined;
            for (const subject of Object.values(this.accounts)) {
                subject.next(false);
            }
        }
    }

    public watch(accountId: string): Observable<boolean> {
        const subject = this.accounts[accountId] ??= new Subject<boolean>();
        return subject.pipe(distinctUntilChanged());
    }

    private startPolling() {
        let active = true;
        const poll = async () => {
            while (active) {
                const presences = await this.psnClient.getPresences(Object.keys(this.accounts));
                if (active) {
                    for (const [accountId, presence] of Object.entries(presences)) {
                        this.accounts[accountId]?.next(presence);
                    }
                    await this.waitBeforeNextPoll();
                }
            }
        };
        poll();
        return {
            cancel: () => active = false
        };
    }

    private waitBeforeNextPoll() {
        const delay = 1000; // TODO: dial this back after a while to avoid 409s
        return new Promise(cb => setTimeout(cb, delay));
    }
}
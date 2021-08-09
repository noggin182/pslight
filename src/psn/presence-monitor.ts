import { Observable, Subject } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { Constants } from '../constants';
import { errorManager, ErrorStates } from '../error-manager';
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
            const start = Date.now();
            let fastPoll = true;

            while (active) {
                if (fastPoll && (Date.now() - start) > Constants.psn.fastPollDuration) {
                    fastPoll = false;
                }
                try {
                    const presences = await this.psnClient.getPresences(Object.keys(this.accounts));
                    errorManager.clear(ErrorStates.PsnPolling);
                    if (active) {
                        for (const [accountId, presence] of Object.entries(presences)) {
                            this.accounts[accountId]?.next(presence);
                            if (presence) {
                                fastPoll = false;
                            }
                        }
                        await this.delay(fastPoll ? Constants.psn.fastPoll : Constants.psn.slowPoll);
                    }
                } catch (err) {
                    errorManager.set(ErrorStates.PsnPolling);
                    if (err?.response?.status === 429) {
                        // We've been told off for hitting the PSN too frequent
                        // Tests show we should be ok again after 10 minutes, so just poll very slowly for now
                        await this.delay(Constants.psn.safePoll);
                    } else {
                        throw err;
                    }
                }
            }
        };
        poll();
        return {
            cancel: () => active = false
        };
    }

    private delay(delay: number) {
        return new Promise(cb => setTimeout(cb, delay));
    }
}
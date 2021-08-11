import axios from 'axios';
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
            while (active) {
                await this.delay(Constants.psn.pollInterval);
                try {
                    const presences = await this.psnClient.getPresences(Object.keys(this.accounts));
                    if (active) {
                        for (const [accountId, presence] of Object.entries(presences)) {
                            this.accounts[accountId]?.next(presence);
                        }
                        errorManager.clear(ErrorStates.PsnPolling);
                    }
                } catch (error) {
                    errorManager.set(ErrorStates.PsnPolling);
                    console.error(`PSN poll failed! [${new Date().toISOString().replace('T', ' ').substr(0, 19)}] ${error.message}`);
                    if (axios.isAxiosError(error)) {
                        console.error(`> ${error.request.method} ${error.request.path}`);
                        if (error.response) {
                            console.error(`< ${error.response?.status} ${error.response?.statusText}`);
                            console.error(error.response.data);
                        }
                        console.error();
                    }
                    await this.delay(Constants.psn.stallTime);
                }
            }
        };
        poll();
        return {
            cancel: () => {
                active = false;
                errorManager.clear(ErrorStates.PsnPolling);
            }
        };
    }

    private delay(delay: number) {
        return new Promise(cb => setTimeout(cb, delay));
    }
}
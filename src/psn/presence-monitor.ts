import axios from 'axios';
import { BehaviorSubject, distinctUntilChanged, Observable } from 'rxjs';
import { Constants } from '../constants';
import { errorManager, ErrorStates } from '../error-manager';
import { PsnClient } from './client';

export interface PresenceMonitor {
    readonly profiles: {
        readonly [onlineId: string]: {
            readonly online$: Observable<boolean>;
        }
    };
    readonly isMocked: boolean;
}

export class DefaultPresenceMonitor implements PresenceMonitor {
    constructor(
        private readonly psnClient: PsnClient,
        psPower$: Observable<boolean>,
        public readonly profiles: { readonly [onlineId: string]: { readonly online$: Observable<boolean> } },
        private readonly accountPresence$map: { readonly [accountId: string]: BehaviorSubject<boolean> }) {

        psPower$.pipe(distinctUntilChanged()).subscribe(power => {
            // could we replace the polling with RxJs interval+expand?
            this.enable(power);
        });
    }

    static async create(psPower$: Observable<boolean>): Promise<PresenceMonitor> {
        const psnClient = new PsnClient();
        const friendIdMap = await psnClient.getFriends();
        const prefered = process.env.PSLIGHT_FRIENDS;

        const friendAccounts: [onlineId: string, accountId: string][] = prefered
            ? prefered.split(',').map<[string, string]>(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
            : Object.entries(friendIdMap).slice(0, 4);

        const profiles = Object.fromEntries(friendAccounts.map(([onlineId]) => [onlineId, { online$: new BehaviorSubject(false) }]));
        const accountPresence$map = Object.fromEntries(friendAccounts.map(([onlineId, accountId]) => [accountId, profiles[onlineId].online$]));

        console.log('Monitoring profiles: ' + Object.keys(profiles).join(', '));
        return new DefaultPresenceMonitor(psnClient, psPower$, profiles, accountPresence$map);
    }

    readonly isMocked = false;

    private currentPoller: { cancel: () => void } | undefined;

    public enable(enable: boolean): void {
        if (enable && !this.currentPoller) {
            this.currentPoller = this.startPolling();
        } else if (!enable && this.currentPoller) {
            this.currentPoller.cancel();
            this.currentPoller = undefined;
            for (const account of Object.values(this.accountPresence$map)) {
                account.next(false);
            }
        }
    }

    private hasMessage(error: unknown): error is { message: unknown } {
        return !!error && ('message' in <Record<string, unknown>>error);
    }

    private startPolling() {
        let active = true;
        const poll = async () => {
            while (active) {
                await this.delay(Constants.psn.pollInterval);
                try {
                    const presences = await this.psnClient.getPresences(Object.keys(this.accountPresence$map));
                    if (active) {
                        for (const [accountId, presence] of Object.entries(presences)) {
                            this.accountPresence$map[accountId]?.next(presence);
                        }
                        errorManager.clear(ErrorStates.PsnPolling);
                    }
                } catch (error: unknown) {
                    errorManager.set(ErrorStates.PsnPolling);
                    console.error(`PSN poll failed! [${new Date().toISOString().replace('T', ' ').substring(0, 19)}] ${this.hasMessage(error) ? error.message : error}`);
                    if (axios.isAxiosError(error) && error.request.method) {
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
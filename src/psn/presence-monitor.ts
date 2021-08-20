import axios from 'axios';
import { BehaviorSubject, Observable } from 'rxjs';
import { Constants } from '../constants';
import { errorManager, ErrorStates } from '../error-manager';
import { PsnClient } from './client';

export interface PresenceMonitor {
    enable(enable: boolean): void;
    readonly profilePresence$map: { readonly [onlineId: string]: Observable<boolean> }
    readonly isMocked: boolean;
}

export class DefaultPresenceMonitor implements PresenceMonitor {
    constructor(
        private readonly psnClient: PsnClient,
        public readonly profilePresence$map: { readonly [onlineId: string]: BehaviorSubject<boolean> },
        private readonly accountPresence$map: { readonly [accountId: string]: BehaviorSubject<boolean> }) {
    }

    static async create(): Promise<PresenceMonitor> {
        const psnClient = new PsnClient();
        const friendIdMap = await psnClient.getFriends();
        const prefered = process.env.PSLIGHT_FRIENDS;

        const friendAccounts: [onlineId: string, accountId: string][] = prefered
            ? prefered.split(',').map<[string, string]>(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
            : Object.entries(friendIdMap).slice(0, 4);

        const profilePresence$map = Object.fromEntries(friendAccounts.map(([onlineId]) => [onlineId, new BehaviorSubject(false)]));
        const accountPresence$map = Object.fromEntries(friendAccounts.map(([onlineId, accountId]) => [accountId, profilePresence$map[onlineId]]));

        console.log('Monitoring profiles: ' + Object.keys(profilePresence$map).join(', '));
        return new DefaultPresenceMonitor(psnClient, profilePresence$map, accountPresence$map);
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
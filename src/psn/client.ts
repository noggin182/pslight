import axios from 'axios';
import { readFileSync } from 'fs';
import queryString from 'querystring';
import { Constants } from '../constants';
import { PsnBasicPresences, PsnFriends, Token } from './models';

export class PsnClient {
    constructor() {
        try {
            const data = readFileSync(`${__dirname}/../../psn.json`);
            this.npsso = JSON.parse(data.toString()).npsso;
        } catch (e) {
            throw new Error('Error reading NPSSO from psn.json');
        }

        if (!this.npsso) {
            throw new Error('Invalid NPSSO');
        }
    }

    private readonly npsso: string;
    private token: Token | undefined;

    private async getNewToken(data: { [key: string]: string }) {
        this.token = (await axios.post<Token>('https://ca.account.sony.com/api/authz/v3/oauth/token', queryString.stringify(data), {
            headers: {
                Authorization: `Basic ${Constants.psn.clientAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })).data;

        if (!this.token?.access_token || !this.token?.refresh_token) {
            throw new Error('Failed to get a new token');
        }

        const adjustExpirary = (expirary: number) =>
            expirary * 1000 + Date.now() - Constants.psn.tokenGrace;

        this.token.expires_in = adjustExpirary(this.token.expires_in);
        this.token.refresh_token_expires_in = adjustExpirary(
            this.token.refresh_token_expires_in
        );
    }

    private async get<T>(
        path: string,
        queryParams?: { [key: string]: string | string[] }
    ) {
        if (!this.token || this.token.refresh_token_expires_in <= Date.now()) {
            let code: string | undefined = undefined;
            await axios.get(Constants.psn.npssoExchange, {
                headers: {
                    Cookie: `npsso=${this.npsso}`,
                },
                maxRedirects: 0,
            }).catch((e) => {
                if (e.response?.status === 302) {
                    code = e.response.headers.location.match(
                        /code=([A-Za-z0-9:?\-./-]+)/
                    )?.[1];
                } else {
                    throw e;
                }
            });

            if (!code) {
                throw new Error('Could not get code from npsso');
            }

            await this.getNewToken({
                smcid: 'psapp%3Asettings-entrance',
                access_type: 'offline',
                code: code,
                service_logo: 'ps',
                ui: 'pr',
                elements_visibility: 'no_aclink',
                redirect_uri: 'com.playstation.PlayStationApp://redirect',
                support_scheme: 'sneiprls',
                grant_type: 'authorization_code',
                darkmode: 'true',
                token_format: 'jwt',
                device_profile: 'mobile',
                app_context: 'inapp_ios',
                extraQueryParams: '{ PlatformPrivacyWs1 = minimal; }',
            });
        } else if (this.token.expires_in <= Date.now()) {
            await this.getNewToken({
                grant_type: 'refresh_token',
                token_format: 'jtw',
                refresh_token: this.token.refresh_token,
                scope: 'psn:mobile.v1 psn:clientapp',
            });
        }

        if (queryParams) {
            path +=
                '?' +
                Object.entries(queryParams)
                    .map(([name, value]) => `${name}=${value}`)
                    .join('&');
        }

        const response = await axios.get<T>(`${Constants.psn.api}${path}`, {
            headers: {
                Authorization: `Bearer ${this.token?.access_token}`,
            },
        });
        return response.data;
    }

    async getFriends(): Promise<{ [onlineId: string]: string }> {
        try {
            const accountIds = (
                await this.get<PsnFriends>('users/me/friends')
            ).friends;
            const friends = (
                await this.get<{ profiles: { onlineId: string }[] }>(
                    'users/profiles',
                    { accountIds }
                )
            ).profiles;
            return Object.fromEntries(
                accountIds.map((id, index) => [friends[index].onlineId, id])
            );
        } catch (error) {
            console.error(`Get PSN friends failed! [${new Date().toISOString().replace('T', ' ').substr(0, 19)}] ${error.message}`);
            if (axios.isAxiosError(error) && error.request.method) {
                console.error(`> ${error.request.method} ${error.request.path}`);
                if (error.response) {
                    console.error(`< ${error.response?.status} ${error.response?.statusText}`);
                    console.error(error.response.data);
                }
                console.error();
            }
            throw error;
        }
    }

    async getPresences(accountIds: string[]): Promise<{ [accountId: string]: boolean; }> {
        const presences = await this.get<PsnBasicPresences>('users/basicPresences', {
            type: 'primary',
            accountIds,
        });
        return Object.fromEntries(
            presences.basicPresences.map(p => [
                p.accountId,
                p.primaryPlatformInfo?.onlineStatus === 'online',
            ])
        );
    }
}

import axios from 'axios';
import queryString from 'querystring';
import { PsnBasicPresences, PsnFriends, Token } from './models';

const CLIENT_AUTHORIZATION = 'YWM4ZDE2MWEtZDk2Ni00NzI4LWIwZWEtZmZlYzIyZjY5ZWRjOkRFaXhFcVhYQ2RYZHdqMHY=';
const TOKEN_GRACE = 60_000; // reduce the lifetime of all tokens by one minute
const PSN_API = 'https://m.np.playstation.net/api/userProfile/v1/internal/';

const EXCHANGE_NPSSO = 'https://ca.account.sony.com/api/authz/v3/oauth/authorize?' +
    queryString.encode({
        access_type: 'offline',
        client_id: 'ac8d161a-d966-4728-b0ea-ffec22f69edc',
        redirect_uri: 'com.playstation.PlayStationApp://redirect',
        response_type: 'code',
        scope: 'psn:mobile.v1 psn:clientapp',
    });


export class PsnClient {
    constructor(private readonly npsso: string) {
    }

    private token: Token | undefined = undefined;

    private async getNewToken(data: { [key: string]: string }) {
        this.token = (await axios.post<Token>('https://ca.account.sony.com/api/authz/v3/oauth/token', queryString.stringify(data), {
            headers: {
                Authorization: `Basic ${CLIENT_AUTHORIZATION}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        })).data;

        if (!this.token?.access_token || !this.token?.refresh_token) {
            throw new Error('Failed to get a new token');
        }

        const adjustExpirary = (expirary: number) =>
            expirary * 1000 + Date.now() - TOKEN_GRACE;

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
            await axios.get(EXCHANGE_NPSSO, {
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

        const response = await axios.get<T>(`${PSN_API}${path}`, {
            headers: {
                Authorization: `Bearer ${this.token?.access_token}`,
            },
        });
        return response.data;
    }

    async getFriends(): Promise<{ [accountId: string]: string }> {
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
            accountIds.map((id, index) => [id, friends[index].onlineId])
        );
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

import queryString from 'querystring';

export const Constants = {
    port: 8085,
    numberOfLeds: 108,

    colors: {
        standby: 0x402000,
        powerOn: 0xFFFFFF,
        players: [
            0x1565C0,
            0x2E7D32,
            0x4527A0,
            0xD84315
        ]
    },
    gammaCorrection: 1.5,
    transitionDuration: 1000,

    psn: {
        clientAuth: 'YWM4ZDE2MWEtZDk2Ni00NzI4LWIwZWEtZmZlYzIyZjY5ZWRjOkRFaXhFcVhYQ2RYZHdqMHY=',
        tokenGrace: 60_000, // reduce the lifetime of all tokens by one minute
        api: 'https://m.np.playstation.net/api/userProfile/v1/internal/',

        npssoExchange: 'https://ca.account.sony.com/api/authz/v3/oauth/authorize?' +
            queryString.encode({
                access_type: 'offline',
                client_id: 'ac8d161a-d966-4728-b0ea-ffec22f69edc',
                redirect_uri: 'com.playstation.PlayStationApp://redirect',
                response_type: 'code',
                scope: 'psn:mobile.v1 psn:clientapp',
            }),
        slowPoll: 5000,
        fastPoll: 1000
    }
} as const;

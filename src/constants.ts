import queryString from 'querystring';

const PSN_LIMIT_COUNT = 150;
const PSN_LIMIT_TIMEFRAME = 900_000;

export const Constants = {
    port: 8085,
    numberOfLeds: 108,
    skipLeds: 1,

    ledGpio: 12,
    powerGpio: 25,

    colors: {
        standby: 0x402000,
        powerOn: 0xA0A0A0,
        players: [
            0x4070ff,
            0x40ff70,
            0xff40ff,
            0xD84315
        ]
    },
    transitionDuration: 2000,

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
        pollInterval: PSN_LIMIT_TIMEFRAME / PSN_LIMIT_COUNT,
        stallTime: 30_000
    }
} as const;

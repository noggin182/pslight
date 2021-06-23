export interface Token {
    access_token: string;
    expires_in: number;
    id_token: string;
    refresh_token: string;
    refresh_token_expires_in: number;
    scope: string;
    token_type: string;
}

export interface PsnFriends {
    friends: string[]
}

export interface PsnBasicPresences {
    basicPresences: PsnBasicPresenceInfo[]
}

export interface PsnBasicPresence {
    basicPresence: PsnBasicPresenceInfo
}

export interface PsnBasicPresenceInfo {
    accountId: string,
    availability: string,
    lastAvailableDate: string,
    primaryPlatformInfo: {
        onlineStatus: string,
        platform: string,
        lastOnlineDate: string
    },
    gameTitleInfoList?: {
        npTitleId: string,
        titleName: string,
        format: string,
        launchPlatform: string
    }[]
}

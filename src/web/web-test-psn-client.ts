import { PsnClient } from 'pslight-core/psn/client';

export class WebTestPsnClient implements PsnClient {
    private readonly onlinePlayers: { [accountId: string]: boolean } = {
        Player1: false,
        Player2: false,
        Player3: false,
        Player4: false

    };

    getFriends(): Promise<{ [onlineId: string]: string; }> {
        return Promise.resolve({
            Player1: 'Player1',
            Player2: 'Player2',
            Player3: 'Player3',
            Player4: 'Player4',
        });
    }

    getPresences(accountIds: string[]): Promise<{ [accountId: string]: boolean; }> {
        return Promise.resolve(Object.fromEntries(accountIds.map(id => [id, this.onlinePlayers[id] ?? false])));
    }

    setPlayerOnline(number: number, online: boolean): void {
        this.onlinePlayers[`Player${number}`] = online;
    }

    getPlayerOnline(number: number): boolean {
        return this.onlinePlayers[`Player${number}`];
    }
}
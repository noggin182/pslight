import { PsnClient, PsnClientFactory } from './psn/client';

PsnClientFactory.create = () => new MockPsnClient;

export class MockPsnClient implements PsnClient {
    private readonly onlineAccounts: { [accountId: string]: boolean } = {
        1: false,
        2: false,
        3: false,
        4: false

    };

    getFriends(): Promise<{ [onlineId: string]: string; }> {
        return Promise.resolve({
            Player1: '1',
            Player2: '2',
            Player3: '3',
            Player4: '4',
        });
    }

    getPresences(accountIds: string[]): Promise<{ [accountId: string]: boolean; }> {
        return Promise.resolve(Object.fromEntries(accountIds.map(id => [id, this.onlineAccounts[id] ?? false])));
    }

    setPresence(accountId: string, online: boolean): void {
        this.onlineAccounts[accountId] = online;
    }
}
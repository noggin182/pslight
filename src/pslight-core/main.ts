import dotenv from 'dotenv';
import { PslightConfig } from './config';
import { PslightHost } from './host';
import { LightStrip, LightStripSpan } from './light-strip';
import { PsnClient } from './psn/client';

const DEFAULT_COLORS = [0x1565C0, 0x2E7D32, 0x4527A0, 0xD84315];

export class Pslight {
    private readonly strip: LightStrip = new LightStrip(this.host, this.config);
    private readonly friends = new Map<string, {
        onlineId: string;
        strip: LightStripSpan;
    }>();

    static async run(host: PslightHost, config: PslightConfig): Promise<void> {
        (new this(host, config)).run();
    }

    private constructor(readonly host: PslightHost, readonly config: PslightConfig) {
        dotenv.config();
        this.psnClient = new PsnClient();
    }

    private readonly psnClient: PsnClient;

    private async run(): Promise<void> {
        const friendIdMap = await this.psnClient.getFriends();

        const prefered = process.env.PSLIGHT_FRIENDS;
        const friendAccounts = prefered
            ? prefered.split(',').map(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
            : Object.entries(friendIdMap).slice(0, 4);

        for (const [accountId, onlineId] of friendAccounts) {
            this.friends.set(accountId, {
                onlineId,
                strip: this.strip.addSpan(Pslight.getColor(onlineId), 2)
            });
        }

        const powerOnSpan = this.strip.addSpan(0xFFFFFF, 1);
        this.strip.addSpan(0x402000, 0).enable(true);

        this.host.psPowerStatus$.subscribe(power => {
            powerOnSpan.enable(power);

            if (power) {
                const friends = [...this.friends.values()];

                setTimeout(() => friends[0].strip.enable(true), 5000);
                setTimeout(() => friends[2].strip.enable(true), 10000);
                setTimeout(() => friends[1].strip.enable(true), 15000);
            }
            // TODO : start/stop psn timer

        });
    }

    private static getColor(onlineId: string) {
        const preference = process.env[`PSLIGHT_COLOR_${onlineId}`];
        if (typeof preference === 'string' && /^[\da-f]{6}$/i.test(preference)) {
            return parseInt(preference, 16);
        }
        const color = DEFAULT_COLORS.shift() ?? 0;
        DEFAULT_COLORS.push(color);
        return color;
    }
}
import { PslightHost } from './host';
import { PresenceMonitor } from './psn/presence-monitor';

const DEFAULT_COLORS = [0x1565C0, 0x2E7D32, 0x4527A0, 0xD84315];

function getColor(onlineId: string) {
    const preference = process.env[`PSLIGHT_COLOR_${onlineId}`];
    if (typeof preference === 'string' && /^[\da-f]{6}$/i.test(preference)) {
        return parseInt(preference, 16);
    }
    const color = DEFAULT_COLORS.shift() ?? 0;
    DEFAULT_COLORS.push(color);
    return color;
}

export async function startPsLightApp(host: PslightHost): Promise<void> {
    const friendIdMap = await host.psnClient.getFriends();

    const prefered = process.env.PSLIGHT_FRIENDS;

    const friendAccounts = prefered
        ? prefered.split(',').map(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
        : Object.entries(friendIdMap).slice(0, 4);

    const monitor = new PresenceMonitor(host.psnClient);
    for (const [onlineId, accountId] of friendAccounts) {
        const span = host.ledStrip.addSpan(getColor(onlineId), 2);
        monitor.watch(accountId).subscribe(online => span.enable(online));
    }

    const powerOnSpan = host.ledStrip.addSpan(0xFFFFFF, 1);
    host.ledStrip.addSpan(0x402000, 0).enable(true);

    host.psPowerStatus$.subscribe(power => {
        powerOnSpan.enable(power);
        monitor.enable(power);
    });

    process.on('SIGINT', () => {
        // turn off the leds and then exit the process
        host.ledStrip.shutdown().then(() => process.exit(0));
    });
}

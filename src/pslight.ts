import readline from 'readline';
import { getPlayerColor } from './colors';
import { LedManager } from './led-manager';
import { PsPowerMonitor } from './ps-power-monitor';
import { PsnClientFactory } from './psn/client';
import { PresenceMonitor } from './psn/presence-monitor';
import { attachWs281x } from './rpi/led-strip';
import { startWebServer } from './web-server';

const main = async () => {
    const ledManager = new LedManager(108);
    await attachWs281x(ledManager);

    const psnClient = PsnClientFactory.create();
    const friendIdMap = await psnClient.getFriends();
    const prefered = process.env.PSLIGHT_FRIENDS;

    const friendAccounts = prefered
        ? prefered.split(',').map(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
        : Object.entries(friendIdMap).slice(0, 4);

    const monitor = new PresenceMonitor(psnClient);
    for (const [onlineId, accountId] of friendAccounts) {
        const span = ledManager.addSpan(getPlayerColor(onlineId), 2);
        monitor.watch(accountId).subscribe(online => span.enable(online));
    }

    const powerOnSpan = ledManager.addSpan(0xFFFFFF, 1);
    ledManager.addSpan(0x402000, 0).enable(true);

    const psPowerMonitor = new PsPowerMonitor();

    psPowerMonitor.powerStatus$.subscribe(power => {
        powerOnSpan.enable(power);
        monitor.enable(power);
    });

    process.on('SIGINT', () => {
        // turn off the leds and then exit the process
        ledManager.shutdown().then(() => process.exit(0));
    });

    if (process.platform === 'win32') {
        readline.createInterface({ input: process.stdin, output: process.stdout })
            .on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
    }

    startWebServer(8085, ledManager, psnClient, psPowerMonitor);
};

main();
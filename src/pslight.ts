import dotenv from 'dotenv';
import { Gpio } from 'onoff';
import readline from 'readline';
import { distinctUntilChanged } from 'rxjs';
import { Constants } from './constants';
import { LedManager } from './led-manager';
import { PsPowerMonitor } from './ps-power-monitor';
import { PsnClientFactory } from './psn/client';
import { PresenceMonitor } from './psn/presence-monitor';
import { attachWs281x } from './rpi/led-strip';
import { fromNumber, getPlayerColor } from './utils/color';
import { startWebServer } from './web-server';

const main = async () => {
    dotenv.config();
    let powerGpio: Gpio | undefined = undefined;
    const ledManager = new LedManager(Constants.numberOfLeds);

    if (Gpio.accessible) {
        await attachWs281x(ledManager);
        powerGpio = new Gpio(Constants.powerGpio, 'in', 'both');
    }

    const psnClient = PsnClientFactory.create();
    const friendIdMap = await psnClient.getFriends();
    const prefered = process.env.PSLIGHT_FRIENDS;

    const friendAccounts = prefered
        ? prefered.split(',').map(onlineId => [onlineId, friendIdMap[onlineId]]).filter(kvp => kvp[1])
        : Object.entries(friendIdMap).slice(0, 4);

    console.log('Monitoring for friends: ' + friendAccounts.map(f => f[0]).join(', '));
    const monitor = new PresenceMonitor(psnClient);
    for (const [onlineId, accountId] of friendAccounts) {
        const span = ledManager.addSpan(getPlayerColor(onlineId), 2);
        monitor.watch(accountId).subscribe(online => span.enable(online));
    }

    const powerOnSpan = ledManager.addSpan(fromNumber(Constants.colors.powerOn), 1);
    ledManager.addSpan(fromNumber(Constants.colors.standby), 0).enable(true);

    const psPowerMonitor = new PsPowerMonitor(powerGpio);

    psPowerMonitor.powerStatus$.pipe(distinctUntilChanged()).subscribe(power => {
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

    startWebServer(Constants.port, ledManager, psnClient, psPowerMonitor);
};

main();

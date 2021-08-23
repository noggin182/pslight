import dotenv from 'dotenv';
import { Gpio } from 'onoff';
import { argv } from 'process';
import readline from 'readline';
import { of } from 'rxjs';
import { Constants } from './constants';
import { LedManager } from './led-manager';
import { PsPowerMonitor } from './ps-power-monitor';
import { DefaultPresenceMonitor } from './psn/presence-monitor';
import { MockedPresenceMonitor } from './psn/presence-monitor.mocked';
import { attachWs281x } from './rpi/led-strip';
import { fromNumber, getPlayerColor } from './utils/color';
import { onlyIf } from './utils/utils';
import { WebServer } from './web-server';

const main = async () => {
    dotenv.config();

    let mockedPresences = false;
    if (argv[2]) {
        if (argv[2] === '-mocked-presences') {
            mockedPresences = true;
        } else {
            console.error('Unknown argument:', argv[2]);
            process.exit(1);
        }
    }

    let powerGpio: Gpio | undefined = undefined;
    const ledManager = new LedManager(Constants.numberOfLeds);

    if (Gpio.accessible) {
        await attachWs281x(ledManager);
        powerGpio = new Gpio(Constants.powerGpio, 'in', 'both');
    }

    const psPowerMonitor = new PsPowerMonitor(powerGpio);

    const monitor = mockedPresences ? new MockedPresenceMonitor() : await DefaultPresenceMonitor.create(psPowerMonitor);
    for (const [onlineId, profile] of Object.entries(monitor.profiles)) {
        ledManager.addSpan(
            getPlayerColor(onlineId),
            2,
            profile.online$.pipe(onlyIf(psPowerMonitor.powerStatus$)));
    }

    ledManager.addSpan(fromNumber(Constants.colors.powerOn), 1, psPowerMonitor.powerStatus$);
    ledManager.addSpan(fromNumber(Constants.colors.standby), 0, of(true));

    process.on('SIGINT', () => {
        // turn off the leds and then exit the process
        ledManager.shutdown().then(() => process.exit(0));
    });

    if (process.platform === 'win32') {
        readline.createInterface({ input: process.stdin, output: process.stdout })
            .on('SIGINT', () => process.emit('SIGINT', 'SIGINT'));
    }

    new WebServer(Constants.port, ledManager, monitor, psPowerMonitor);
};

main();

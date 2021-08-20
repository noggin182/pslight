import dotenv from 'dotenv';
import { Gpio } from 'onoff';
import { argv } from 'process';
import readline from 'readline';
import { distinctUntilChanged, withLatestFrom } from 'rxjs';
import { Constants } from './constants';
import { LedManager } from './led-manager';
import { PsPowerMonitor } from './ps-power-monitor';
import { DefaultPresenceMonitor } from './psn/presence-monitor';
import { MockedPresenceMonitor } from './psn/presence-monitor.mocked';
import { attachWs281x } from './rpi/led-strip';
import { fromNumber, getPlayerColor } from './utils/color';
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

    const monitor = mockedPresences ? new MockedPresenceMonitor() : await DefaultPresenceMonitor.create();
    for (const [onlineId, subject$] of Object.entries(monitor.profilePresence$map)) {
        const span = ledManager.addSpan(getPlayerColor(onlineId), 2);
        subject$
            .pipe(withLatestFrom(psPowerMonitor.powerStatus$))
            .subscribe(([profileOnline, psOnline]) => span.enable(profileOnline && psOnline));
    }

    const powerOnSpan = ledManager.addSpan(fromNumber(Constants.colors.powerOn), 1);
    ledManager.addSpan(fromNumber(Constants.colors.standby), 0).enable(true);

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

    new WebServer(Constants.port, ledManager, monitor, psPowerMonitor);
};

main();

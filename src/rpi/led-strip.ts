import { Constants } from '../constants';
import { LedManager } from '../led-manager';
import { toNumber } from '../utils/color';

export async function attachWs281x(ledManager: LedManager): Promise<void> {
    const ws281xModule = 'rpi-ws281x'; // keep the module name in a variable to prevent intellisense errors when the optional module is not installed
    const { default: ws281x } = await import(ws281xModule);
    const skip = new Array(Constants.skipLeds).fill(0);

    ws281x.configure({
        leds: ledManager.length + skip.length,
        gpio: Constants.ledGpio,
        stripType: 'grb'
    });

    ledManager.ledValues$.subscribe(leds => ws281x.render(new Uint32Array(skip.concat(leds.map(toNumber)))));
}

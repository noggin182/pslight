import isRpi from 'detect-rpi';
import { LedManager } from '../led-manager';

export async function attachWs281x(ledManager: LedManager): Promise<void> {
    if (isRpi()) {
        const ws281xModule = 'rpi-ws281x'; // keep the module name in a variable to prevent intellisense errors when the optional module is not installed
        const { default: ws281x } = await import(ws281xModule);
        ws281x.configure({
            leds: ledManager.length,
            stripType: 'grb'
        });

        ledManager.ledValues$.subscribe(leds => ws281x.render(new Uint32Array(leds)));
    }
}

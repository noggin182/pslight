import { AbstractLedStrip } from 'pslight-core/abstract-led-strip';

export class WebLedStrip extends AbstractLedStrip {
    constructor(length: number, private readonly callback: (leds: number[]) => void) {
        super(length);
    }

    writeLedValues(leds: number[]): void {
        this.callback(leds);
    }
}

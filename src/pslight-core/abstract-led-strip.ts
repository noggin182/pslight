import { ActiveSpansSnapshot, DefaultLedStripAnimator, LedStripAnimator } from './led-strip-animator';

export interface LedSpan {
    enable(enabled: boolean): void;
}

export interface LedStrip {
    addSpan(color: number, group: number): LedSpan;
    shutdown(): Promise<void>;
}

export abstract class AbstractLedStrip {
    constructor(private readonly length: number) {
        process.on('uncaughtException', (error) => {
            // We are likely running headless, so if there is an error try and indicate this using the led strip
            try {
                const values = new Array(length).fill(0);
                values[0] = 0xFF0000;
                values[values.length - 1] = 0xFF0000;
                this.writeLedValues(values);
                this.writeLedValues = () => { /* ignore any future updates to the leds */ };
            } catch (e) {
                // If we can't show an error using the led strip, then there isn't much we can do
            }
        });
    }

    abstract writeLedValues(leds: number[]): void;

    private animator: LedStripAnimator = new DefaultLedStripAnimator(this.length, (leds) => this.writeLedValues(leds));

    private readonly spans: {
        color: number;
        group: number;
        active: boolean;
    }[] = [];


    addSpan(color: number, group: number): LedSpan {
        const index = this.spans.length;
        this.spans.push({
            color,
            group,
            active: false
        });
        return {
            enable: (enabled) => this.setSpanState(index, enabled)
        };
    }

    private setSpanState(index: number, enabled: boolean) {
        const span = this.spans[index];
        if (span.active !== enabled) {
            const oldSnapshot = this.createSnapshot();
            span.active = enabled;
            this.animator.transition(oldSnapshot, this.createSnapshot());
        }
    }

    private createSnapshot(): ActiveSpansSnapshot {
        const activeSpans = this.spans.filter(s => s.active);
        const maxGroup = Math.max(...activeSpans.map(s => s.group));
        const effectiveColors = activeSpans.filter(s => s.group === maxGroup).map(s => s.color);
        return {
            group: maxGroup,
            colors: effectiveColors.length ? effectiveColors : [0]
        };
    }

    async shutdown(): Promise<void> {
        this.setSpanState = () => { /* ignore any changes to spans from now on */ };
        await this.animator.transition(this.createSnapshot(), { group: -Infinity, colors: [0] });
    }
}

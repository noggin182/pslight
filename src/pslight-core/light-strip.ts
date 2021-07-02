import { PslightConfig } from './config';
import { PslightHost } from './host';
import { ActiveSpansSnapshot, DefaultLightStripAnimator, LightStripAnimator } from './light-strip-animator';

export interface LightStripSpan {
    enable(enabled: boolean): void;
}

export class LightStrip {
    constructor(private readonly host: PslightHost, public readonly config: PslightConfig) {
        host.writeLedValues(new Uint32Array(config.numberOfLeds));

        process.on('uncaughtException', () => {
            // We are likely running headless, so if there is an error try and indicate this using the light strip
            try {
                const values = new Uint32Array(config.numberOfLeds);
                values[0] = 0xFF0000;
                values[values.length - 1] = 0xFF0000;
                host.writeLedValues(values);
            } catch (e) {
                // If we can't show an error using the light strip, then there isn't much we can do
            }

        });
    }

    private animator: LightStripAnimator = new DefaultLightStripAnimator(this.host, this.config);

    private readonly spans: {
        color: number;
        group: number;
        active: boolean;
    }[] = [];


    addSpan(color: number, group: number): LightStripSpan {
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
}
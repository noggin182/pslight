import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { errorManager } from './error-manager';
import { ActiveSpansSnapshot, DefaultLedStripAnimator, LedStripAnimator } from './led-strip-animator';
import { Color, Colors } from './utils/color';
import { WritableSubject } from './utils/writable-subject';

export interface LedSpan {
    enable(enabled: boolean): void;
}

export const enum Brightness {
    Off,
    Dim,
    Bright
}

export class LedManager {
    constructor(public readonly length: number) {
        // When we have an error, pulse the ends of the LED strip red
        const errorSpans = [
            this.addSpan(Colors.RED, Infinity),
            this.addSpan(Colors.BLACK, Infinity),
            this.addSpan(Colors.BLACK, Infinity),
            this.addSpan(Colors.BLACK, Infinity),
            this.addSpan(Colors.RED, Infinity)
        ];

        let errorDisplayTimeout: NodeJS.Timeout | undefined;

        errorManager.hasAny$.pipe(distinctUntilChanged()).subscribe(hasErrors => {
            if (hasErrors) {
                errorSpans.forEach(es => es.enable(hasErrors));
                let pulsed = true;
                errorDisplayTimeout = setInterval(() => {
                    pulsed = !pulsed;
                    errorSpans.forEach(es => es.enable(pulsed));
                }, 1000);
            } else {
                if (errorDisplayTimeout) {
                    global.clearInterval(errorDisplayTimeout);
                }
                errorSpans.forEach(es => es.enable(false));
            }
        });

        process.on('uncaughtException', () => {
            // We are likely running headless, so if there is an error try and indicate this using the led strip
            try {
                const values: Color[] = new Array(length).fill(Colors.BLACK);
                values[0] = Colors.RED;
                values[values.length - 1] = Colors.RED;
                this.ledValues$.next(values);
            } catch (e) {
                // If we can't show an error using the led strip, then there isn't much we can do
            }
        });
    }

    ledValues$ = new BehaviorSubject<Color[]>(new Array(this.length).fill(Colors.BLACK));
    brightness$ = new WritableSubject<Brightness>(Brightness.Bright);

    private animator: LedStripAnimator = new DefaultLedStripAnimator(this.length, (leds) => this.ledValues$.next(leds));

    private readonly spans: {
        color: Color;
        group: number;
        active: boolean;
    }[] = [];

    addSpan(color: Color, group: number): LedSpan {
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
            colors: effectiveColors.length ? effectiveColors : [Colors.BLACK]
        };
    }

    async shutdown(): Promise<void> {
        this.setSpanState = () => { /* ignore any changes to spans from now on */ };
        await this.animator.transition(this.createSnapshot(), { group: -Infinity, colors: [Colors.BLACK] });
    }

    setBrightness = (brightness: Brightness): void => {
        // todo
    }
}

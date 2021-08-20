import { BehaviorSubject, distinctUntilChanged, interval, map, Observable, of, switchMap, withLatestFrom } from 'rxjs';
import { errorManager } from './error-manager';
import { ActiveSpansSnapshot, DefaultLedStripAnimator, LedStripAnimator } from './led-strip-animator';
import { Color, Colors } from './utils/color';
import { WritableSubject } from './utils/writable-subject';

export const enum Brightness {
    Off,
    Dim,
    Bright
}

export class LedManager {
    constructor(public readonly length: number) {
        // When we have an error, pulse the ends of the LED strip red
        const errorLights$ = errorManager.hasAny$
            .pipe(
                distinctUntilChanged(),
                switchMap(hasErrors => hasErrors ? interval(1000).pipe(map(v => v % 2 == 0)) : of(false)),
            );

        this.addSpan(Colors.RED, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.RED, Infinity, errorLights$);
    }

    ledValues$ = new BehaviorSubject<Color[]>(new Array(this.length).fill(Colors.BLACK));
    brightness$ = new WritableSubject<Brightness>(Brightness.Bright);

    private animator: LedStripAnimator = new DefaultLedStripAnimator(this.length, (leds) => this.ledValues$.next(leds));

    private readonly spans: {
        color: Color;
        group: number;
        active: boolean;
    }[] = [];

    addSpan(color: Color, group: number, source$: Observable<boolean>): void {
        const index = this.spans.length;
        this.spans.push({
            color,
            group,
            active: false
        });
        // TODO: respect dim/bright
        source$
            .pipe(withLatestFrom(this.brightness$))
            .subscribe(([enabled, brightness]) => this.setSpanState(index, enabled && brightness !== Brightness.Off));

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
}

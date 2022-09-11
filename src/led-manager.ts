import { BehaviorSubject, distinctUntilChanged, interval, map, Observable, of, share, skip, switchMap } from 'rxjs';
import { errorManager } from './error-manager';
import { ActiveSpansSnapshot, DefaultLedStripAnimator, LedStripAnimator } from './led-strip-animator';
import { Color, Colors, mapComponent } from './utils/color';
import { WritableSubject } from './utils/writable-subject';

export class LedManager {
    constructor(public readonly length: number) {
        // When we have an error, pulse the ends of the LED strip red
        const errorPulse = interval(1000).pipe(map(v => v % 2 == 0), share());
        const errorLights$ = errorManager.hasAny$
            .pipe(
                distinctUntilChanged(),
                switchMap(hasErrors => hasErrors ? errorPulse : of(false)),
            );

        this.addSpan(Colors.RED, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.BLACK, Infinity, errorLights$);
        this.addSpan(Colors.RED, Infinity, errorLights$);

        this.brightness$.pipe(skip(1)).subscribe(() => this.animate());
    }

    ledValues$ = new BehaviorSubject<Color[]>(new Array(this.length).fill(Colors.BLACK));
    brightness$ = new WritableSubject<number>(1);

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
        source$.subscribe(enabled => this.setSpanState(index, enabled));
    }

    private currentSnapshot: ActiveSpansSnapshot = { group: -Infinity, colors: [Colors.BLACK] };

    private setSpanState(index: number, enabled: boolean) {
        const span = this.spans[index];
        if (span.active !== enabled) {
            span.active = enabled;
            this.animate();
        }
    }

    private animate() {
        const oldSnapshot = this.currentSnapshot;
        const activeSpans = this.spans.filter(s => s.active);
        const maxGroup = Math.max(...activeSpans.map(s => s.group));
        const effectiveColors = activeSpans.filter(s => s.group === maxGroup).map(s => this.adjustColor(s.color));
        this.currentSnapshot = {
            group: maxGroup,
            colors: effectiveColors.length ? effectiveColors : [Colors.BLACK]
        };
        this.animator.transition(oldSnapshot, this.currentSnapshot);
    }

    private adjustColor(color: Color): Color {
        const v = Math.min(1, Math.max(0, this.brightness$.value));
        return mapComponent(color, c => c * v);
    }

    async shutdown(): Promise<void> {
        this.setSpanState = () => { /* ignore any changes to spans from now on */ };
        await this.animator.transition(this.currentSnapshot, { group: -Infinity, colors: [Colors.BLACK] });
    }
}

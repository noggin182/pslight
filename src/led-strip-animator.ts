import { performance } from 'perf_hooks';
import { Constants } from './constants';
import { Color, Colors, mapComponent } from './utils/color';

const ELLIPSES = 0.0002;

export interface ActiveSpansSnapshot {
    group: number;
    colors: Color[];
}

export interface LedStripAnimator {
    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): Promise<void>;
}

export class DefaultLedStripAnimator implements LedStripAnimator {
    constructor(private readonly length: number, private readonly write: (colors: Color[]) => void) {
    }

    private currentValues: Color[] = new Array(this.length).fill(Colors.BLACK);

    private currentTransition: { resolve: () => void, timer: NodeJS.Timer } | null = null;

    private send() {
        this.write(this.currentValues);
    }

    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): Promise<void> {
        if (this.currentTransition) {
            this.currentTransition.resolve();
            global.clearInterval(this.currentTransition.timer);
        }

        const duration = to.group === Infinity || from.group === Infinity ? 250 : Constants.transitionDuration;

        return new Promise(resolve => {
            const previous = [...this.currentValues];

            const next = this.spreadColors(to.colors);

            const backwards = to.group < from.group
                || (to.group === from.group && to.colors.length == 2);

            const fillSpot = (this.length - 1) / 2;
            const distanceFromFill = next.map((_, i) => {
                const half = fillSpot;
                let pos = Math.abs((i - half) / half);

                if (to.colors.length === 3) {
                    pos = Math.min(1, pos * 2.6);
                }

                if (backwards) {
                    pos = 1 - pos;
                }
                return pos;
            });

            const start = performance.now();

            const nextFrame = () => {
                const time = (performance.now() - start) / duration;

                if (time >= 1) {
                    this.currentValues = next;
                    this.send();
                    if (this.currentTransition) {
                        global.clearInterval(this.currentTransition.timer);
                    }
                    this.currentTransition = null;
                    resolve();
                    return;
                }

                for (let c = 0; c < this.currentValues.length; c++) {
                    const half = (this.currentValues.length - 1) / 2;
                    let pos = Math.abs((c - half) / half);

                    if (backwards) {
                        pos = 1 - pos;
                    }

                    this.currentValues[c] = this.interpolate(previous[c], next[c], time, distanceFromFill[c]);
                }
                this.send();
            };

            this.currentTransition = {
                timer: global.setInterval(nextFrame, 0),
                resolve
            };
        });
    }

    private interpolate(from: Color, to: Color, time: number, position: number): Color {
        const delta = Math.max(0, Math.min((time - (position / 2)) * 2, 1));
        return mapComponent(from, (fc, i) => fc + (to[i] - fc) * delta);
    }

    private spreadColors(spanColors: Color[]): Color[] {
        const spanLength = this.length / spanColors.length;
        const spans = spanColors.map(color => ({
            remaining: spanLength,
            color
        }));
        const colors: Color[] = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            if (spans[0].remaining >= 1 - ELLIPSES) {
                colors[i] = spans[0].color;
                if (--spans[0].remaining < ELLIPSES) {
                    spans.shift();
                }
            } else {
                const partials: { color: Color, size: number }[] = [];
                for (let fill = 0; fill < 1 - ELLIPSES;) {
                    const take = Math.max(1 - fill, spans[0].remaining);
                    fill += take;
                    partials.push({
                        color: spans[0].color,
                        size: take
                    });
                    spans[0].remaining -= take;
                    if (--spans[0].remaining < ELLIPSES) {
                        spans.shift();
                    }
                }
                const total = partials.reduce((t, p) => t + p.size, 0);
                colors[i] = partials.reduce((c, p) => [
                    c[0] + p.color[0] * p.size / total,
                    c[1] + p.color[1] * p.size / total,
                    c[2] + p.color[2] * p.size / total,
                ], Colors.BLACK);
            }
        }
        return colors;
    }
}

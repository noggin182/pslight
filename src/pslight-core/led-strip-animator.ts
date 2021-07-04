import { performance } from 'perf_hooks';

const ELLIPSES = 0.0002;

const TRANSITION_DURATION = 1000;
const TRANSITION_INTERVAL = 0;

export interface ActiveSpansSnapshot {
    group: number;
    colors: number[];
}

export interface LedStripAnimator {
    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): void;
}

type Color = readonly [number, number, number];
const BLACK: Color = [0, 0, 0];

export class DefaultLedStripAnimator implements LedStripAnimator {
    constructor(private readonly length: number, private readonly write: (colors: number[]) => void) {
    }

    private currentValues: Color[] = new Array(this.length).fill(BLACK);

    private timer: NodeJS.Timer | null = null;

    private send() {
        this.write(this.currentValues.map(([r, g, b]) => (r << 16) | (g << 8) | (b)));
    }

    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): void {
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
            const time = (performance.now() - start) / TRANSITION_DURATION;

            if (time >= 1) {
                this.currentValues = next;
                this.send();
                if (this.timer) {
                    global.clearInterval(this.timer);
                }
                this.timer = null;
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

        if (this.timer) {
            global.clearInterval(this.timer);
        }

        this.timer = global.setInterval(nextFrame, TRANSITION_INTERVAL);
    }

    private interpolate(from: Color, to: Color, time: number, position: number): Color {
        const delta = Math.max(0, Math.min((time - (position / 2)) * 2, 1));
        const component = (f: number, t: number) => f + (t - f) * delta;
        return [
            component(from[0], to[0]),
            component(from[1], to[1]),
            component(from[2], to[2])
        ];
    }

    private toRgb(color: number): Color {
        return [
            (color >> 16) & 0xFF,
            (color >> 8) & 0xFF,
            (color >> 0) & 0xFF
        ];
    }

    private spreadColors(spanColors: number[]): Color[] {
        const spanLength = this.length / spanColors.length;
        const spans = spanColors.map(color => ({
            remaining: spanLength,
            color: this.toRgb(color)
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
                ], BLACK);
            }
        }
        return colors;
    }
}

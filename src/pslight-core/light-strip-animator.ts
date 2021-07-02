import { performance } from 'perf_hooks';
import { PslightConfig } from './config';
import { PslightHost } from './host';

const ELLIPSES = 0.0002;

const TRANSITION_DURATION = 1000;
const TRANSITION_INTERVAL = 0;

export interface ActiveSpansSnapshot {
    group: number;
    colors: number[];
}

export interface LightStripAnimator {
    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): void;
}

interface Color {
    r: number;
    g: number;
    b: number;
}

export class DefaultLightStripAnimator implements LightStripAnimator {
    constructor(private readonly host: PslightHost, private readonly config: PslightConfig) {
    }

    private currentLights = new Uint32Array(this.config.numberOfLeds);

    private timer: NodeJS.Timer | null = null;

    transition(from: ActiveSpansSnapshot, to: ActiveSpansSnapshot): void {
        const prevLights = this.currentLights;
        this.currentLights = new Uint32Array(prevLights);

        const current = [...prevLights].map(this.toRgb);
        const next = this.spreadColors(to.colors);

        const backwards = to.group < from.group
            || (to.group === from.group && to.colors.length == 2);

        const fillSpot = (this.currentLights.length - 1) / 2;
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
                this.currentLights = new Uint32Array(next.map(this.fromRgb));
                this.host.writeLedValues(this.currentLights);
                if (this.timer) {
                    global.clearInterval(this.timer);
                }
                this.timer = null;
                return;
            }

            for (let c = 0; c < this.currentLights.length; c++) {
                const half = (this.currentLights.length - 1) / 2;
                let pos = Math.abs((c - half) / half);

                if (backwards) {
                    pos = 1 - pos;
                }

                this.currentLights[c] = this.fromRgb({
                    r: this.interpolate(current[c].r, next[c].r, time, distanceFromFill[c]),
                    g: this.interpolate(current[c].g, next[c].g, time, distanceFromFill[c]),
                    b: this.interpolate(current[c].b, next[c].b, time, distanceFromFill[c])
                });
            }
            this.host.writeLedValues(this.currentLights);
        };

        if (this.timer) {
            global.clearInterval(this.timer);
        }

        this.timer = global.setInterval(nextFrame, TRANSITION_INTERVAL);
    }

    private interpolate(from: number, to: number, time: number, position: number) {
        if (from === to) {
            return to;
        }
        const delta = Math.max(0, Math.min((time - (position / 2)) * 2, 1));
        return from + (to - from) * delta;
    }

    private toRgb(color: number): Color {
        return {
            r: (color >> 16) & 0xFF,
            g: (color >> 8) & 0xFF,
            b: (color >> 0) & 0xFF
        };
    }

    private fromRgb({ r, g, b }: Color) {
        return (r << 16) | (g << 8) | (b);
    }

    private spreadColors(spanColors: number[]): Color[] {
        const length = this.config.numberOfLeds;
        const spanLength = length / spanColors.length;
        const spans = spanColors.map(color => ({
            remaining: spanLength,
            color: this.toRgb(color)
        }));
        const colors: Color[] = new Array(length);
        for (let i = 0; i < length; i++) {
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
                colors[i] = partials.reduce((c, p) => ({
                    r: c.r + p.color.r * p.size / total,
                    g: c.g + p.color.g * p.size / total,
                    b: c.b + p.color.b * p.size / total,
                }), { r: 0, g: 0, b: 0 });
            }
        }
        return colors;
    }
}

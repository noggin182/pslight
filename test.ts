// import { ws281x } from 'rpi-ws281x'
import { Color } from './src/utils/color';

// ws281x.configure({
//     leds: 108,
//     stripType: 'grb'
// });

const ws281x = {
    render: (leds: Uint32Array) => {
        // console.log(leds);
    }
};

function randomColor(): Color {
    const r = Math.random() * 7 + 1;
    return [
        r & 1 ? 255 : 0,
        r & 2 ? 255 : 0,
        r & 4 ? 255 : 0,
    ];
}

function merge(a: Color, b: Color, d: number): Color {
    return [
        a[0] + (b[0] - a[0]) * d,
        a[1] + (b[1] - a[1]) * d,
        a[2] + (b[2] - a[2]) * d,
    ];
}


let from: Color[] = new Array(7).fill([0, 0, 0]);
let to: Color[] = from.map(() => randomColor());

const STEP = 0.1;

const main = async () => {
    while (true) {

        for (let d = STEP; d <= 1; d = Math.min(d + STEP, 1)) {
            const points = from.map((fc, i) => merge(fc, to[i], d));
            console.log(d, points);
            ws281x.render(new Uint32Array(new Array(108).fill(1).map((_, l) => {
                const c = merge(points[Math.floor(l / 18)], points[Math.floor(l / 18) + 1], (l % 18) / 18);
                return (c[0] << 16) | (c[1] << 8) | c[2];
            })));
            await new Promise(cb => setTimeout(cb, 1));
        }

        from = to;
        to = from.map(() => randomColor());
    }
};

main();

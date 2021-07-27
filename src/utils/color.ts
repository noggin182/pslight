import { Constants } from '../constants';

export type Color = readonly [red: number, green: number, blue: number];

export const Colors = {
    BLACK: fromNumber(0x000000),
    WHITE: fromNumber(0xFFFFFF),
    RED: fromNumber(0xFF0000)
};

export function mapComponent([r, g, b]: Color, callback: (component: number, index: number) => number): Color {
    return [callback(r, 0), callback(g, 1), callback(b, 2)];
}

export function toNumber(color: Color): number {
    return mapComponent(color, c => Math.round(c * 255)).reduce((p, c) => p << 8 | c);
}

export function fromNumber(color: number): Color {
    return [
        ((color >> 0x10) & 0xFF) / 255,
        ((color >> 0x08) & 0xFF) / 255,
        ((color >> 0x00) & 0xFF) / 255,
    ];
}

let currentPlayerColor = -1;
export function getPlayerColor(onlineId: string): Color {
    const preference = process.env[`PSLIGHT_COLOR_${onlineId}`];
    if (typeof preference === 'string' && /^[\da-f]{6}$/i.test(preference)) {
        return fromNumber(parseInt(preference, 16));
    }
    const playerColors = Constants.colors.players;
    return fromNumber(playerColors[(++currentPlayerColor) % playerColors.length]);
}
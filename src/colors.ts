const DEFAULT_COLORS = [0x1565C0, 0x2E7D32, 0x4527A0, 0xD84315];

export function getPlayerColor(onlineId: string): number {
    const preference = process.env[`PSLIGHT_COLOR_${onlineId}`];
    if (typeof preference === 'string' && /^[\da-f]{6}$/i.test(preference)) {
        return parseInt(preference, 16);
    }
    const color = DEFAULT_COLORS.shift() ?? 0;
    DEFAULT_COLORS.push(color);
    return color;
}
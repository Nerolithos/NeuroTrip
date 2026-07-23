let cachedPatternDataUrl = '';
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const drawSiemensStar = (ctx, cx, cy, radius) => {
    const spokes = 72;
    for (let index = 0; index < spokes; index += 1) {
        const start = (index / spokes) * Math.PI * 2;
        const end = ((index + 1) / spokes) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = index % 2 === 0 ? '#0a0f16' : '#f2f8ff';
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#ffea7d';
    ctx.fill();
};
const drawSpokeWheel = (ctx, cx, cy, radius) => {
    ctx.strokeStyle = 'rgba(228, 240, 250, 0.92)';
    for (let index = 0; index < 36; index += 1) {
        const angle = (index / 36) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.lineWidth = index % 3 === 0 ? 1.5 : 0.8;
        ctx.stroke();
    }
};
const drawLineFamilies = (ctx, width, height) => {
    const startX = width * 0.06;
    const endX = width * 0.94;
    ctx.strokeStyle = 'rgba(240, 248, 255, 0.84)';
    for (let offset = 0; offset < 10; offset += 1) {
        const y = height * (0.12 + offset * 0.02);
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
        ctx.lineWidth = 0.7 + offset * 0.13;
        ctx.stroke();
    }
    for (let offset = 0; offset < 10; offset += 1) {
        const x = width * (0.06 + offset * 0.028);
        ctx.beginPath();
        ctx.moveTo(x, height * 0.24);
        ctx.lineTo(x, height * 0.92);
        ctx.lineWidth = 0.7 + offset * 0.13;
        ctx.stroke();
    }
    for (let offset = 0; offset < 10; offset += 1) {
        const y = height * (0.42 + offset * 0.035);
        ctx.beginPath();
        ctx.moveTo(width * 0.38, y);
        ctx.lineTo(width * 0.84, y - width * 0.24);
        ctx.lineWidth = 0.65 + offset * 0.12;
        ctx.stroke();
    }
    for (let offset = 0; offset < 10; offset += 1) {
        const y = height * (0.62 + offset * 0.028);
        ctx.beginPath();
        ctx.moveTo(width * 0.38, y);
        ctx.lineTo(width * 0.84, y + width * 0.24);
        ctx.lineWidth = 0.65 + offset * 0.12;
        ctx.stroke();
    }
};
const drawDotMatrix = (ctx, width, height) => {
    const gridLeft = width * 0.66;
    const gridTop = height * 0.12;
    const gridWidth = width * 0.26;
    const gridHeight = height * 0.24;
    const cols = 22;
    const rows = 12;
    for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
            const x = gridLeft + (col / (cols - 1)) * gridWidth;
            const y = gridTop + (row / (rows - 1)) * gridHeight;
            const radius = 0.6 + ((row + col) % 3);
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(244, 249, 255, 0.9)';
            ctx.fill();
        }
    }
};
const drawTextBlocks = (ctx, width, height) => {
    ctx.fillStyle = 'rgba(247, 251, 255, 0.96)';
    ctx.font = `${Math.round(width * 0.03)}px IBM Plex Mono, Menlo, monospace`;
    ctx.fillText('ASTIGMATISM TEST PATTERN', width * 0.06, height * 0.36);
    const sizes = [28, 24, 20, 16, 12, 10];
    let y = height * 0.47;
    for (const size of sizes) {
        const px = clamp(Math.round((size / 28) * width * 0.038), 10, 34);
        ctx.font = `${px}px Iowan Old Style, Georgia, serif`;
        ctx.fillText('C E F P T O L Z', width * 0.06, y);
        y += px * 1.1;
    }
};
export const getAstigmatismTestPatternDataUrl = (size = 1024) => {
    if (cachedPatternDataUrl) {
        return cachedPatternDataUrl;
    }
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return '';
    }
    ctx.fillStyle = '#050a11';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(19, 36, 49, 0.52)';
    ctx.fillRect(size * 0.02, size * 0.02, size * 0.96, size * 0.96);
    drawLineFamilies(ctx, size, size);
    drawDotMatrix(ctx, size, size);
    drawTextBlocks(ctx, size, size);
    drawSpokeWheel(ctx, size * 0.2, size * 0.78, size * 0.15);
    drawSiemensStar(ctx, size * 0.78, size * 0.72, size * 0.17);
    cachedPatternDataUrl = canvas.toDataURL('image/png');
    return cachedPatternDataUrl;
};

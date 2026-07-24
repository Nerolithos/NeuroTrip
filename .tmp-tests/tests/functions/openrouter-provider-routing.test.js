import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
test('image provider ark path requires imager secret and does not fallback to neurotrip', () => {
    const fnPath = resolve(process.cwd(), 'functions/api/openrouter.ts');
    const content = readFileSync(fnPath, 'utf8');
    assert.equal(content.includes("provider === 'ark'"), true);
    assert.equal(content.includes("firstNonEmpty(env.imager, env.IMAGER)"), true);
    assert.equal(content.includes("Missing Cloudflare Pages secret: imager"), true);
});
test('backend normalizes accidentally quoted api keys from Cloudflare secrets', () => {
    const fnPath = resolve(process.cwd(), 'functions/api/openrouter.ts');
    const content = readFileSync(fnPath, 'utf8');
    assert.equal(content.includes('const normalizeApiKey = (value: string) => {'), true);
    assert.equal(content.includes("trimmed.startsWith('\"')"), true);
    assert.equal(content.includes('const secret = normalizeApiKey(secretRaw)'), true);
});
test('backend enforces Ark image minimum pixel size with safe default', () => {
    const fnPath = resolve(process.cwd(), 'functions/api/openrouter.ts');
    const content = readFileSync(fnPath, 'utf8');
    assert.equal(content.includes('const ARK_MIN_IMAGE_PIXELS = 3_686_400'), true);
    assert.equal(content.includes("const DEFAULT_ARK_IMAGE_SIZE = '2048x2048'"), true);
    assert.equal(content.includes("if (parsed.width * parsed.height < ARK_MIN_IMAGE_PIXELS)"), true);
    assert.equal(content.includes('return DEFAULT_ARK_IMAGE_SIZE'), true);
});

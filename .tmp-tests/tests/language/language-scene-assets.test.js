import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
test('LanguageAreaScene does not depend on unstable loremflickr external images', () => {
    const scenePath = resolve(process.cwd(), 'src/scenes/LanguageAreaScene/LanguageAreaScene.tsx');
    const content = readFileSync(scenePath, 'utf8');
    assert.equal(content.includes('loremflickr.com'), false);
});

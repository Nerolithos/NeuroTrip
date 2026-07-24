import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const scenePath = `${process.cwd()}/src/scenes/RevLingualScene/RevLingualScene.tsx`;
const cssPath = `${process.cwd()}/src/scenes/RevLingualScene/revLingual.css`;
const sceneFramePath = `${process.cwd()}/src/components/SceneFrame.tsx`;
const sceneSource = readFileSync(scenePath, 'utf8');
const cssSource = readFileSync(cssPath, 'utf8');
const sceneFrameSource = readFileSync(sceneFramePath, 'utf8');
test('rev-lingual scene is a UsedByLanguage html host with unified SceneFrame navigation controls', () => {
    assert.match(sceneSource, /UsedByLanguage\.html\?raw/);
    assert.match(sceneSource, /LanguageToggle/);
    assert.match(sceneSource, /The Limits of My Language|语言的边界/);
    assert.doesNotMatch(sceneSource, /<iframe/);
    assert.match(sceneSource, /ubl-experience/);
    assert.match(sceneSource, /scene-topbar/);
    assert.match(sceneSource, /Brain Map|脑网络地图/);
    assert.match(sceneSource, /Sources|参考来源/);
    assert.match(sceneSource, /window\.__UBL_API\?\.setLang/);
    assert.match(sceneFrameSource, /Brain Map|脑网络地图/);
    assert.match(sceneFrameSource, /Sources|参考来源/);
    assert.match(sceneFrameSource, /LanguageToggle/);
});
test('rev-lingual stylesheet provides embedded html container layout', () => {
    assert.match(cssSource, /rev-lingual-page/);
    assert.match(cssSource, /rev-lingual-stage/);
    assert.match(cssSource, /ubl-experience/);
});

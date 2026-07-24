import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProxyEndpointCandidates, extractEmojiFromText, parseEmojiFromChatResponse, parseEmojiReasonFromChatResponse, pickModelCandidates, resolveChatapConfig, } from '../../src/scenes/FacePipelineScene/emojiMatcher.js';
test('extractEmojiFromText returns first emoji glyph', () => {
    assert.equal(extractEmojiFromText('best match is 😄 for this frame'), '😄');
});
test('parseEmojiFromChatResponse parses JSON emoji field first', () => {
    const response = {
        choices: [
            {
                message: {
                    content: '{"emoji":"🤔"}',
                },
            },
        ],
    };
    assert.equal(parseEmojiFromChatResponse(response), '🤔');
});
test('parseEmojiReasonFromChatResponse parses reason from JSON content', () => {
    const response = {
        choices: [
            {
                message: {
                    content: '{"emoji":"🙂","reason":"Mouth corners lift slightly, brows stay relaxed, and gaze remains steady."}',
                },
            },
        ],
    };
    assert.equal(parseEmojiReasonFromChatResponse(response), 'Mouth corners lift slightly, brows stay relaxed, and gaze remains steady.');
});
test('pickModelCandidates keeps user model first and appends fallback', () => {
    assert.deepEqual(pickModelCandidates('deepseek/deepseek-chat-v3.1:free', 'moonshotai/kimi-k2:free'), [
        'deepseek/deepseek-chat-v3.1:free',
        'moonshotai/kimi-k2:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'google/gemma-4-31b-it:free',
    ]);
});
test('pickModelCandidates includes resilient defaults when only one model is provided', () => {
    assert.deepEqual(pickModelCandidates('deepseek/deepseek-chat-v3.1:free', ''), [
        'deepseek/deepseek-chat-v3.1:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'google/gemma-4-31b-it:free',
    ]);
});
test('resolveChatapConfig falls back to same-origin Cloudflare proxy endpoint', () => {
    const config = resolveChatapConfig({
        chatap: '',
        model: 'deepseek/deepseek-chat-v3.1:free',
        fallbackModel: 'moonshotai/kimi-k2:free',
        siteUrl: 'https://neuro.nero-lithos.com',
        title: 'neurotrip',
    });
    assert.ok(config);
    assert.equal(config?.mode, 'proxy-endpoint');
    assert.equal(config?.endpoint, '/api/openrouter');
    assert.deepEqual(config?.reasonModels, config?.models);
});
test('resolveChatapConfig supports independent model candidates for reason generation', () => {
    const config = resolveChatapConfig({
        chatap: '',
        model: 'vision-main-model:free',
        fallbackModel: 'vision-fallback-model:free',
        reasonModel: 'reason-main-model:free',
        reasonFallbackModel: 'reason-fallback-model:free',
        siteUrl: 'https://neuro.nero-lithos.com',
        title: 'neurotrip',
    });
    assert.ok(config);
    assert.deepEqual(config?.models, [
        'vision-main-model:free',
        'vision-fallback-model:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'google/gemma-4-31b-it:free',
    ]);
    assert.deepEqual(config?.reasonModels, [
        'reason-main-model:free',
        'reason-fallback-model:free',
        'nvidia/nemotron-nano-12b-v2-vl:free',
        'google/gemma-4-31b-it:free',
    ]);
});
test('buildProxyEndpointCandidates includes platform fallback endpoints for default proxy route', () => {
    assert.deepEqual(buildProxyEndpointCandidates('/api/openrouter'), [
        '/api/openrouter',
        '/functions/api/openrouter',
        '/.netlify/functions/openrouter',
        '/.netlify/functions/api/openrouter',
    ]);
});
test('buildProxyEndpointCandidates keeps explicit remote endpoint as-is', () => {
    assert.deepEqual(buildProxyEndpointCandidates('https://example.com/api/openrouter'), [
        'https://example.com/api/openrouter',
    ]);
});

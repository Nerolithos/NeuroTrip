import test from 'node:test';
import assert from 'node:assert/strict';
import { extractEmojiFromText, parseEmojiFromChatResponse, pickModelCandidates, } from '../src/scenes/FacePipelineScene/emojiMatcher.js';
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
test('pickModelCandidates keeps user model first and appends fallback', () => {
    assert.deepEqual(pickModelCandidates('deepseek/deepseek-chat-v3.1:free', 'moonshotai/kimi-k2:free'), ['deepseek/deepseek-chat-v3.1:free', 'moonshotai/kimi-k2:free']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenizeInput, wordToPseudoPhonemes, buildLexicalCompetition, detectSemanticAnomaly, predictNextWords, buildSemanticClusters, detectLanguageCommands, resolveSemanticUniverse, scoreLabelAffinity, } from '../../src/scenes/LanguageAreaScene/languageDecoder.js';
test('tokenizeInput keeps lowercase tokens and strips punctuation', () => {
    assert.deepEqual(tokenizeInput('Hello, Brain!  test-case.'), ['hello', 'brain', 'test', 'case']);
});
test('wordToPseudoPhonemes outputs timeline-like phoneme units', () => {
    const phonemes = wordToPseudoPhonemes('symbol');
    assert.ok(phonemes.length >= 2);
    assert.ok(phonemes.every((unit) => unit.length > 0));
});
test('buildLexicalCompetition returns ranked candidates that include source token', () => {
    const candidates = buildLexicalCompetition('smile');
    assert.ok(candidates.length >= 4);
    assert.equal(candidates[0]?.token, 'smile');
    assert.ok((candidates[0]?.score || 0) >= (candidates[1]?.score || 0));
});
test('detectSemanticAnomaly flags unusual word choices', () => {
    assert.equal(detectSemanticAnomaly(['i', 'drink', 'thunder']), true);
    assert.equal(detectSemanticAnomaly(['i', 'drink', 'water']), false);
});
test('predictNextWords returns descending probabilities summing near 1', () => {
    const predictions = predictNextWords(['i', 'feel']);
    assert.ok(predictions.length >= 3);
    const total = predictions.reduce((sum, item) => sum + item.probability, 0);
    assert.ok(total > 0.99 && total < 1.01);
    assert.ok((predictions[0]?.probability || 0) >= (predictions[1]?.probability || 0));
});
test('buildSemanticClusters groups words and exposes polysemy branches', () => {
    const clusters = buildSemanticClusters(['bank', 'river', 'money', 'home']);
    assert.ok(clusters.length >= 2);
    const bankCluster = clusters.find((cluster) => cluster.anchor === 'bank');
    assert.ok(bankCluster);
    assert.ok((bankCluster?.branches || []).length >= 2);
});
test('detectLanguageCommands extracts visual takeover commands from text', () => {
    const commands = detectLanguageCommands('dark fall silence now');
    assert.deepEqual(commands, {
        dark: true,
        fall: true,
        silence: true,
    });
});
test('resolveSemanticUniverse disambiguates bank by context keyword river', () => {
    const universe = resolveSemanticUniverse('bank river');
    assert.equal(universe.anchorWord, 'bank');
    assert.equal(universe.key, 'bank-river');
});
test('resolveSemanticUniverse disambiguates apple by context keyword logo', () => {
    const universe = resolveSemanticUniverse('apple logo');
    assert.equal(universe.anchorWord, 'apple');
    assert.equal(universe.key, 'apple-tech');
});
test('scoreLabelAffinity gives stronger score for closer semantic label', () => {
    const animalScore = scoreLabelAffinity('animal', ['animal', 'wildlife']);
    const toolScore = scoreLabelAffinity('animal', ['tool', 'device']);
    assert.ok(animalScore > toolScore);
    assert.ok(animalScore > 0.6);
});

const anomalyLexicon = new Set([
    'thunder',
    'void',
    'absurd',
    'impossible',
    'neon',
    '冰箱',
    '雷鸣',
    '荒诞',
]);
const commandLexicon = {
    dark: ['dark', 'black', 'dim', '黑暗', '变暗'],
    fall: ['fall', 'drop', 'collapse', '坠落', '下坠'],
    silence: ['silence', 'mute', 'quiet', '静音', '安静'],
};
const transitionHints = {
    i: ['am', 'feel', 'remember', 'think', 'want'],
    feel: ['like', 'tired', 'seen', 'nothing', 'alive'],
    am: ['not', 'still', 'here', 'afraid', 'awake'],
    you: ['are', 'know', 'can', 'will', 'keep'],
    the: ['word', 'signal', 'pattern', 'machine', 'memory'],
    language: ['predicts', 'bends', 'frames', 'organizes', 'rewrites'],
};
const branchHints = {
    bank: ['money', 'finance', 'river', 'shore'],
    light: ['lamp', 'bright', 'weightless', 'photon'],
    root: ['origin', 'tree', 'cause', 'system'],
    symbol: ['sign', 'code', 'meaning', 'mask'],
};
const semanticBuckets = {
    self: ['i', 'me', 'myself', 'mind', 'inner', 'self', '我', '自己'],
    emotion: ['love', 'fear', 'sad', 'joy', 'grief', 'anger', 'anxious', '开心', '难过', '恐惧'],
    motion: ['run', 'walk', 'fall', 'move', 'drift', 'sprint', '坠落', '移动'],
    object: ['door', 'window', 'stone', 'river', 'light', 'book', '象', '白象'],
};
const labelSynonyms = {
    animal: ['animal', 'wildlife', 'creature', 'fox', 'cat', 'mouse', 'bird'],
    tool: ['tool', 'device', 'cable', 'charger', 'mouse', 'hardware', 'instrument'],
    danger: ['danger', 'risk', 'fire', 'volcano', 'hazard', 'explosion'],
    food: ['food', 'fruit', 'apple', 'meal', 'snack', 'eat'],
};
const semanticUniverses = [
    {
        anchorWord: 'bank',
        key: 'bank-river',
        title: 'BANK as shoreline',
        description: 'A sloped river edge appears; flow, erosion, and wetlands dominate meaning.',
        cues: ['river', 'shore', 'water', 'stream', 'flood'],
    },
    {
        anchorWord: 'bank',
        key: 'bank-finance',
        title: 'BANK as finance',
        description: 'Vaults, credit, and account logic reshape the lexical field.',
        cues: ['money', 'cash', 'loan', 'account', 'finance', 'credit'],
    },
    {
        anchorWord: 'apple',
        key: 'apple-fruit',
        title: 'APPLE as fruit',
        description: 'Taste, orchard, and nutrition concepts pull the semantic neighborhood.',
        cues: ['fruit', 'eat', 'sweet', 'tree', 'juice', 'pie'],
    },
    {
        anchorWord: 'apple',
        key: 'apple-tech',
        title: 'APPLE as company',
        description: 'Interface, hardware, and ecosystem references lock onto the brand sense.',
        cues: ['iphone', 'mac', 'logo', 'ios', 'device', 'company'],
    },
    {
        anchorWord: 'mouse',
        key: 'mouse-animal',
        title: 'MOUSE as animal',
        description: 'Rodent traits, habitat, and predator-prey context dominate interpretation.',
        cues: ['animal', 'tail', 'cheese', 'forest', 'rodent'],
    },
    {
        anchorWord: 'mouse',
        key: 'mouse-device',
        title: 'MOUSE as interface device',
        description: 'Cursor control, click behavior, and peripherals become primary.',
        cues: ['click', 'usb', 'cursor', 'computer', 'keyboard'],
    },
    {
        anchorWord: 'spring',
        key: 'spring-season',
        title: 'SPRING as season',
        description: 'Bloom cycles and seasonal transition govern nearby concepts.',
        cues: ['season', 'flower', 'march', 'april', 'bloom'],
    },
    {
        anchorWord: 'spring',
        key: 'spring-coil',
        title: 'SPRING as coil',
        description: 'Compression, release, and mechanical tension structure meaning.',
        cues: ['coil', 'metal', 'compress', 'engine', 'mechanic'],
    },
    {
        anchorWord: 'spring',
        key: 'spring-water',
        title: 'SPRING as water source',
        description: 'Groundwater, source pressure, and fountain imagery dominate.',
        cues: ['water', 'fountain', 'well', 'source', 'groundwater'],
    },
];
export const tokenizeInput = (text) => {
    return (text || '')
        .toLowerCase()
        .replace(/[\u2019']/g, ' ')
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, ' ')
        .split(/[\s-]+/)
        .map((token) => token.trim())
        .filter(Boolean);
};
export const wordToPseudoPhonemes = (word) => {
    const value = (word || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
    if (!value)
        return [];
    const output = [];
    let index = 0;
    while (index < value.length) {
        const pair = value.slice(index, index + 2);
        if (pair.length === 2 && /[aeiou]{2}|th|sh|ch|ph|ng/.test(pair)) {
            output.push(pair.toUpperCase());
            index += 2;
            continue;
        }
        output.push(value[index].toUpperCase());
        index += 1;
    }
    return output;
};
export const buildLexicalCompetition = (token) => {
    const base = (token || '').toLowerCase().trim();
    if (!base)
        return [];
    const edits = [
        base,
        `${base}ing`,
        `${base}ed`,
        `${base}er`,
        base.length > 3 ? base.slice(0, -1) : `${base}a`,
    ];
    const unique = [...new Set(edits)];
    return unique.slice(0, 5).map((entry, index) => ({
        token: entry,
        score: Number((1 - index * 0.17).toFixed(2)),
    }));
};
export const detectSemanticAnomaly = (tokens) => {
    return tokens.some((token) => anomalyLexicon.has(token));
};
const normalizePredictions = (predictions) => {
    const sum = predictions.reduce((acc, item) => acc + item.probability, 0);
    if (sum <= 0)
        return predictions;
    return predictions
        .map((item) => ({
        token: item.token,
        probability: item.probability / sum,
    }))
        .sort((a, b) => b.probability - a.probability);
};
export const predictNextWords = (tokens) => {
    const last = tokens[tokens.length - 1] || '';
    const hints = transitionHints[last] || ['the', 'a', 'is', 'to', 'and'];
    const raw = hints.slice(0, 5).map((token, index) => ({
        token,
        probability: Math.max(0.01, 1 - index * 0.2),
    }));
    return normalizePredictions(raw);
};
const bucketForToken = (token) => {
    const entries = Object.entries(semanticBuckets);
    for (let index = 0; index < entries.length; index += 1) {
        const [bucket, words] = entries[index];
        if (words.includes(token)) {
            return bucket;
        }
    }
    return 'misc';
};
export const buildSemanticClusters = (tokens) => {
    if (!tokens.length)
        return [];
    const grouped = new Map();
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        const bucket = bucketForToken(token);
        const list = grouped.get(bucket) || [];
        if (!list.includes(token))
            list.push(token);
        grouped.set(bucket, list);
    }
    const clusters = [];
    grouped.forEach((list, bucket) => {
        const anchor = list[0] || bucket;
        const branches = branchHints[anchor] || list.slice(1, 4);
        clusters.push({
            anchor,
            tokens: list,
            branches: branches.length ? branches : [anchor],
        });
    });
    // Ensure polysemy split is visible for known ambiguous anchors.
    if (tokens.includes('bank') && !clusters.some((cluster) => cluster.anchor === 'bank')) {
        clusters.push({
            anchor: 'bank',
            tokens: ['bank'],
            branches: branchHints.bank || ['money', 'river'],
        });
    }
    return clusters;
};
const includesAny = (tokens, lexicon) => {
    for (let i = 0; i < lexicon.length; i += 1) {
        if (tokens.includes(lexicon[i]))
            return true;
    }
    return false;
};
export const detectLanguageCommands = (text) => {
    const tokens = tokenizeInput(text);
    return {
        dark: includesAny(tokens, commandLexicon.dark),
        fall: includesAny(tokens, commandLexicon.fall),
        silence: includesAny(tokens, commandLexicon.silence),
    };
};
const queryTermsForLabel = (label) => {
    const normalized = (label || '').toLowerCase().trim();
    if (!normalized)
        return [];
    const tokens = tokenizeInput(normalized);
    const synonyms = labelSynonyms[normalized] || [];
    return [...new Set([normalized, ...tokens, ...synonyms])];
};
export const scoreLabelAffinity = (label, semanticTags) => {
    const terms = queryTermsForLabel(label);
    const tags = semanticTags.map((tag) => (tag || '').toLowerCase().trim()).filter(Boolean);
    if (!terms.length || !tags.length)
        return 0;
    let best = 0;
    for (let i = 0; i < terms.length; i += 1) {
        const term = terms[i];
        for (let j = 0; j < tags.length; j += 1) {
            const tag = tags[j];
            if (term === tag) {
                best = Math.max(best, 1);
                continue;
            }
            if (term.length > 2 && (tag.includes(term) || term.includes(tag))) {
                best = Math.max(best, 0.72);
                continue;
            }
            const prefixLen = Math.min(term.length, tag.length);
            let shared = 0;
            for (let k = 0; k < prefixLen; k += 1) {
                if (term[k] !== tag[k])
                    break;
                shared += 1;
            }
            if (shared > 2) {
                best = Math.max(best, Math.min(0.58, shared / Math.max(term.length, tag.length)));
            }
        }
    }
    return Number(best.toFixed(2));
};
export const resolveSemanticUniverse = (input) => {
    const tokens = Array.isArray(input) ? input.map((value) => value.toLowerCase()) : tokenizeInput(input);
    const anchors = ['bank', 'apple', 'mouse', 'spring'];
    const anchorWord = anchors.find((anchor) => tokens.includes(anchor)) || '';
    if (!anchorWord) {
        return {
            anchorWord: 'language',
            key: 'neutral-language-field',
            title: 'Neutral language field',
            description: 'No ambiguous anchor detected yet. Add words like bank/apple/mouse/spring to branch worlds.',
            hints: ['bank', 'apple', 'mouse', 'spring'],
            confidence: 0.35,
        };
    }
    const candidates = semanticUniverses.filter((item) => item.anchorWord === anchorWord);
    if (!candidates.length) {
        return {
            anchorWord,
            key: `${anchorWord}-default`,
            title: `${anchorWord.toUpperCase()} default sense`,
            description: 'Context is still sparse; semantic space remains unresolved.',
            hints: [],
            confidence: 0.4,
        };
    }
    let winner = candidates[0];
    let winnerScore = -1;
    for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        const matches = candidate.cues.filter((cue) => tokens.includes(cue));
        const score = matches.length;
        if (score > winnerScore) {
            winner = candidate;
            winnerScore = score;
        }
    }
    const matchedHints = winner.cues.filter((cue) => tokens.includes(cue));
    const confidence = Math.min(0.98, 0.45 + matchedHints.length * 0.18);
    return {
        anchorWord,
        key: winner.key,
        title: winner.title,
        description: winner.description,
        hints: matchedHints,
        confidence: Number(confidence.toFixed(2)),
    };
};

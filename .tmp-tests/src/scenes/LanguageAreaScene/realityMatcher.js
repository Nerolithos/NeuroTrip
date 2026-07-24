import { buildProxyEndpointCandidates } from '../FacePipelineScene/emojiMatcher.js';
const clamp01 = (value) => {
    if (!Number.isFinite(value))
        return 0;
    if (value < 0)
        return 0;
    if (value > 1)
        return 1;
    return Number(value.toFixed(2));
};
const parseJsonFromText = (text) => {
    if (!text)
        return null;
    try {
        const direct = JSON.parse(text);
        if (direct && typeof direct === 'object')
            return direct;
    }
    catch {
        // continue
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start)
        return null;
    try {
        const sliced = JSON.parse(text.slice(start, end + 1));
        if (sliced && typeof sliced === 'object')
            return sliced;
    }
    catch {
        return null;
    }
    return null;
};
const buildRequestHeaders = (config) => {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (config.mode === 'direct-openrouter') {
        headers.Authorization = `Bearer ${config.secret || ''}`;
        headers['HTTP-Referer'] = config.siteUrl;
        headers['X-Title'] = config.title;
    }
    return headers;
};
const buildPrompt = (input) => {
    const cardsText = input.cards
        .map((card) => `${card.id}: ${card.label}; tags=${card.tags.join('|')}; desc=${card.description}`)
        .join('\n');
    if (!input.isZh) {
        return [
            'You are a semantic image matcher.',
            'Task: score each image-card against the user label from 0 to 1, where 1 means highly related.',
            'You must score ALL card IDs and return strict minified JSON only.',
            'Output format: {"scores":{"id":0.00},"reason":"one concise sentence"}.',
            'No markdown, no explanation outside JSON.',
            `User label: ${input.label}`,
            `Cards:\n${cardsText}`,
        ].join(' ');
    }
    return [
        '你是语义图片匹配器。',
        '任务：根据用户输入标签，为每个图片卡片打 0 到 1 的相关度分数，1 表示高度相关。',
        '必须给所有 id 打分，并且只返回最小化 JSON。',
        '输出格式：{"scores":{"id":0.00},"reason":"一句简短解释"}。',
        '不要输出 markdown，不要输出 JSON 以外内容。',
        `用户标签：${input.label}`,
        `卡片列表：\n${cardsText}`,
    ].join(' ');
};
const parseScores = (payload, cards) => {
    if (!payload || typeof payload !== 'object')
        return null;
    const directScores = payload.scores;
    if (directScores && typeof directScores === 'object') {
        const output = {};
        cards.forEach((card) => {
            const raw = directScores[card.id];
            if (typeof raw === 'number')
                output[card.id] = clamp01(raw);
        });
        if (Object.keys(output).length)
            return output;
    }
    const choices = payload.choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim())
        return null;
    const parsed = parseJsonFromText(content);
    const parsedScores = parsed?.scores;
    if (!parsedScores || typeof parsedScores !== 'object')
        return null;
    const output = {};
    cards.forEach((card) => {
        const raw = parsedScores[card.id];
        if (typeof raw === 'number') {
            output[card.id] = clamp01(raw);
        }
        else if (typeof raw === 'string') {
            const value = Number.parseFloat(raw);
            if (Number.isFinite(value))
                output[card.id] = clamp01(value);
        }
    });
    return Object.keys(output).length ? output : null;
};
const parseReason = (payload) => {
    if (!payload || typeof payload !== 'object')
        return '';
    const directReason = payload.reason;
    if (typeof directReason === 'string' && directReason.trim()) {
        return directReason.trim();
    }
    const choices = payload.choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim())
        return '';
    const parsed = parseJsonFromText(content);
    const parsedReason = parsed?.reason;
    if (typeof parsedReason === 'string' && parsedReason.trim()) {
        return parsedReason.trim();
    }
    return '';
};
const buildSingleCardPrompt = (input) => {
    if (!input.isZh) {
        return [
            'You are a language-association evaluator for one image.',
            'Score only how strongly the user label semantically associates with this image concept.',
            'Use ONLY the user label meaning and visible visual content in the image.',
            'Never score from card label text, filename, URL words, tags, description, alt text, or other metadata.',
            'Use a fast 3-lens check: literal meaning, cultural symbolism, and metaphorical/idiomatic association.',
            'Use anchored scoring: 0.00 none; 0.15 weak symbolic/theme; 0.33 broad contextual; 0.50 same interaction domain; 0.70 direct functional relation; 0.85 near-core conceptual relation; 1.00 near-synonym/canonical binding.',
            'Calibration examples: button-apple about 0.33; button-keyboard about 0.50; button-light switch about 0.70; button-choice about 0.85.',
            'Sanity example: for label music, fire extinguisher should usually be low (about 0.10-0.25) unless explicit alarm/audio context; avoid inflated scores from object salience alone.',
            'Score >0.65 requires a direct functional or canonical binding between label and image concept.',
            'reason must explicitly mention the bridge from the user label to the image concept, not just describe the image itself.',
            'Do not compress all results into a narrow 0.15-0.35 band. Spread scores according to relation strength.',
            'Do not collapse to strict literalism; if a stable cultural or metaphorical link exists, do not assign 0.',
            'Also check compound terms and fixed collocations in cultural practice/tool vocabulary (e.g., tea + knife -> tea knife / Pu-erh tea tool).',
            'If such an attested relation exists, assign a non-zero weak-to-mid score instead of near-zero dismissal.',
            'If visual evidence is insufficient, keep score in 0.00-0.20 and state uncertainty briefly.',
            'Return strict minified JSON only: {"score":0.00,"reason":"..."}.',
            'reason must be 2-3 short sentences focused on lexical/semantic association paths.',
            'Do not mention percentages, confidence, or phrases like "so I think".',
            `User label: ${input.label}`,
        ].join(' ');
    }
    return [
        '你是单图语言联想评估器。',
        '只评估“标签词”与这张图概念之间的语义联想强度，不要写视觉审美判断。',
        '只能依据“用户输入词义 + 图像可见内容”打分。',
        '严禁依据卡片标签文字、文件名、URL 词、tags、描述、alt 等任何元数据打分。',
        '请快速做三路判断：字面义、文化象征、隐喻/习语联想。',
        '使用锚点标尺：0.00 无关；0.15 弱象征/弱主题；0.33 宽泛语境相关；0.50 同交互域；0.70 直接功能关联；0.85 核心概念关联；1.00 近同义/固定绑定。',
        '校准示例：button-apple 约 0.33；button-keyboard 约 0.50；button-light switch 约 0.70；button-选择 约 0.85。',
        '一致性示例：当标签是“音乐”时，“灭火器”通常应为低分（约 0.10-0.25），除非存在明确警报声/音频语境；不要因物体显著性而虚高。',
        '高于 0.65 的分数必须满足“标签词与图像概念之间有直接功能或规范绑定”。',
        'reason 必须明确写出“标签词 -> 图像概念”的桥接路径，不能只描述图像本身。',
        '不要把结果都压在 0.15-0.35 的窄区间，需按关联强弱拉开分数。',
        '不要过度字面化；若存在稳定的文化或隐喻关联，不得直接判为 0。',
        '还要检查复合词与固定搭配，尤其是文化实践中的器物专名（例如：茶+刀 -> 茶刀/普洱茶刀）。',
        '若存在这类可考据关联，请给非零的弱到中等分，不要近似清零。',
        '若可见证据不足，请将分数控制在 0.00-0.20，并简短说明不确定。',
        '仅返回最小化 JSON：{"score":0.00,"reason":"..."}。',
        'reason 必须是 2 到 3 句短句，说明语义场/语词联想路径。',
        '禁止出现百分比、置信度、以及“所以我认为”之类措辞。',
        `用户标签：${input.label}`,
    ].join(' ');
};
const toDataUrl = async (imageUrl) => {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok)
            return null;
        const blob = await response.blob();
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(typeof reader.result === 'string' ? reader.result : null);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    }
    catch {
        return null;
    }
};
const parseSingleScore = (payload, card) => {
    if (!payload || typeof payload !== 'object')
        return null;
    const directScore = payload.score;
    if (typeof directScore === 'number')
        return clamp01(directScore);
    if (typeof directScore === 'string') {
        const value = Number.parseFloat(directScore);
        if (Number.isFinite(value))
            return clamp01(value);
    }
    const directScores = payload.scores;
    if (directScores && typeof directScores === 'object') {
        const raw = directScores[card.id];
        if (typeof raw === 'number')
            return clamp01(raw);
        if (typeof raw === 'string') {
            const value = Number.parseFloat(raw);
            if (Number.isFinite(value))
                return clamp01(value);
        }
    }
    const choices = payload.choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim())
        return null;
    const parsed = parseJsonFromText(content);
    const parsedScore = parsed?.score;
    if (typeof parsedScore === 'number')
        return clamp01(parsedScore);
    if (typeof parsedScore === 'string') {
        const value = Number.parseFloat(parsedScore);
        if (Number.isFinite(value))
            return clamp01(value);
    }
    const parsedScores = parsed?.scores;
    if (parsedScores && typeof parsedScores === 'object') {
        const raw = parsedScores[card.id];
        if (typeof raw === 'number')
            return clamp01(raw);
        if (typeof raw === 'string') {
            const value = Number.parseFloat(raw);
            if (Number.isFinite(value))
                return clamp01(value);
        }
    }
    return null;
};
export const requestRealityCardMatch = async (input) => {
    const { config, label, card, isZh } = input;
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    const prompt = buildSingleCardPrompt({ label: trimmed, isZh, card });
    const imageDataUrl = await toDataUrl(card.imageUrl);
    const imagePayload = imageDataUrl || card.imageUrl;
    const endpoints = config.mode === 'proxy-endpoint'
        ? buildProxyEndpointCandidates(config.endpoint)
        : [config.endpoint];
    for (let index = 0; index < config.models.length; index += 1) {
        const model = config.models[index];
        if (!model)
            continue;
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imagePayload } },
                ],
            },
        ];
        const body = JSON.stringify({
            model,
            messages,
            temperature: 0,
            siteUrl: config.siteUrl,
            title: config.title,
        });
        for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
            const endpoint = endpoints[endpointIndex] || config.endpoint;
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: buildRequestHeaders(config),
                    body,
                });
                if (!response.ok)
                    continue;
                const payload = await response.json();
                const score = parseSingleScore(payload, card);
                if (score == null)
                    continue;
                return {
                    score,
                    reason: parseReason(payload),
                    model,
                };
            }
            catch {
                // try next endpoint or model candidate
            }
        }
    }
    return null;
};
export const requestRealityLabelMatch = async (input) => {
    const { config, label, cards, isZh } = input;
    const trimmed = label.trim();
    if (!trimmed)
        return null;
    const prompt = buildPrompt({ label: trimmed, isZh, cards });
    const endpoints = config.mode === 'proxy-endpoint'
        ? buildProxyEndpointCandidates(config.endpoint)
        : [config.endpoint];
    for (let index = 0; index < config.models.length; index += 1) {
        const model = config.models[index];
        if (!model)
            continue;
        const messages = [
            {
                role: 'user',
                content: [{ type: 'text', text: prompt }],
            },
        ];
        const body = JSON.stringify({
            model,
            messages,
            temperature: 0,
            siteUrl: config.siteUrl,
            title: config.title,
        });
        for (let endpointIndex = 0; endpointIndex < endpoints.length; endpointIndex += 1) {
            const endpoint = endpoints[endpointIndex] || config.endpoint;
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: buildRequestHeaders(config),
                    body,
                });
                if (!response.ok)
                    continue;
                const payload = await response.json();
                const scores = parseScores(payload, cards);
                if (!scores)
                    continue;
                return {
                    scores,
                    reason: parseReason(payload),
                    model,
                };
            }
            catch {
                // try next endpoint or model candidate
            }
        }
    }
    return null;
};

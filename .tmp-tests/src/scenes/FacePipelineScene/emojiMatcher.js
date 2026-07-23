const DEFAULT_MODEL = 'deepseek/deepseek-chat-v3.1:free';
const DEFAULT_FALLBACK_MODEL = 'moonshotai/kimi-k2:free';
export const extractEmojiFromText = (text) => {
    if (!text)
        return null;
    const match = text.match(/(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u);
    return match?.[1] || null;
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
        // keep trying fallback slicing
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
        try {
            const sliced = JSON.parse(text.slice(start, end + 1));
            if (sliced && typeof sliced === 'object')
                return sliced;
        }
        catch {
            return null;
        }
    }
    return null;
};
export const parseEmojiFromChatResponse = (payload) => {
    if (!payload || typeof payload !== 'object')
        return null;
    const directEmoji = payload.emoji;
    if (typeof directEmoji === 'string') {
        return extractEmojiFromText(directEmoji) || null;
    }
    const choices = payload.choices;
    const content = choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim())
        return null;
    const parsed = parseJsonFromText(content);
    const parsedEmoji = parsed?.emoji;
    if (typeof parsedEmoji === 'string') {
        return extractEmojiFromText(parsedEmoji) || null;
    }
    return extractEmojiFromText(content);
};
export const pickModelCandidates = (primary, fallback) => {
    const output = [];
    const insert = (value) => {
        const next = (value || '').trim();
        if (!next || output.includes(next))
            return;
        output.push(next);
    };
    insert(primary);
    insert(fallback);
    if (!output.length) {
        output.push(DEFAULT_MODEL, DEFAULT_FALLBACK_MODEL);
        return output;
    }
    if (output.length === 1 && output[0] !== DEFAULT_FALLBACK_MODEL) {
        output.push(DEFAULT_FALLBACK_MODEL);
    }
    return output;
};
export const resolveChatapConfig = (input) => {
    const chatap = input.chatap.trim();
    const models = pickModelCandidates(input.model, input.fallbackModel);
    if (!chatap) {
        const endpoint = (input.fallbackEndpoint || '').trim();
        if (!endpoint)
            return null;
        return {
            mode: 'proxy-endpoint',
            endpoint,
            models,
            siteUrl: input.siteUrl,
            title: input.title,
        };
    }
    if (chatap.startsWith('http://') || chatap.startsWith('https://')) {
        return {
            mode: 'proxy-endpoint',
            endpoint: chatap,
            models,
            siteUrl: input.siteUrl,
            title: input.title,
        };
    }
    return {
        mode: 'direct-openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        secret: chatap,
        models,
        siteUrl: input.siteUrl,
        title: input.title,
    };
};
export const buildEmojiPrompt = (isZh) => {
    const base = 'You are a strict vision validator for expression-to-emoji matching. ' +
        'Return minified JSON only with keys: emoji(string), confidence(0..1), reason(string). ' +
        'Pick exactly one most-likely emoji from this set: 😀 😄 😁 🙂 😐 😕 ☹️ 😢 😭 😠 😮 😲 🤔 😴 😎 🤫 👍 🤞 😛.';
    if (!isZh) {
        return `${base} Do not output any extra text.`;
    }
    return `${base} 中文场景优先识别当前表情最像的 emoji，不要输出多余文本。`;
};
export const requestEmojiMatch = async (input) => {
    const { config, imageDataUrl, isZh } = input;
    const prompt = buildEmojiPrompt(isZh);
    for (let index = 0; index < config.models.length; index += 1) {
        const model = config.models[index];
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
            },
        ];
        const headers = {
            'Content-Type': 'application/json',
        };
        if (config.mode === 'direct-openrouter') {
            headers.Authorization = `Bearer ${config.secret || ''}`;
            headers['HTTP-Referer'] = config.siteUrl;
            headers['X-Title'] = config.title;
        }
        const body = JSON.stringify({
            model,
            messages,
            temperature: 0,
            // Proxy mode can ignore or use these fields if forwarding to OpenRouter.
            siteUrl: config.siteUrl,
            title: config.title,
        });
        try {
            const response = await fetch(config.endpoint, {
                method: 'POST',
                headers,
                body,
            });
            if (!response.ok) {
                continue;
            }
            const payload = await response.json();
            const emoji = parseEmojiFromChatResponse(payload);
            if (emoji) {
                return emoji;
            }
        }
        catch {
            // try next model candidate
        }
    }
    return null;
};

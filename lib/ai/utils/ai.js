"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataSearch = exports.rollingAiSummary = exports.numCharsToWords = exports.getNumTokens = void 0;
const gpt_3_token_count_1 = require("gpt-3-token-count");
const types_1 = require("../types");
const TextSplitter_1 = require("./TextSplitter");
const singletons_1 = require("./singletons");
const getNumTokens = (o) => {
    if (typeof o === "string") {
        return (0, exports.getNumTokens)([{ role: "assistant", content: o }]);
    }
    const str = o.map((o) => `Role: ${o.role}\n${o.content}`).join("\n");
    // Add a little extra because it's just an estimate.
    return Math.ceil((0, gpt_3_token_count_1.count)(str) * 1.1);
};
exports.getNumTokens = getNumTokens;
const numCharsToWords = (numChars) => {
    return Math.ceil(numChars / 7);
};
exports.numCharsToWords = numCharsToWords;
const rollingAiSummary = async ({ messages, prompt, maxCharacters, }) => {
    prompt = prompt || "";
    const model = "gpt-3.5-turbo";
    const chunkSize = 1000;
    const contentChunkPlaceholder = "CHUNK_PLACEHOLDER";
    const initialPrompt = `
START_CONTENTS
${contentChunkPlaceholder}
END_CONTENTS

Summarize the contents in ${(0, exports.numCharsToWords)(maxCharacters)} words.
${prompt}
  `.trim();
    const rollingSummaryPlaceholder = "ROLLING_SUMMARY_PLACEHOLDER";
    const rollingPrompt = `
START_CONTENTS
${rollingSummaryPlaceholder}

${contentChunkPlaceholder}
END_CONTENTS

Summarize the contents in ${(0, exports.numCharsToWords)(maxCharacters)} words.
${prompt}
  `.trim();
    const chunks = (await Promise.all(messages.map(async (o) => {
        const chunks = await (0, singletons_1.textSplitterService)().getChunks({
            textSplitter: (0, TextSplitter_1.markdownSplitter)(),
            maxTokenSize: chunkSize,
            text: o,
        });
        // Add a line break after the very last chunk in a data source so
        // there's a bit clearer of a separation between one data source and
        // the next.
        chunks[chunks.length - 1] = chunks[chunks.length - 1] + "\n\n";
        return chunks;
    }))).flat();
    let rollingSummary = "";
    while (chunks.length) {
        const chunksToUse = [];
        while (chunks.length) {
            const prompt = (rollingSummary ? rollingPrompt : initialPrompt)
                .replace(rollingSummaryPlaceholder, rollingSummary)
                .replace(contentChunkPlaceholder, chunksToUse.concat(chunks[0]).join("").trim());
            if ((0, exports.getNumTokens)(prompt) > types_1.OpenAiModelLimits[model].maxTokens - maxCharacters) {
                break;
            }
            chunksToUse.push(chunks.shift());
        }
        const prompt = (rollingSummary ? rollingPrompt : initialPrompt)
            .replace(rollingSummaryPlaceholder, rollingSummary)
            .replace(contentChunkPlaceholder, chunksToUse.join("").trim());
        const o = await (0, singletons_1.openAiService)().createChatCompletion({
            messages: [{ role: "user", content: prompt }],
            model,
            maxTokens: types_1.OpenAiModelLimits[model].maxTokens - (0, exports.getNumTokens)(prompt),
        });
        rollingSummary = o.response.trim();
    }
    return rollingSummary;
};
exports.rollingAiSummary = rollingAiSummary;
const dataSearch = async ({ messages, prompt, maxCharacters, }) => {
    const model = "gpt-3.5-turbo-16k";
    const maxChunkSize = 1000;
    const systemMessageTemplate = `
START_DATA_SOURCES
{DATA_SOURCES}
END_DATA_SOURCES

START_PROMPT
${prompt}
END_PROMPT

Using only the data sources, answer the prompt in ${maxCharacters} characters or less.
          `.trim();
    const getSortedChunks = async () => {
        // If the total number of tokens is less than the max tokens, we can just
        // return the whole thing.
        const systemMessageWithEntireDataSources = systemMessageTemplate.replace("{DATA_SOURCES}", messages.join("\n\n"));
        if ((0, exports.getNumTokens)(systemMessageWithEntireDataSources) < types_1.OpenAiModelLimits[model].maxTokens - maxCharacters) {
            return [{ chunk: messages.join("\n\n"), score: 1 }];
        }
        const chunkedDocs = [];
        for (const o of messages) {
            const chunks = await (0, singletons_1.textSplitterService)().getChunks({
                textSplitter: (0, TextSplitter_1.markdownSplitter)(),
                maxTokenSize: maxChunkSize,
                text: o,
            });
            chunkedDocs.push(...chunks);
        }
        const stringsToEmbed = [prompt, ...chunkedDocs];
        const embeddingsResponse = await (0, singletons_1.embeddingService)().getEmbeddings(stringsToEmbed);
        const [promptEmbedding, ...chunkedDocsEmbeddings] = embeddingsResponse.embeddings;
        const scores = await (0, singletons_1.embeddingService)().getSearchScores(promptEmbedding, chunkedDocsEmbeddings);
        return chunkedDocs.map((chunk, i) => ({ chunk, score: scores[i] })).sort((a, b) => b.score - a.score);
    };
    const chunkedDocs = [];
    for (const o of messages) {
        const chunks = await (0, singletons_1.textSplitterService)().getChunks({
            textSplitter: (0, TextSplitter_1.markdownSplitter)(),
            maxTokenSize: maxChunkSize,
            text: o,
        });
        chunkedDocs.push(...chunks);
    }
    const chunkedDocsByScore = await getSortedChunks();
    const maxInputTokens = types_1.OpenAiModelLimits[model].maxTokens - maxCharacters;
    const chunks = [];
    let remainingTokens = maxInputTokens;
    for (const o of chunkedDocsByScore) {
        if ((0, exports.getNumTokens)(o.chunk) > remainingTokens)
            continue;
        const systemMessage = systemMessageTemplate.replace("{DATA_SOURCES}", chunks
            .concat(o)
            .map((o) => o.chunk)
            .join("\n\n"));
        const numTokens = (0, exports.getNumTokens)(systemMessage);
        if (numTokens > maxInputTokens)
            continue;
        remainingTokens = maxInputTokens - numTokens;
        chunks.push(o);
    }
    const systemMessage = systemMessageTemplate.replace("{DATA_SOURCES}", chunks.map((o) => o.chunk).join("\n\n"));
    const response = await (0, singletons_1.openAiService)().createChatCompletion({
        messages: [{ role: "user", content: systemMessage }],
        model,
        maxTokens: maxCharacters,
    });
    return response.response;
};
exports.dataSearch = dataSearch;
//# sourceMappingURL=ai.js.map
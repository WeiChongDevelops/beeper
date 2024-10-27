import { count } from "gpt-3-token-count";
import { OpenAiMessage } from "../services/open_ai/OpenAiService";
import { ChatModel, OpenAiModelLimits } from "../types";
import { markdownSplitter } from "./TextSplitter";
import { embeddingService, openAiService, textSplitterService } from "./singletons";

export const getNumTokens = (o: string | OpenAiMessage[]) => {
    if (typeof o === "string") {
        return getNumTokens([{ role: "assistant", content: o }]);
    }
    const str = o.map((o) => `Role: ${o.role}\n${o.content}`).join("\n");
    // Add a little extra because it's just an estimate.
    return Math.ceil(count(str) * 1.1);
};

export const numCharsToWords = (numChars: number) => {
    return Math.ceil(numChars / 7);
};

export const rollingAiSummary = async ({
    messages,
    prompt,
    maxCharacters,
}: {
    messages: string[];
    prompt?: string;
    maxCharacters: number;
}) => {
    prompt = prompt || "";
    const model: ChatModel = "gpt-3.5-turbo";
    const chunkSize = 1000;
    const contentChunkPlaceholder = "CHUNK_PLACEHOLDER";
    const initialPrompt = `
START_CONTENTS
${contentChunkPlaceholder}
END_CONTENTS

Summarize the contents in ${numCharsToWords(maxCharacters)} words.
${prompt}
  `.trim();
    const rollingSummaryPlaceholder = "ROLLING_SUMMARY_PLACEHOLDER";
    const rollingPrompt = `
START_CONTENTS
${rollingSummaryPlaceholder}

${contentChunkPlaceholder}
END_CONTENTS

Summarize the contents in ${numCharsToWords(maxCharacters)} words.
${prompt}
  `.trim();

    const chunks = (
        await Promise.all(
            messages.map(async (o) => {
                const chunks = await textSplitterService().getChunks({
                    textSplitter: markdownSplitter(),
                    maxTokenSize: chunkSize,
                    text: o,
                });
                // Add a line break after the very last chunk in a data source so
                // there's a bit clearer of a separation between one data source and
                // the next.
                chunks[chunks.length - 1] = chunks[chunks.length - 1] + "\n\n";
                return chunks;
            }),
        )
    ).flat();

    let rollingSummary = "";
    while (chunks.length) {
        const chunksToUse: string[] = [];
        while (chunks.length) {
            const prompt = (rollingSummary ? rollingPrompt : initialPrompt)
                .replace(rollingSummaryPlaceholder, rollingSummary)
                .replace(contentChunkPlaceholder, chunksToUse.concat(chunks[0]).join("").trim());
            if (getNumTokens(prompt) > OpenAiModelLimits[model].maxTokens - maxCharacters) {
                break;
            }
            chunksToUse.push(chunks.shift());
        }
        const prompt = (rollingSummary ? rollingPrompt : initialPrompt)
            .replace(rollingSummaryPlaceholder, rollingSummary)
            .replace(contentChunkPlaceholder, chunksToUse.join("").trim());
        const o = await openAiService().createChatCompletion({
            messages: [{ role: "user", content: prompt }],
            model,
            maxTokens: OpenAiModelLimits[model].maxTokens - getNumTokens(prompt),
        });

        rollingSummary = o.response.trim();
    }

    return rollingSummary;
};

export const dataSearch = async ({
    messages,
    prompt,
    maxCharacters,
}: {
    messages: string[];
    prompt: string;
    maxCharacters: number;
}) => {
    const model: ChatModel = "gpt-3.5-turbo-16k";
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
        const systemMessageWithEntireDataSources = systemMessageTemplate.replace(
            "{DATA_SOURCES}",
            messages.join("\n\n"),
        );
        if (getNumTokens(systemMessageWithEntireDataSources) < OpenAiModelLimits[model].maxTokens - maxCharacters) {
            return [{ chunk: messages.join("\n\n"), score: 1 }];
        }

        const chunkedDocs: string[] = [];
        for (const o of messages) {
            const chunks = await textSplitterService().getChunks({
                textSplitter: markdownSplitter(),
                maxTokenSize: maxChunkSize,
                text: o,
            });
            chunkedDocs.push(...chunks);
        }

        const stringsToEmbed = [prompt, ...chunkedDocs];
        const embeddingsResponse = await embeddingService().getEmbeddings(stringsToEmbed);
        const [promptEmbedding, ...chunkedDocsEmbeddings] = embeddingsResponse.embeddings;
        const scores = await embeddingService().getSearchScores(promptEmbedding, chunkedDocsEmbeddings);

        return chunkedDocs.map((chunk, i) => ({ chunk, score: scores[i] })).sort((a, b) => b.score - a.score);
    };

    const chunkedDocs: string[] = [];
    for (const o of messages) {
        const chunks = await textSplitterService().getChunks({
            textSplitter: markdownSplitter(),
            maxTokenSize: maxChunkSize,
            text: o,
        });
        chunkedDocs.push(...chunks);
    }

    const chunkedDocsByScore = await getSortedChunks();

    const maxInputTokens = OpenAiModelLimits[model].maxTokens - maxCharacters;

    const chunks: { score: number; chunk: string }[] = [];
    let remainingTokens = maxInputTokens;
    for (const o of chunkedDocsByScore) {
        if (getNumTokens(o.chunk) > remainingTokens) continue;
        const systemMessage = systemMessageTemplate.replace(
            "{DATA_SOURCES}",
            chunks
                .concat(o)
                .map((o) => o.chunk)
                .join("\n\n"),
        );
        const numTokens = getNumTokens(systemMessage);
        if (numTokens > maxInputTokens) continue;
        remainingTokens = maxInputTokens - numTokens;
        chunks.push(o);
    }

    const systemMessage = systemMessageTemplate.replace("{DATA_SOURCES}", chunks.map((o) => o.chunk).join("\n\n"));
    const response = await openAiService().createChatCompletion({
        messages: [{ role: "user", content: systemMessage }],
        model,
        maxTokens: maxCharacters,
    });

    return response.response;
};

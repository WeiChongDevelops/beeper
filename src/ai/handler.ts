import { AiOperationArgs } from "./types";
import { dataSearch, rollingAiSummary } from "./utils/ai";
import { openAiService, setApiKey, urlScraperService } from "./utils/singletons";

export const handleAiOperation = async (args: AiOperationArgs) => {
    switch (args.type) {
        case "setApiKey": {
            setApiKey(args.key);
            return;
        }
        case "Prompt": {
            const result = await openAiService().createChatCompletion({
                messages: [{ role: "user", content: args.prompt }],
                model: args.model,
                maxTokens: args.maxResponseTokens,
            });
            return result.response;
        }
        case "ChatSearch":
            return await dataSearch({
                messages: args.messages,
                prompt: args.prompt,
                maxCharacters: 500,
            });
        case "ChatSummary": {
            return await rollingAiSummary({
                messages: args.messages,
                prompt: "The contents are a chat transcript",
                maxCharacters: 500,
            });
        }
        case "GoogleSearch": {
            const googleSearchResult = await openAiService().createChatCompletion({
                messages: [
                    {
                        role: "user",
                        content: `
START_PROMPT
${args.query}
END_PROMPT

Write a google search that will provide the necessary information to satisfy the prompt.
Just return what I should search for. Do not surround it with quotations.
                        `.trim(),
                    },
                ],
                model: "gpt-3.5-turbo",
                maxTokens: 100,
            });

            const url = `https://www.google.com/search?q=${encodeURIComponent(googleSearchResult.response)}`;
            const googleQueryResult = await urlScraperService().scrapeUrl(url);

            return dataSearch({
                messages: [googleQueryResult],
                prompt: args.query,
                maxCharacters: 500,
            });
        }
        case "urlPrompt": {
            const result = await urlScraperService().scrapeUrl(args.url);
            const response = await dataSearch({
                messages: [result],
                prompt: args.prompt,
                maxCharacters: 500,
            });
            return response;
        }
        case "urlSummary": {
            const result = await urlScraperService().scrapeUrl(args.url);
            return await rollingAiSummary({
                messages: [result],
                maxCharacters: args.maxCharacters,
            });
        }
    }
};

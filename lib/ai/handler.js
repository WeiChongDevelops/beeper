"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAiOperation = void 0;
const ai_1 = require("./utils/ai");
const singletons_1 = require("./utils/singletons");
const handleAiOperation = async (args) => {
    switch (args.type) {
        case "setApiKey": {
            (0, singletons_1.setApiKey)(args.key);
            return;
        }
        case "Prompt": {
            const result = await (0, singletons_1.openAiService)().createChatCompletion({
                messages: [{ role: "user", content: args.prompt }],
                model: args.model,
                maxTokens: args.maxResponseTokens,
            });
            return result.response;
        }
        case "ChatSearch":
            return await (0, ai_1.dataSearch)({
                messages: args.messages,
                prompt: args.prompt,
                maxCharacters: 500,
            });
        case "ChatSummary": {
            return await (0, ai_1.rollingAiSummary)({
                messages: args.messages,
                prompt: "The contents are a chat transcript",
                maxCharacters: 500,
            });
        }
        case "GoogleSearch": {
            const googleSearchResult = await (0, singletons_1.openAiService)().createChatCompletion({
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
            const googleQueryResult = await (0, singletons_1.urlScraperService)().scrapeUrl(url);
            return (0, ai_1.dataSearch)({
                messages: [googleQueryResult],
                prompt: args.query,
                maxCharacters: 500,
            });
        }
        case "urlPrompt": {
            const result = await (0, singletons_1.urlScraperService)().scrapeUrl(args.url);
            const response = await (0, ai_1.dataSearch)({
                messages: [result],
                prompt: args.prompt,
                maxCharacters: 500,
            });
            return response;
        }
        case "urlSummary": {
            const result = await (0, singletons_1.urlScraperService)().scrapeUrl(args.url);
            return await (0, ai_1.rollingAiSummary)({
                messages: [result],
                maxCharacters: args.maxCharacters,
            });
        }
    }
};
exports.handleAiOperation = handleAiOperation;
//# sourceMappingURL=handler.js.map
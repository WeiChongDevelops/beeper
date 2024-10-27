"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatingAiService = void 0;
const types_1 = require("../../types");
const ai_1 = require("../../utils/ai");
const OpenAiService_1 = require("./OpenAiService");
const ProxyOpenAiService_1 = require("./ProxyOpenAiService");
class ValidatingAiService extends ProxyOpenAiService_1.ProxyOpenAiService {
    createChatCompletion(args) {
        const maxTokens = args.maxTokens;
        const numTokens = (0, ai_1.getNumTokens)(args.messages) + maxTokens;
        const model = args?.model || OpenAiService_1.DefaultChatModel;
        if (numTokens > types_1.OpenAiModelLimits[model].maxTokens) {
            throw new Error(`Too many tokens (${numTokens}) in AI chat`);
        }
        return super.createChatCompletion(args);
    }
}
exports.ValidatingAiService = ValidatingAiService;
//# sourceMappingURL=ValidatingOpenAiService.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SdkOpenAiService = void 0;
const compute_cosine_similarity_1 = __importDefault(require("compute-cosine-similarity"));
const singletons_1 = require("../../utils/singletons");
const OpenAiService_1 = require("./OpenAiService");
class SdkOpenAiService {
    async getEmbeddings(a) {
        const o = await (0, singletons_1.openAi)().createEmbedding({
            input: a,
            model: "text-embedding-ada-002",
        });
        const ret = o.data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
        return {
            embeddings: ret,
            cost: {
                inputTokens: Math.ceil(o.data.usage.prompt_tokens),
                outputTokens: Math.ceil(o.data.usage.total_tokens - o.data.usage.prompt_tokens),
            },
        };
    }
    async getSearchScores(query, toScore) {
        return toScore.map((ts) => {
            const n = (0, compute_cosine_similarity_1.default)(query, ts);
            return n;
        });
    }
    async createChatCompletion(args) {
        const model = args.model || OpenAiService_1.DefaultChatModel;
        const maxTokens = args.maxTokens;
        const temperature = args?.temperature ?? 0;
        const response = await (0, singletons_1.openAi)().createChatCompletion({
            model,
            messages: args.messages,
            max_tokens: maxTokens,
            temperature,
        });
        const responseText = response.data.choices?.[0]?.message?.content?.trim() || "";
        return {
            response: responseText,
            cost: {
                inputTokens: Math.ceil(response.data.usage.prompt_tokens),
                outputTokens: Math.ceil(response.data.usage.completion_tokens),
            },
        };
    }
}
exports.SdkOpenAiService = SdkOpenAiService;
//# sourceMappingURL=SdkOpenAiService.js.map
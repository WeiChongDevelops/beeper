import similarity from "compute-cosine-similarity";
import { openAi } from "../../utils/singletons";
import { Embedding, EmbeddingsResponse } from "../embedding/EmbeddingService";
import { ChatCompletionResponse, DefaultChatModel, OpenAiChatCompletionArgs, OpenAiService } from "./OpenAiService";

export class SdkOpenAiService implements OpenAiService {
    async getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        const o = await openAi().createEmbedding({
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
    async getSearchScores(query: Embedding, toScore: Embedding[]): Promise<number[]> {
        return toScore.map((ts) => {
            const n = similarity(query, ts);
            return n;
        });
    }
    async createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        const model = args.model || DefaultChatModel;
        const maxTokens = args.maxTokens;
        const temperature = args?.temperature ?? 0;

        const response = await openAi().createChatCompletion({
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

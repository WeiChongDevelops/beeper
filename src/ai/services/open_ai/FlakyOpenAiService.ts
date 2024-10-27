import { EmbeddingsResponse } from "../embedding/EmbeddingService";
import { ChatCompletionResponse, OpenAiChatCompletionArgs, OpenAiService } from "./OpenAiService";
import { ProxyOpenAiService } from "./ProxyOpenAiService";

// For testing only!
export class FlakyOpenAiService extends ProxyOpenAiService {
    constructor(
        readonly errorRate: number,
        delegate: OpenAiService,
    ) {
        super(delegate);
    }
    createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        if (Math.random() < this.errorRate) {
            throw new Error("Random error");
        }
        return super.createChatCompletion(args);
    }
    getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        if (Math.random() < this.errorRate) {
            throw new Error("Random error");
        }
        return super.getEmbeddings(a);
    }
}

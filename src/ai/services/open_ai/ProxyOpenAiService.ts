import { Embedding, EmbeddingsResponse } from "../embedding/EmbeddingService";
import { ChatCompletionResponse, OpenAiChatCompletionArgs, OpenAiService } from "./OpenAiService";

export class ProxyOpenAiService implements OpenAiService {
    delegate: OpenAiService;
    constructor(delegate: OpenAiService) {
        this.delegate = delegate;
    }
    getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        return this.delegate.getEmbeddings(a);
    }
    getSearchScores(query: Embedding, toScore: Embedding[]): Promise<number[]> {
        return this.delegate.getSearchScores(query, toScore);
    }
    createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        return this.delegate.createChatCompletion(args);
    }
}

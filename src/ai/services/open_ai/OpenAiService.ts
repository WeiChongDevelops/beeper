import { ChatModel } from "../../types";
import { EmbeddingService } from "../embedding/EmbeddingService";

export const DefaultChatModel: ChatModel = "gpt-3.5-turbo";

export type OpenAiMessage = {
    role: "user" | "system" | "assistant";
    content: string;
};

export type OpenAiChatCompletionArgs = {
    messages: OpenAiMessage[];
    model?: ChatModel;
    maxTokens: number;
    temperature?: number;
};

export type ChatCompletionResponse = {
    response: string;
    cost: {
        inputTokens: number;
        outputTokens: number;
    };
};

export interface OpenAiService extends EmbeddingService {
    createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse>;
}

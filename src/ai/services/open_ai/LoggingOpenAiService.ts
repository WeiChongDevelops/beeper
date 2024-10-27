import { EmbeddingsResponse } from "../embedding/EmbeddingService";
import { ChatCompletionResponse, OpenAiChatCompletionArgs } from "./OpenAiService";
import { ProxyOpenAiService } from "./ProxyOpenAiService";

export class LoggingOpenAiService extends ProxyOpenAiService {
    async createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        const { messages, ...options } = args;
        console.info(
            `AI chat: ${messages
                .map((m) =>
                    `
Role: ${m.role}
${m.content}
      `.trim(),
                )
                .join("\n\n")}`,
        );
        console.info(`AI options: ${JSON.stringify(options)}`);
        try {
            const response = await super.createChatCompletion(args);
            console.info(`AI response: ${response.response}`);
            console.info(`AI usage: ${JSON.stringify(response.cost)}`);
            return response;
        } catch (e) {
            console.error(JSON.stringify(e, null, 2));
            console.error(`AI error: ${e}`);
            throw e;
        }
    }
    async getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        console.info(
            `AI embeddings: num: ${a.length} largest: ${a.reduce((a, b) => (a.length > b.length ? a : b)).length}}`,
        );
        try {
            const response = await super.getEmbeddings(a);
            console.info(`AI embeddings response received. Usage: ${JSON.stringify(response.cost)}}`);
            return response;
        } catch (e) {
            console.error(`AI embeddings error: ${e}`);
            throw e;
        }
    }
}
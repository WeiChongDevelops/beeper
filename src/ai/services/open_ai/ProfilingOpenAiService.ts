import { ChatCompletionResponse, OpenAiChatCompletionArgs } from "./OpenAiService";
import { ProxyOpenAiService } from "./ProxyOpenAiService";

export class ProfilingOpenAiService extends ProxyOpenAiService {
    async createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        const timingId = `createChatCompletion ${Date.now()}`;
        console.time(timingId);
        try {
            return await super.createChatCompletion(args);
        } finally {
            console.timeEnd(timingId);
        }
    }
}

import { OpenAiModelLimits } from "../../types";
import { getNumTokens } from "../../utils/ai";
import { ChatCompletionResponse, DefaultChatModel, OpenAiChatCompletionArgs } from "./OpenAiService";
import { ProxyOpenAiService } from "./ProxyOpenAiService";

export class ValidatingAiService extends ProxyOpenAiService {
    createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        const maxTokens = args.maxTokens;
        const numTokens = getNumTokens(args.messages) + maxTokens;
        const model = args?.model || DefaultChatModel;
        if (numTokens > OpenAiModelLimits[model].maxTokens) {
            throw new Error(`Too many tokens (${numTokens}) in AI chat`);
        }
        return super.createChatCompletion(args);
    }
}

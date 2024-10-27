import { EmbeddingsResponse } from "../embedding/EmbeddingService";
import { ChatCompletionResponse, OpenAiChatCompletionArgs } from "./OpenAiService";
import { ProxyOpenAiService } from "./ProxyOpenAiService";

const MAX_FAILURES = 5;

export class RetryingOpenAiService extends ProxyOpenAiService {
    async createChatCompletion(args: OpenAiChatCompletionArgs): Promise<ChatCompletionResponse> {
        let failures = 0;
        while (failures < MAX_FAILURES) {
            try {
                return await super.createChatCompletion(args);
            } catch (e) {
                console.error(JSON.stringify(e, null, 2));
                failures++;

                if (failures >= MAX_FAILURES) {
                    console.error(`createChatCompletion Failure #${failures}. Giving up. Error: ${e}`);
                    throw e;
                }

                const waitMs = 2 ** failures * 1000;
                console.error(
                    `createChatCompletion Failure #${failures}. Waiting ${waitMs}ms before retrying. Error: ${e}`,
                );
                await new Promise((r) => setTimeout(r, waitMs));
            }
        }
        // This shouldn't happen but it shuts up TS.
        throw new Error("createChatCompletion failed unexpectedly");
    }
    async getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        let failures = 0;
        while (failures < MAX_FAILURES) {
            try {
                return await super.getEmbeddings(a);
            } catch (e) {
                failures++;

                if (failures >= MAX_FAILURES) {
                    console.error(`getEmbeddings Failure #${failures}. Giving up. Error: ${e}`);
                    throw e;
                }

                const waitMs = 2 ** failures * 1000;
                console.error(`getEmbeddings Failure #${failures}. Waiting ${waitMs}ms before retrying. Error: ${e}`);
                await new Promise((r) => setTimeout(r, waitMs));
            }
        }
        // This shouldn't happen but it shuts up TS.
        throw new Error("createChatCompletion failed unexpectedly");
    }
}

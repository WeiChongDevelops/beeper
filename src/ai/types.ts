export type ChatModel = "gpt-3.5-turbo" | "gpt-3.5-turbo-16k";

export type AiOperationArgs =
    | {
          type: "Prompt";
          prompt: string;
          model: ChatModel;
          maxResponseTokens: number;
      }
    | {
          type: "ChatSearch";
          messages: string[];
          prompt: string;
      }
    | {
          type: "ChatSummary";
          messages: string[];
      }
    | {
          type: "GoogleSearch";
          query: string;
      }
    | {
          type: "urlPrompt";
          url: string;
          prompt: string;
      }
    | {
          type: "urlSummary";
          url: string;
          maxCharacters: number;
      }
    | {
          type: "setApiKey";
          key: string;
      };

export const OpenAiModelLimits: Record<ChatModel, { maxTokens: number }> = {
    "gpt-3.5-turbo": {
        maxTokens: 4000,
    },
    "gpt-3.5-turbo-16k": {
        maxTokens: 16000,
    },
};

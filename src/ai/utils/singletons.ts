import { Configuration, OpenAIApi } from "openai";
import { ChunkingEmbeddingService } from "../services/embedding/ChunkingEmbeddingService";
import { EmbeddingService } from "../services/embedding/EmbeddingService";
import { InMemoryCachedEmbeddingService } from "../services/embedding/InMemoryCachedEmbeddingService";
import { LoggingOpenAiService } from "../services/open_ai/LoggingOpenAiService";
import { OpenAiService } from "../services/open_ai/OpenAiService";
import { ProfilingOpenAiService } from "../services/open_ai/ProfilingOpenAiService";
import { RetryingOpenAiService } from "../services/open_ai/RetryingOpenAiService";
import { SdkOpenAiService } from "../services/open_ai/SdkOpenAiService";
import { ValidatingAiService } from "../services/open_ai/ValidatingOpenAiService";
import { InMemoryCachingTextSplitterService } from "../services/text_splitter/InMemoryCachingTextSplitterService";
import { TextSplitterService } from "../services/text_splitter/TextSplitterService";
import { TextSplitterTextSplitterService } from "../services/text_splitter/TextSplitterTextSplitterService";
import { HtmlToTextUrlScraperService } from "../services/url_scraper/HtmlToTextUrlScraperService";
import { LoggingUrlScraperService } from "../services/url_scraper/LoggingUrlScraperService";
import { ReadabilityUrlScraperService } from "../services/url_scraper/ReadabilityUrlScraperService";
import { RegexRoutingUrlScraperService } from "../services/url_scraper/RegexRoutingUrlScraperService";
import { UrlScraperService } from "../services/url_scraper/UrlScraperService";
import { YoutubeScriptUrlScraperService } from "../services/url_scraper/YoutubeScriptUrlScraperService";
import { memoize } from "./memoize";

export function setApiKey(apiKey: string) {
    openAi = memoize(() => {
        const configuration = new Configuration({
            apiKey,
        });
        return new OpenAIApi(configuration);
    });
}

export let openAi = memoize(() => {
    // Dummy, replaced by when setApiKey is called.
    const configuration = new Configuration({});
    return new OpenAIApi(configuration);
});

export const openAiService = () => {
    let o: OpenAiService;
    o = new SdkOpenAiService();

    // Only use this when testing failures. Be sure to comment out before committing.
    // o = new FlakyOpenAiService(0.5, o);

    // TODO: Might be good to add this conditionally?
    o = new ProfilingOpenAiService(o);

    o = new RetryingOpenAiService(o);
    o = new ValidatingAiService(o);

    // TODO: Might be good to add this conditionally?
    o = new LoggingOpenAiService(o);

    return o;
};

export const embeddingService = memoize(() => {
    let o: EmbeddingService;
    o = openAiService();
    o = new ChunkingEmbeddingService(o);
    o = new InMemoryCachedEmbeddingService(o);
    return o;
});

export const textSplitterService = memoize(() => {
    let o: TextSplitterService;
    o = new TextSplitterTextSplitterService();
    o = new InMemoryCachingTextSplitterService(o);
    return o;
});

export const urlScraperService = memoize(() => {
    let o: UrlScraperService;
    o = new RegexRoutingUrlScraperService({
        routes: [
            [
                // eslint-disable-next-line max-len
                /(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})|(https?:\/\/)?(www\.)?(m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
                new YoutubeScriptUrlScraperService(),
            ],
            [/^https?:\/\/(www\.)?google\.com.*$/, new HtmlToTextUrlScraperService()],
            [/^https?:\/\/(www\.)?docs\.google\.com.*$/, new ReadabilityUrlScraperService()],
        ],
        default: new ReadabilityUrlScraperService(),
    });
    o = new LoggingUrlScraperService(o);
    return o;
});

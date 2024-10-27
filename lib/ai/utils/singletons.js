"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlScraperService = exports.textSplitterService = exports.embeddingService = exports.openAiService = exports.openAi = exports.setApiKey = void 0;
const openai_1 = require("openai");
const ChunkingEmbeddingService_1 = require("../services/embedding/ChunkingEmbeddingService");
const InMemoryCachedEmbeddingService_1 = require("../services/embedding/InMemoryCachedEmbeddingService");
const LoggingOpenAiService_1 = require("../services/open_ai/LoggingOpenAiService");
const ProfilingOpenAiService_1 = require("../services/open_ai/ProfilingOpenAiService");
const RetryingOpenAiService_1 = require("../services/open_ai/RetryingOpenAiService");
const SdkOpenAiService_1 = require("../services/open_ai/SdkOpenAiService");
const ValidatingOpenAiService_1 = require("../services/open_ai/ValidatingOpenAiService");
const InMemoryCachingTextSplitterService_1 = require("../services/text_splitter/InMemoryCachingTextSplitterService");
const TextSplitterTextSplitterService_1 = require("../services/text_splitter/TextSplitterTextSplitterService");
const HtmlToTextUrlScraperService_1 = require("../services/url_scraper/HtmlToTextUrlScraperService");
const LoggingUrlScraperService_1 = require("../services/url_scraper/LoggingUrlScraperService");
const ReadabilityUrlScraperService_1 = require("../services/url_scraper/ReadabilityUrlScraperService");
const RegexRoutingUrlScraperService_1 = require("../services/url_scraper/RegexRoutingUrlScraperService");
const YoutubeScriptUrlScraperService_1 = require("../services/url_scraper/YoutubeScriptUrlScraperService");
const memoize_1 = require("./memoize");
function setApiKey(apiKey) {
    exports.openAi = (0, memoize_1.memoize)(() => {
        const configuration = new openai_1.Configuration({
            apiKey,
        });
        return new openai_1.OpenAIApi(configuration);
    });
}
exports.setApiKey = setApiKey;
exports.openAi = (0, memoize_1.memoize)(() => {
    // Dummy, replaced by when setApiKey is called.
    const configuration = new openai_1.Configuration({});
    return new openai_1.OpenAIApi(configuration);
});
const openAiService = () => {
    let o;
    o = new SdkOpenAiService_1.SdkOpenAiService();
    // Only use this when testing failures. Be sure to comment out before committing.
    // o = new FlakyOpenAiService(0.5, o);
    // TODO: Might be good to add this conditionally?
    o = new ProfilingOpenAiService_1.ProfilingOpenAiService(o);
    o = new RetryingOpenAiService_1.RetryingOpenAiService(o);
    o = new ValidatingOpenAiService_1.ValidatingAiService(o);
    // TODO: Might be good to add this conditionally?
    o = new LoggingOpenAiService_1.LoggingOpenAiService(o);
    return o;
};
exports.openAiService = openAiService;
exports.embeddingService = (0, memoize_1.memoize)(() => {
    let o;
    o = (0, exports.openAiService)();
    o = new ChunkingEmbeddingService_1.ChunkingEmbeddingService(o);
    o = new InMemoryCachedEmbeddingService_1.InMemoryCachedEmbeddingService(o);
    return o;
});
exports.textSplitterService = (0, memoize_1.memoize)(() => {
    let o;
    o = new TextSplitterTextSplitterService_1.TextSplitterTextSplitterService();
    o = new InMemoryCachingTextSplitterService_1.InMemoryCachingTextSplitterService(o);
    return o;
});
exports.urlScraperService = (0, memoize_1.memoize)(() => {
    let o;
    o = new RegexRoutingUrlScraperService_1.RegexRoutingUrlScraperService({
        routes: [
            [
                // eslint-disable-next-line max-len
                /(https?:\/\/)?(www\.)?(m\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})|(https?:\/\/)?(www\.)?(m\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
                new YoutubeScriptUrlScraperService_1.YoutubeScriptUrlScraperService(),
            ],
            [/^https?:\/\/(www\.)?google\.com.*$/, new HtmlToTextUrlScraperService_1.HtmlToTextUrlScraperService()],
            [/^https?:\/\/(www\.)?docs\.google\.com.*$/, new ReadabilityUrlScraperService_1.ReadabilityUrlScraperService()],
        ],
        default: new ReadabilityUrlScraperService_1.ReadabilityUrlScraperService(),
    });
    o = new LoggingUrlScraperService_1.LoggingUrlScraperService(o);
    return o;
});
//# sourceMappingURL=singletons.js.map
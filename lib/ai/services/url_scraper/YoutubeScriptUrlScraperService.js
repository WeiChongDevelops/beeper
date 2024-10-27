"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeScriptUrlScraperService = void 0;
const youtube_transcript_1 = require("youtube-transcript");
class YoutubeScriptUrlScraperService {
    async scrapeUrl(url) {
        return (await youtube_transcript_1.YoutubeTranscript.fetchTranscript(url)).map((x) => x.text).join("\n");
    }
}
exports.YoutubeScriptUrlScraperService = YoutubeScriptUrlScraperService;
//# sourceMappingURL=YoutubeScriptUrlScraperService.js.map
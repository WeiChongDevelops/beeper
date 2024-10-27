import { YoutubeTranscript } from "youtube-transcript";
import { UrlScraperService } from "./UrlScraperService";

export class YoutubeScriptUrlScraperService implements UrlScraperService {
    async scrapeUrl(url: string): Promise<string> {
        return (await YoutubeTranscript.fetchTranscript(url)).map((x) => x.text).join("\n");
    }
}

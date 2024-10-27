import { applyReadabilityToHtml, curl } from "../../utils/html";
import { UrlScraperService } from "./UrlScraperService";

export class ReadabilityUrlScraperService implements UrlScraperService {
    async scrapeUrl(url: string): Promise<string> {
        const html = await curl(url);
        return await applyReadabilityToHtml(html);
    }
}

import { convert } from "html-to-text";
import { curl } from "../../utils/html";
import { UrlScraperService } from "./UrlScraperService";

export class HtmlToTextUrlScraperService implements UrlScraperService {
    async scrapeUrl(url: string): Promise<string> {
        const html = await curl(url);
        const text = convert(html, {
            selectors: [
                { selector: "a", options: { ignoreHref: true } },
                { selector: "img", format: "skip" },
            ],
        });
        return text;
    }
}

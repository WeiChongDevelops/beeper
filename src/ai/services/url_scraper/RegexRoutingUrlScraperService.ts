import { UrlScraperService } from "./UrlScraperService";

export class RegexRoutingUrlScraperService implements UrlScraperService {
    constructor(
        private readonly args: {
            routes: [RegExp, UrlScraperService][];
            default: UrlScraperService;
        },
    ) {}
    scrapeUrl(url: string): Promise<string> {
        const route = this.args.routes.find(([regex]) => regex.test(url));
        return route ? route[1].scrapeUrl(url) : this.args.default.scrapeUrl(url);
    }
}

import { UrlScraperService } from "./UrlScraperService";

export class ProxyUrlScraperService implements UrlScraperService {
    constructor(private delegate: UrlScraperService) {}
    scrapeUrl(url: string): Promise<string> {
        return this.delegate.scrapeUrl(url);
    }
}

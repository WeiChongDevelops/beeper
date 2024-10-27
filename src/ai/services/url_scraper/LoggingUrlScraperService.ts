import { ProxyUrlScraperService } from "./ProxyUrlScraperService";

export class LoggingUrlScraperService extends ProxyUrlScraperService {
    scrapeUrl(url: string): Promise<string> {
        console.log("Scraping " + url);
        return super.scrapeUrl(url);
    }
}

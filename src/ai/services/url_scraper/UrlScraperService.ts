export interface UrlScraperService {
    scrapeUrl(url: string): Promise<string>;
}

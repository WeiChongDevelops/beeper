"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggingUrlScraperService = void 0;
const ProxyUrlScraperService_1 = require("./ProxyUrlScraperService");
class LoggingUrlScraperService extends ProxyUrlScraperService_1.ProxyUrlScraperService {
    scrapeUrl(url) {
        console.log("Scraping " + url);
        return super.scrapeUrl(url);
    }
}
exports.LoggingUrlScraperService = LoggingUrlScraperService;
//# sourceMappingURL=LoggingUrlScraperService.js.map
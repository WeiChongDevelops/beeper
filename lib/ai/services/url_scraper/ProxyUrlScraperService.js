"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyUrlScraperService = void 0;
class ProxyUrlScraperService {
    constructor(delegate) {
        this.delegate = delegate;
    }
    scrapeUrl(url) {
        return this.delegate.scrapeUrl(url);
    }
}
exports.ProxyUrlScraperService = ProxyUrlScraperService;
//# sourceMappingURL=ProxyUrlScraperService.js.map
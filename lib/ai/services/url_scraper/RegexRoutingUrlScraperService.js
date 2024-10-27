"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegexRoutingUrlScraperService = void 0;
class RegexRoutingUrlScraperService {
    constructor(args) {
        this.args = args;
    }
    scrapeUrl(url) {
        const route = this.args.routes.find(([regex]) => regex.test(url));
        return route ? route[1].scrapeUrl(url) : this.args.default.scrapeUrl(url);
    }
}
exports.RegexRoutingUrlScraperService = RegexRoutingUrlScraperService;
//# sourceMappingURL=RegexRoutingUrlScraperService.js.map
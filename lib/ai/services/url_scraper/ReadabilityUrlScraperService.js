"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadabilityUrlScraperService = void 0;
const html_1 = require("../../utils/html");
class ReadabilityUrlScraperService {
    async scrapeUrl(url) {
        const html = await (0, html_1.curl)(url);
        return await (0, html_1.applyReadabilityToHtml)(html);
    }
}
exports.ReadabilityUrlScraperService = ReadabilityUrlScraperService;
//# sourceMappingURL=ReadabilityUrlScraperService.js.map
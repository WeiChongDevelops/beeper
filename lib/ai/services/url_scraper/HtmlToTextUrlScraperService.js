"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HtmlToTextUrlScraperService = void 0;
const html_to_text_1 = require("html-to-text");
const html_1 = require("../../utils/html");
class HtmlToTextUrlScraperService {
    async scrapeUrl(url) {
        const html = await (0, html_1.curl)(url);
        const text = (0, html_to_text_1.convert)(html, {
            selectors: [
                { selector: "a", options: { ignoreHref: true } },
                { selector: "img", format: "skip" },
            ],
        });
        return text;
    }
}
exports.HtmlToTextUrlScraperService = HtmlToTextUrlScraperService;
//# sourceMappingURL=HtmlToTextUrlScraperService.js.map
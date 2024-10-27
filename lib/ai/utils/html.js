"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyReadabilityToHtml = exports.curl = void 0;
const readability_1 = require("@mozilla/readability");
const axios_1 = __importDefault(require("axios"));
const jsdom_1 = __importDefault(require("jsdom"));
const curl = async (url) => {
    const o = await axios_1.default.get(url, { maxRedirects: 5, timeout: 30000 });
    return o.data;
};
exports.curl = curl;
const applyReadabilityToHtml = async (html) => {
    const virtualConsole = new jsdom_1.default.VirtualConsole();
    virtualConsole.on("error", () => {
        // Skip console errors otherwise this gets noisy.
    });
    const doc = new jsdom_1.default.JSDOM(html, { virtualConsole });
    const o = new readability_1.Readability(doc.window.document, {}).parse();
    if (!o)
        return "";
    return [o.title, o.byline, o.excerpt, o.textContent].join("\n");
};
exports.applyReadabilityToHtml = applyReadabilityToHtml;
//# sourceMappingURL=html.js.map
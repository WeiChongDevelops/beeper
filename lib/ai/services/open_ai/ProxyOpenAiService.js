"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyOpenAiService = void 0;
class ProxyOpenAiService {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getEmbeddings(a) {
        return this.delegate.getEmbeddings(a);
    }
    getSearchScores(query, toScore) {
        return this.delegate.getSearchScores(query, toScore);
    }
    createChatCompletion(args) {
        return this.delegate.createChatCompletion(args);
    }
}
exports.ProxyOpenAiService = ProxyOpenAiService;
//# sourceMappingURL=ProxyOpenAiService.js.map
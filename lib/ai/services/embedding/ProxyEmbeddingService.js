"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyEmbeddingService = void 0;
class ProxyEmbeddingService {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getEmbeddings(a) {
        return this.delegate.getEmbeddings(a);
    }
    getSearchScores(query, toScore) {
        return this.delegate.getSearchScores(query, toScore);
    }
}
exports.ProxyEmbeddingService = ProxyEmbeddingService;
//# sourceMappingURL=ProxyEmbeddingService.js.map
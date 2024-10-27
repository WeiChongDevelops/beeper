"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCachedEmbeddingService = void 0;
const ProxyEmbeddingService_1 = require("./ProxyEmbeddingService");
class InMemoryCachedEmbeddingService extends ProxyEmbeddingService_1.ProxyEmbeddingService {
    constructor() {
        super(...arguments);
        this.cache = new Map();
    }
    async getEmbeddings(a) {
        const misses = Array.from(new Set(a.filter((h) => !this.cache.has(h))));
        let cost = { inputTokens: 0, outputTokens: 0 };
        if (misses.length) {
            const embeddings = await super.getEmbeddings(misses);
            cost = embeddings.cost;
            for (let i = 0; i < embeddings.embeddings.length; i++) {
                const embedding = embeddings.embeddings[i];
                this.cache.set(misses[i], embedding);
            }
        }
        return { embeddings: a.map((s) => this.cache.get(s)), cost };
    }
}
exports.InMemoryCachedEmbeddingService = InMemoryCachedEmbeddingService;
//# sourceMappingURL=InMemoryCachedEmbeddingService.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkingEmbeddingService = void 0;
const ProxyEmbeddingService_1 = require("./ProxyEmbeddingService");
const Max = 2048;
class ChunkingEmbeddingService extends ProxyEmbeddingService_1.ProxyEmbeddingService {
    async getEmbeddings(a) {
        if (a.length <= Max)
            return super.getEmbeddings(a);
        const chunks = [];
        for (let i = 0; i < a.length; i += Max)
            chunks.push(a.slice(i, i + Max));
        const results = await Promise.all(chunks.map((c) => this.getEmbeddings(c)));
        const cost = results.reduce((a, b) => ({
            inputTokens: a.inputTokens + b.cost.inputTokens,
            outputTokens: a.outputTokens + b.cost.outputTokens,
        }), { inputTokens: 0, outputTokens: 0 });
        return { embeddings: results.flatMap((r) => r.embeddings), cost };
    }
}
exports.ChunkingEmbeddingService = ChunkingEmbeddingService;
//# sourceMappingURL=ChunkingEmbeddingService.js.map
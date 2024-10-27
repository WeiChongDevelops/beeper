import { Embedding, EmbeddingsResponse } from "./EmbeddingService";
import { ProxyEmbeddingService } from "./ProxyEmbeddingService";

export class InMemoryCachedEmbeddingService extends ProxyEmbeddingService {
    cache: Map<string, Embedding> = new Map();
    async getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
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

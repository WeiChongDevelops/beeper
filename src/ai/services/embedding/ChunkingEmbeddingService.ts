import { EmbeddingsResponse } from "./EmbeddingService";
import { ProxyEmbeddingService } from "./ProxyEmbeddingService";

const Max = 2048;

export class ChunkingEmbeddingService extends ProxyEmbeddingService {
    async getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        if (a.length <= Max) return super.getEmbeddings(a);

        const chunks: string[][] = [];
        for (let i = 0; i < a.length; i += Max) chunks.push(a.slice(i, i + Max));

        const results = await Promise.all(chunks.map((c) => this.getEmbeddings(c)));
        const cost = results.reduce(
            (a, b) => ({
                inputTokens: a.inputTokens + b.cost.inputTokens,
                outputTokens: a.outputTokens + b.cost.outputTokens,
            }),
            { inputTokens: 0, outputTokens: 0 },
        );
        return { embeddings: results.flatMap((r) => r.embeddings), cost };
    }
}

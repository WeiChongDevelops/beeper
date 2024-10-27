import { Embedding, EmbeddingService, EmbeddingsResponse } from "./EmbeddingService";

export class ProxyEmbeddingService implements EmbeddingService {
    constructor(readonly delegate: EmbeddingService) {}
    getEmbeddings(a: string[]): Promise<EmbeddingsResponse> {
        return this.delegate.getEmbeddings(a);
    }
    getSearchScores(query: Embedding, toScore: Embedding[]): Promise<number[]> {
        return this.delegate.getSearchScores(query, toScore);
    }
}

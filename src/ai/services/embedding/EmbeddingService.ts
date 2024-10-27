export type Embedding = number[];

export type EmbeddingsResponse = {
    embeddings: Embedding[];
    cost: {
        inputTokens: number;
        outputTokens: number;
    };
};

export interface EmbeddingService {
    getEmbeddings(a: string[]): Promise<EmbeddingsResponse>;
    getSearchScores(query: Embedding, toScore: Embedding[]): Promise<number[]>;
}

import { ProxyTextSplitterService } from "./ProxyTextSplitterService";
import { GetChunksArgs } from "./TextSplitterService";

export class InMemoryCachingTextSplitterService extends ProxyTextSplitterService {
    cache = new Map<string, string[]>();
    async getChunks(args: GetChunksArgs): Promise<string[]> {
        const key = [args.textSplitter.toString(), args.maxTokenSize, args.text].join(" - ");
        if (this.cache.has(key)) return this.cache.get(key);
        const chunks = await super.getChunks(args);
        this.cache.set(key, chunks);
        return chunks;
    }
}

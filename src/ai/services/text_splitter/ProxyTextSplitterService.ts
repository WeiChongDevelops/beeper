import { GetChunksArgs, TextSplitterService } from "./TextSplitterService";

export class ProxyTextSplitterService implements TextSplitterService {
    constructor(private readonly delegate: TextSplitterService) {}
    getChunks(args: GetChunksArgs): Promise<string[]> {
        return this.delegate.getChunks(args);
    }
}

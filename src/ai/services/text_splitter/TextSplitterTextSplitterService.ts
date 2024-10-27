import { GetChunksArgs, TextSplitterService } from "./TextSplitterService";

export class TextSplitterTextSplitterService implements TextSplitterService {
    async getChunks(args: GetChunksArgs): Promise<string[]> {
        const splitter = args.textSplitter;
        let index = 0;
        const chunks: string[] = [];
        while (index < args.text.length) {
            const chunk = splitter.getChunk({
                text: args.text,
                maxTokenSize: args.maxTokenSize,
                startIndex: index,
            });
            if (chunk.trim().length) chunks.push(chunk.trim());
            else if (!chunk.length) index++;
            index += chunk.length;
        }
        return chunks;
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextSplitterTextSplitterService = void 0;
class TextSplitterTextSplitterService {
    async getChunks(args) {
        const splitter = args.textSplitter;
        let index = 0;
        const chunks = [];
        while (index < args.text.length) {
            const chunk = splitter.getChunk({
                text: args.text,
                maxTokenSize: args.maxTokenSize,
                startIndex: index,
            });
            if (chunk.trim().length)
                chunks.push(chunk.trim());
            else if (!chunk.length)
                index++;
            index += chunk.length;
        }
        return chunks;
    }
}
exports.TextSplitterTextSplitterService = TextSplitterTextSplitterService;
//# sourceMappingURL=TextSplitterTextSplitterService.js.map
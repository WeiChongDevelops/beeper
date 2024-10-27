"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryCachingTextSplitterService = void 0;
const ProxyTextSplitterService_1 = require("./ProxyTextSplitterService");
class InMemoryCachingTextSplitterService extends ProxyTextSplitterService_1.ProxyTextSplitterService {
    constructor() {
        super(...arguments);
        this.cache = new Map();
    }
    async getChunks(args) {
        const key = [args.textSplitter.toString(), args.maxTokenSize, args.text].join(" - ");
        if (this.cache.has(key))
            return this.cache.get(key);
        const chunks = await super.getChunks(args);
        this.cache.set(key, chunks);
        return chunks;
    }
}
exports.InMemoryCachingTextSplitterService = InMemoryCachingTextSplitterService;
//# sourceMappingURL=InMemoryCachingTextSplitterService.js.map
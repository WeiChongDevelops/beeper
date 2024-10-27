"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownSplitter = exports.ArrayTextSplitter = exports.ShortCircuitTextSplitter = exports.ProxyTextSplitter = void 0;
const ai_1 = require("./ai");
const memoize_1 = require("./memoize");
class ProxyTextSplitter {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getChunk(args) {
        return this.delegate.getChunk(args);
    }
}
exports.ProxyTextSplitter = ProxyTextSplitter;
class ShortCircuitTextSplitter extends ProxyTextSplitter {
    getChunk(args) {
        if ((0, ai_1.getNumTokens)(args.text.slice(args.startIndex)) <= args.maxTokenSize) {
            return args.text.slice(args.startIndex);
        }
        return super.getChunk(args);
    }
}
exports.ShortCircuitTextSplitter = ShortCircuitTextSplitter;
class ArrayTextSplitter {
    constructor(splitters) {
        this.splitters = splitters;
    }
    toString() {
        return `ArrayTextSplitter(${this.splitters.join(", ")})`;
    }
    getChunk(args) {
        let lastSplitterIndex = this.splitters.length - 1;
        const startIndex = args.startIndex || 0;
        let endIndex = startIndex;
        const chunk = () => args.text.slice(startIndex, endIndex);
        while ((0, ai_1.getNumTokens)(chunk()) <= args.maxTokenSize && endIndex < args.text.length) {
            const o = endIndex;
            for (let i = 0; i <= lastSplitterIndex; i++) {
                const splitter = this.splitters[i];
                let nextIndex = args.text.indexOf(splitter, endIndex);
                if (nextIndex === -1)
                    continue;
                nextIndex += splitter.length;
                const testChunk = args.text.slice(startIndex, nextIndex);
                if ((0, ai_1.getNumTokens)(testChunk) > args.maxTokenSize)
                    continue;
                endIndex = nextIndex;
                lastSplitterIndex = i;
                break;
            }
            if (o === endIndex)
                break;
        }
        if (endIndex === startIndex) {
            // Nothing matched. Just go to the max token size. It won't be as big a
            // chunk as we want, but it's better than nothing.
            endIndex = startIndex + args.maxTokenSize;
        }
        return chunk();
    }
}
exports.ArrayTextSplitter = ArrayTextSplitter;
exports.markdownSplitter = (0, memoize_1.memoize)(() => new ShortCircuitTextSplitter(new ArrayTextSplitter(["\n\n", "\n", ". ", "? ", "! ", " "])));
//# sourceMappingURL=TextSplitter.js.map
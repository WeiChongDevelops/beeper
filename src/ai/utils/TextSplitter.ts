import { getNumTokens } from "./ai";
import { memoize } from "./memoize";

export type GetChunkArgs = {
    text: string;
    startIndex: number;
    maxTokenSize: number;
};

export interface TextSplitter {
    getChunk(args: GetChunkArgs): string;
}

export class ProxyTextSplitter implements TextSplitter {
    constructor(private delegate: TextSplitter) {}
    getChunk(args: GetChunkArgs): string {
        return this.delegate.getChunk(args);
    }
}

export class ShortCircuitTextSplitter extends ProxyTextSplitter {
    getChunk(args: GetChunkArgs): string {
        if (getNumTokens(args.text.slice(args.startIndex)) <= args.maxTokenSize) {
            return args.text.slice(args.startIndex);
        }
        return super.getChunk(args);
    }
}

export class ArrayTextSplitter implements TextSplitter {
    splitters: string[];
    constructor(splitters: string[]) {
        this.splitters = splitters;
    }
    toString() {
        return `ArrayTextSplitter(${this.splitters.join(", ")})`;
    }
    getChunk(args: GetChunkArgs): string {
        let lastSplitterIndex = this.splitters.length - 1;
        const startIndex = args.startIndex || 0;
        let endIndex = startIndex;
        const chunk = () => args.text.slice(startIndex, endIndex);
        while (getNumTokens(chunk()) <= args.maxTokenSize && endIndex < args.text.length) {
            const o = endIndex;
            for (let i = 0; i <= lastSplitterIndex; i++) {
                const splitter = this.splitters[i];
                let nextIndex = args.text.indexOf(splitter, endIndex);
                if (nextIndex === -1) continue;
                nextIndex += splitter.length;
                const testChunk = args.text.slice(startIndex, nextIndex);
                if (getNumTokens(testChunk) > args.maxTokenSize) continue;
                endIndex = nextIndex;
                lastSplitterIndex = i;
                break;
            }
            if (o === endIndex) break;
        }
        if (endIndex === startIndex) {
            // Nothing matched. Just go to the max token size. It won't be as big a
            // chunk as we want, but it's better than nothing.
            endIndex = startIndex + args.maxTokenSize;
        }
        return chunk();
    }
}

export const markdownSplitter = memoize(
    () => new ShortCircuitTextSplitter(new ArrayTextSplitter(["\n\n", "\n", ". ", "? ", "! ", " "])),
);

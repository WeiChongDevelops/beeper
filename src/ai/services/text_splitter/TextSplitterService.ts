import { TextSplitter } from "../../utils/TextSplitter";

export type GetChunksArgs = {
    text: string;
    maxTokenSize: number;
    textSplitter: TextSplitter;
};
export interface TextSplitterService {
    getChunks(args: GetChunksArgs): Promise<string[]>;
}

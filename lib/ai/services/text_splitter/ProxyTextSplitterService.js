"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyTextSplitterService = void 0;
class ProxyTextSplitterService {
    constructor(delegate) {
        this.delegate = delegate;
    }
    getChunks(args) {
        return this.delegate.getChunks(args);
    }
}
exports.ProxyTextSplitterService = ProxyTextSplitterService;
//# sourceMappingURL=ProxyTextSplitterService.js.map
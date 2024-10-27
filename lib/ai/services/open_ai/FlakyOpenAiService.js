"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlakyOpenAiService = void 0;
const ProxyOpenAiService_1 = require("./ProxyOpenAiService");
// For testing only!
class FlakyOpenAiService extends ProxyOpenAiService_1.ProxyOpenAiService {
    constructor(errorRate, delegate) {
        super(delegate);
        this.errorRate = errorRate;
    }
    createChatCompletion(args) {
        if (Math.random() < this.errorRate) {
            throw new Error("Random error");
        }
        return super.createChatCompletion(args);
    }
    getEmbeddings(a) {
        if (Math.random() < this.errorRate) {
            throw new Error("Random error");
        }
        return super.getEmbeddings(a);
    }
}
exports.FlakyOpenAiService = FlakyOpenAiService;
//# sourceMappingURL=FlakyOpenAiService.js.map
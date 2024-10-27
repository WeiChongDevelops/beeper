"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfilingOpenAiService = void 0;
const ProxyOpenAiService_1 = require("./ProxyOpenAiService");
class ProfilingOpenAiService extends ProxyOpenAiService_1.ProxyOpenAiService {
    async createChatCompletion(args) {
        const timingId = `createChatCompletion ${Date.now()}`;
        console.time(timingId);
        try {
            return await super.createChatCompletion(args);
        }
        finally {
            console.timeEnd(timingId);
        }
    }
}
exports.ProfilingOpenAiService = ProfilingOpenAiService;
//# sourceMappingURL=ProfilingOpenAiService.js.map
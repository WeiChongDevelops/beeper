"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitLines = void 0;
function emitLines(stream) {
    let backlog = "";
    stream.on("data", (data) => {
        backlog += data;
        let n = backlog.indexOf("\n");
        while (n !== -1) {
            stream.emit("line", backlog.substring(0, n));
            backlog = backlog.substring(n + 1);
            n = backlog.indexOf("\n");
        }
    });
    stream.on("end", () => backlog && stream.emit("line", backlog));
}
exports.emitLines = emitLines;
//# sourceMappingURL=lib.js.map
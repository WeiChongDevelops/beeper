"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interceptConsole = void 0;
function interceptConsole(console, dest) {
    const keys = ["log", "warn", "info", "debug", "error"];
    for (let key of keys) {
        let old = console[key];
        console[key] = function (...args) {
            dest(key, ...args);
            old.call(this, ...args);
        };
    }
}
exports.interceptConsole = interceptConsole;
//# sourceMappingURL=rageshake.js.map
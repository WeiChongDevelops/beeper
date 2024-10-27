"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoize1 = exports.memoize = void 0;
const memoize = (f) => {
    let value;
    let isSet = false;
    return () => {
        if (!isSet) {
            value = f();
            isSet = true;
        }
        return value;
    };
};
exports.memoize = memoize;
const memoize1 = (f) => {
    const cache = new Map();
    return (a1) => {
        if (cache.has(a1))
            return cache.get(a1);
        const value = f(a1);
        cache.set(a1, value);
        return value;
    };
};
exports.memoize1 = memoize1;
//# sourceMappingURL=memoize.js.map
export const memoize = <T>(f: () => T): (() => T) => {
    let value: T;
    let isSet = false;
    return () => {
        if (!isSet) {
            value = f();
            isSet = true;
        }
        return value;
    };
};

export const memoize1 = <T, A1>(f: (a1: A1) => T): ((a1: A1) => T) => {
    const cache = new Map<A1, T>();
    return (a1) => {
        if (cache.has(a1)) return cache.get(a1);
        const value = f(a1);
        cache.set(a1, value);
        return value;
    };
};

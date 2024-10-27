export interface Console {
    log(...args: any): void;

    warn(...args: any): void;

    info(...args: any): void;

    debug(...args: any): void;

    error(...args: any): void;
}

export function interceptConsole(console: Console, dest: (key: string, ...args: any[]) => void) {
    const keys = ["log", "warn", "info", "debug", "error"];

    for (let key of keys) {
        let old = console[key];
        console[key] = function (...args) {
            dest(key, ...args);
            old.call(this, ...args);
        };
    }
}

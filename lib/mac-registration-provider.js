"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stop = exports.reset = exports.start = exports.fireLatestState = void 0;
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const promises_1 = __importDefault(require("fs/promises"));
const child_process_1 = require("child_process");
const lib_1 = require("./lib");
let appPath = electron_1.app.getAppPath();
// So strip the file name if the path ends in .asar
if (appPath.endsWith(".asar")) {
    appPath = path_1.default.dirname(appPath);
}
const resourcePath = path_1.default.join(appPath, "mac-registration-provider");
const binaryPath = path_1.default.join(resourcePath, "mac-registration-provider-universal");
const state = {
    running: false,
    stopping: false,
    relayUrl: "",
    code: "",
    error: "",
};
let proc = null;
function updateState(newState) {
    Object.assign(state, newState);
    global.mainWindow?.webContents?.send("macRegistrationProviderEvent", state);
}
function fireLatestState() {
    updateState({});
}
exports.fireLatestState = fireLatestState;
async function start(relayUrl) {
    if (state.running) {
        updateState({});
        return;
    }
    updateState({ running: true, relayUrl });
    console.info("Starting mac-registration-provider");
    const dataPath = path_1.default.join(electron_1.app.getPath("userData"), "mac-registration-provider");
    console.info("mac-registration data directory:", dataPath);
    await promises_1.default.mkdir(dataPath, { recursive: true });
    try {
        await new Promise((resolve, reject) => {
            const args = ["-json", "-relay-server", relayUrl, "-config-path", path_1.default.join(dataPath, "config.json")];
            proc = (0, child_process_1.spawn)(binaryPath, args, {
                cwd: dataPath,
                env: process.env,
                stdio: ["pipe", "pipe", "pipe"],
                shell: false,
            });
            (0, lib_1.emitLines)(proc.stdout);
            (0, lib_1.emitLines)(proc.stderr);
            proc.stderr.on("line", (line) => {
                console.info("[mac-registration-provider]", line);
            });
            proc.stdout.on("line", (line) => {
                try {
                    const payload = JSON.parse(line);
                    updateState({
                        code: payload.code,
                        error: payload.error,
                    });
                }
                catch (e) {
                    console.warn("mac-registration-provider: Failed to parse payload");
                    updateState({
                        error: "" + e,
                    });
                }
            });
            proc.once("error", (e) => {
                updateState({
                    running: false,
                    error: "" + e,
                });
            });
            proc.on("spawn", () => {
                console.info(`mac-registration-provider process spawned successfully with args ${args}`);
                updateState({
                    running: true,
                    error: "",
                });
                resolve();
            });
            proc.on("exit", (code, signal) => {
                console.info(`mac-registration-provider exited with ${code}/${signal}`);
                updateState({
                    running: false,
                    exitCode: code,
                    code: "",
                });
                proc = null;
            });
            proc.on("error", (err) => {
                console.error("mac-registration-provider proc error:", err);
                updateState({
                    error: "" + err,
                    running: false,
                });
            });
        });
    }
    catch (err) {
        console.warn("mac-registration-provider failed to start", err);
        proc = null;
        updateState({
            running: false,
            error: "" + err,
        });
        throw err;
    }
    console.info("mac-registration-provider is running");
}
exports.start = start;
async function reset() {
    await stop();
    const dataPath = path_1.default.join(electron_1.app.getPath("userData"), "mac-registration-provider");
    await promises_1.default.rm(path_1.default.join(dataPath, "config.json"));
    await start(state.relayUrl);
}
exports.reset = reset;
async function stop(timeout = 5000) {
    if (!state.running) {
        console.info("mac-registration-provider not running, ignoring stop()");
        return;
    }
    if (state.stopping) {
        console.info("mac-registration-provider, already stopping, ignoring");
        return;
    }
    updateState({
        code: "",
        stopping: true,
    });
    try {
        console.info("Stopping mac-registration-provider");
        const sigtermTimeout = setTimeout(() => proc.kill(), timeout / 5);
        const sigkillTimeout = setTimeout(() => proc.kill(9), timeout);
        await new Promise((resolve) => proc.once("exit", resolve));
        clearTimeout(sigtermTimeout);
        clearTimeout(sigkillTimeout);
        proc = null;
        updateState({
            running: false,
        });
        console.info("mac-registration-provider stopped");
    }
    finally {
        updateState({
            stopping: false,
        });
    }
}
exports.stop = stop;
//# sourceMappingURL=mac-registration-provider.js.map
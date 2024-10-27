import path from "path";
import { app } from "electron";
import fs from "fs/promises";
import { spawn } from "child_process";
import { emitLines } from "./lib";

let appPath = app.getAppPath();
// So strip the file name if the path ends in .asar
if (appPath.endsWith(".asar")) {
    appPath = path.dirname(appPath);
}

const resourcePath = path.join(appPath, "mac-registration-provider");
const binaryPath = path.join(resourcePath, "mac-registration-provider-universal");

interface IState {
    running: boolean;
    stopping: boolean;
    code: string;
    error: string;
    relayUrl: string;
    exitCode?: number;
}

const state: IState = {
    running: false,
    stopping: false,
    relayUrl: "",
    code: "",
    error: "",
};
let proc = null;

function updateState(newState: Partial<IState>) {
    Object.assign(state, newState);
    global.mainWindow?.webContents?.send("macRegistrationProviderEvent", state);
}

export function fireLatestState() {
    updateState({});
}

export async function start(relayUrl: string) {
    if (state.running) {
        updateState({});
        return;
    }
    updateState({ running: true, relayUrl });

    console.info("Starting mac-registration-provider");
    const dataPath = path.join(app.getPath("userData"), "mac-registration-provider");
    console.info("mac-registration data directory:", dataPath);

    await fs.mkdir(dataPath, { recursive: true });

    try {
        await new Promise<void>((resolve, reject) => {
            const args = ["-json", "-relay-server", relayUrl, "-config-path", path.join(dataPath, "config.json")];
            proc = spawn(binaryPath, args, {
                cwd: dataPath,
                env: process.env,
                stdio: ["pipe", "pipe", "pipe"],
                shell: false,
            });
            emitLines(proc.stdout);
            emitLines(proc.stderr);
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
                } catch (e) {
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
    } catch (err) {
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

export async function reset() {
    await stop();
    const dataPath = path.join(app.getPath("userData"), "mac-registration-provider");
    await fs.rm(path.join(dataPath, "config.json"));
    await start(state.relayUrl);
}

export async function stop(timeout = 5000) {
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
    } finally {
        updateState({
            stopping: false,
        });
    }
}

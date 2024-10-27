"use strict";
/*
Copyright 2017 OpenMarket Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const electron_1 = require("electron");
const fs_1 = require("fs");
function runUpdateExe(args) {
    // Invokes Squirrel's Update.exe which will do things for us like create shortcuts
    // Note that there's an Update.exe in the app-x.x.x directory and one in the parent
    // directory: we need to run the one in the parent directory, because it discovers
    // information about the app by inspecting the directory it's run from.
    const updateExe = path_1.default.resolve(path_1.default.dirname(process.execPath), "..", "Update.exe");
    console.log(`Spawning '${updateExe}' with args '${args}'`);
    return new Promise((resolve) => {
        (0, child_process_1.spawn)(updateExe, args, {
            detached: true,
        }).on("close", resolve);
    });
}
function checkSquirrelHooks() {
    if (process.platform !== "win32")
        return false;
    const cmd = process.argv[1];
    const target = path_1.default.basename(process.execPath);
    if (cmd === "--squirrel-install" || cmd === "--squirrel-updated") {
        runUpdateExe(["--createShortcut=" + target])
            .then(() => {
            // remove the old 'Riot' shortcuts, if they exist (update.exe --removeShortcut doesn't work
            // because it always uses the name of the product as the name of the shortcut: the only variable
            // is what executable you're linking to)
            const appDataDir = process.env.APPDATA;
            if (!appDataDir)
                return;
            const startMenuDir = path_1.default.join(appDataDir, "Microsoft", "Windows", "Start Menu", "Programs", "New Vector Ltd");
            return fs_1.promises.rmdir(startMenuDir, { recursive: true });
        })
            .then(() => {
            // same for 'Element (Riot) which is old now too (we have to try to delete both because
            // we don't know what version we're updating from, but of course we do know this version
            // is 'Element' so the two old ones are all safe to delete).
            const appDataDir = process.env.APPDATA;
            if (!appDataDir)
                return;
            const oldStartMenuLink = path_1.default.join(appDataDir, "Microsoft", "Windows", "Start Menu", "Programs", "Element", "Element (Riot).lnk");
            return fs_1.promises.unlink(oldStartMenuLink).catch(() => { });
        })
            .then(() => {
            const oldDesktopShortcut = path_1.default.join(electron_1.app.getPath("desktop"), "Element (Riot).lnk");
            return fs_1.promises.unlink(oldDesktopShortcut).catch(() => { });
        })
            .then(() => {
            const oldDesktopShortcut = path_1.default.join(electron_1.app.getPath("desktop"), "Riot.lnk");
            return fs_1.promises.unlink(oldDesktopShortcut).catch(() => { });
        })
            .then(() => {
            electron_1.app.quit();
        });
        return true;
    }
    else if (cmd === "--squirrel-uninstall") {
        runUpdateExe(["--removeShortcut=" + target]).then(() => {
            electron_1.app.quit();
        });
        return true;
    }
    else if (cmd === "--squirrel-obsolete") {
        electron_1.app.quit();
        return true;
    }
    return false;
}
if (checkSquirrelHooks()) {
    process.exit(1);
}
//# sourceMappingURL=squirrelhooks.js.map
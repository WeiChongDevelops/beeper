/* eslint-disable @typescript-eslint/no-var-requires */
/*
Copyright 2016-2021 New Vector Ltd

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
import { ipcMain } from "electron";
// import * as Sentry from '@sentry/electron';

import fs from "fs";
import path from "path";

export let startAutoUpdate = () => {};
export let pollForUpdates = async () => {};

ipcMain.on("check_updates", () => pollForUpdates());

if (fs.existsSync(path.join(__dirname, "..", "..", "is_electron_builder.txt"))) {
    console.log("Running an electron-builder build, not initializing todesktop");
} else {
    console.log("Initializing todesktop runtime");
    const todesktop = require("@todesktop/runtime");
    const electronLog = require("electron-log");

    todesktop.init({
        autoUpdater: false,
        customLogger: electronLog,
    });

    const UPDATE_POLL_INTERVAL_MS = 60 * 60 * 1000;
    const INITIAL_UPDATE_DELAY_MS = 30 * 1000;

    let updateAvailable = false;

    function installUpdate(): void {
        if (!updateAvailable) return;
        // for some reason, quitAndInstall does not fire the
        // before-quit event, so we need to set the flag here.
        global.appQuitting = true;
        todesktop.autoUpdater.restartAndInstall();
    }

    async function checkForUpdates(): Promise<void> {
        try {
            console.log("Checking for update...");
            let result = await todesktop.autoUpdater.checkForUpdates();
            console.log("Got update result", JSON.stringify(result, null, 2));
            global?.mainWindow?.webContents?.send?.("check_updates", result.updateInfo === null ? false : true);
            console.log("Notified main window of update result");
        } catch (e) {
            console.log("Couldn't check for update", e);
            // Sentry.captureException(e);
            global?.mainWindow?.webContents?.send?.("check_updates", e.message || undefined);
            console.log("Notified main window of update error");
        }
    }

    let updateCheckInProgress = null;

    pollForUpdates = function () {
        if (!updateCheckInProgress) {
            updateCheckInProgress = checkForUpdates().then(() => {
                updateCheckInProgress = null;
            });
        }

        return updateCheckInProgress;
    };

    startAutoUpdate = function () {
        setTimeout(pollForUpdates, INITIAL_UPDATE_DELAY_MS);
        setInterval(pollForUpdates, UPDATE_POLL_INTERVAL_MS);
    };

    ipcMain.on("install_update", installUpdate);

    todesktop.autoUpdater.on("update-downloaded", (event) => {
        // from https://www.npmjs.com/package/@todesktop/runtime/v/0.5.0#update-downloaded
        // `event` looks like:
        // {
        //     sources: ["auto-check-on-interval"],
        //     updateInfo: {
        //         releaseDate: "2011-10-05T14:48:00.000Z",
        //         version: "2.1.3"
        //     }
        // }
        updateAvailable = true;

        if (!global?.mainWindow) return;
        // forward to renderer
        global?.mainWindow?.webContents.send("update-downloaded", {
            releaseNotes: "none",
            releaseName: event.updateInfo.version,
            releaseDate: event.updateInfo.releaseDate,
            updateURL: "none",
        });
    });

    todesktop.autoUpdater.on("error", (error) => {
        console.log("Error auto-updating:", error);
    });
}

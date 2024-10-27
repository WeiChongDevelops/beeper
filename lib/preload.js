"use strict";
/*
Copyright 2018, 2019, 2021 New Vector Ltd

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
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose only expected IPC wrapper APIs to the renderer process to avoid
// handing out generalised messaging access.
const CHANNELS = [
    "app_onAction",
    "before-quit",
    "check_updates",
    "install_update",
    "ipcCall",
    "ipcReply",
    "loudNotification",
    "showInFinder",
    "preferences",
    "seshat",
    "seshatReply",
    "setBadgeCount",
    "setMatrixAccessToken",
    "update-downloaded",
    "userDownloadCompleted",
    "userDownloadOpen",
    // Beeper specific channels
    "setIconOverlay",
    "uncaughtException",
    "minimize",
    "maximize",
    "restore",
    "unmaximize",
    "close",
    "enter-full-screen",
    "leave-full-screen",
    "browser-window-blur",
    "browser-window-focus",
    "register-global-shortcuts",
    "unregister-global-shortcuts",
    "closeAuthWindow",
    "bridgeAuth",
    "bridgeAuthReply",
    "bridgeAuthWindowClosed",
    "setProxyReply",
    "setProxy",
    "track_event",
    "power-status",
    "oauthServerEvent",
    "identify",
    "onContactChanged",
    "open-search",
    "forwardedLog",
    "macRegistrationProviderEvent",
];
electron_1.contextBridge.exposeInMainWorld("electron", {
    on(channel, listener) {
        if (!CHANNELS.includes(channel)) {
            console.error(`on: Unknown IPC channel ${channel} ignored`);
            return;
        }
        electron_1.ipcRenderer.on(channel, listener);
        return () => {
            electron_1.ipcRenderer.removeListener(channel, listener);
        };
    },
    send(channel, ...args) {
        if (!CHANNELS.includes(channel)) {
            console.error(`send: Unknown IPC channel ${channel} ignored`);
            return;
        }
        electron_1.ipcRenderer.send(channel, ...args);
    },
    invoke(channel, ...args) {
        if (!CHANNELS.includes(channel)) {
            console.error(`send: Unknown IPC channel ${channel} ignored`);
            return;
        }
        return electron_1.ipcRenderer.invoke(channel, ...args);
    },
    async getDesktopCapturerSources(options) {
        return electron_1.ipcRenderer.invoke("get-sources", options);
    },
    async isFullScreen() {
        return electron_1.ipcRenderer.invoke("isFullScreen");
    },
    async isMaximized() {
        return electron_1.ipcRenderer.invoke("isMaximized");
    },
    crash() {
        process.crash();
    },
    isMac() {
        return process.platform === "darwin";
    },
    isWindows() {
        return process.platform === "win32";
    },
    isLinux() {
        return process.platform === "linux";
    },
});
//# sourceMappingURL=preload.js.map
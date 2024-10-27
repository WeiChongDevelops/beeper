"use strict";
/*
Copyright 2017 Karl Glatz <karl@glatz.biz>
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
exports.initApplicationMenu = exports.create = exports.setUnreadStatus = exports.destroy = exports.hasTray = void 0;
const electron_1 = require("electron");
const png_to_ico_1 = __importDefault(require("png-to-ico"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const language_helper_1 = require("./language-helper");
let trayIcon = null;
function hasTray() {
    return trayIcon !== null;
}
exports.hasTray = hasTray;
function destroy() {
    if (trayIcon) {
        trayIcon.destroy();
        trayIcon = null;
    }
}
exports.destroy = destroy;
function toggleWin() {
    if (global.mainWindow.isVisible() && !global.mainWindow.isMinimized()) {
        global.mainWindow.hide();
    }
    else {
        if (global.mainWindow.isMinimized())
            global.mainWindow.restore();
        if (!global.mainWindow.isVisible())
            global.mainWindow.show();
        global.mainWindow.focus();
    }
}
let defaultIcon;
let unreadIcon;
function setUnreadStatus(unread) {
    if (trayIcon) {
        trayIcon.setImage(unread ? unreadIcon : defaultIcon);
    }
}
exports.setUnreadStatus = setUnreadStatus;
function create(config) {
    // no trays on darwin
    if (process.platform === "darwin" || trayIcon)
        return;
    defaultIcon = electron_1.nativeImage.createFromPath(config.icon_path);
    unreadIcon = electron_1.nativeImage.createFromPath(config.unread_icon_path);
    trayIcon = new electron_1.Tray(defaultIcon);
    trayIcon.setToolTip(config.brand);
    initApplicationMenu();
    trayIcon.on("click", toggleWin);
    let lastFavicon = null;
    global.mainWindow.webContents.on("page-favicon-updated", async function (ev, favicons) {
        if (process.platform !== "linux") {
            return;
        }
        if (!favicons || favicons.length <= 0 || !favicons[0].startsWith("data:")) {
            if (lastFavicon !== null) {
                global.mainWindow.setIcon(defaultIcon);
                trayIcon.setImage(defaultIcon);
                lastFavicon = null;
            }
            return;
        }
        // No need to change, shortcut
        if (favicons[0] === lastFavicon)
            return;
        lastFavicon = favicons[0];
        let newFavicon = electron_1.nativeImage.createFromDataURL(favicons[0]);
        // Windows likes ico's too much.
        //if (process.platform === 'win32') {
        if (false) {
            try {
                const icoPath = path_1.default.join(electron_1.app.getPath("temp"), "win32_element_icon.ico");
                fs_1.default.writeFileSync(icoPath, await (0, png_to_ico_1.default)(newFavicon.toPNG()));
                newFavicon = electron_1.nativeImage.createFromPath(icoPath);
            }
            catch (e) {
                console.error("Failed to make win32 ico", e);
            }
        }
        trayIcon.setImage(newFavicon);
        global.mainWindow.setIcon(newFavicon);
    });
    global.mainWindow.webContents.on("page-title-updated", function (ev, title) {
        trayIcon.setToolTip(title);
    });
}
exports.create = create;
function initApplicationMenu() {
    if (!trayIcon) {
        return;
    }
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: (0, language_helper_1._t)("Show/Hide"),
            click: toggleWin,
        },
        { type: "separator" },
        {
            label: (0, language_helper_1._t)("Quit"),
            click: function () {
                electron_1.app.quit();
            },
        },
    ]);
    trayIcon.setContextMenu(contextMenu);
}
exports.initApplicationMenu = initApplicationMenu;
//# sourceMappingURL=tray.js.map
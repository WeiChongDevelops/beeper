/*
Copyright 2016 Aviral Dasgupta
Copyright 2016 OpenMarket Ltd
Copyright 2017, 2019 Michael Telatynski <7t3chguy@gmail.com>
Copyright 2018 - 2021 New Vector Ltd

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

// Squirrel on windows starts the app with various flags as hooks to tell us when we've been installed/uninstalled etc.
import AutoLaunch from "auto-launch";
import crypto from "crypto";
import {
    BrowserWindow,
    Menu,
    SourcesOptions,
    app,
    autoUpdater,
    clipboard,
    desktopCapturer,
    dialog,
    globalShortcut,
    ipcMain,
    nativeImage,
    powerMonitor,
    powerSaveBlocker,
    protocol,
    shell,
} from "electron";
import Store from "electron-store";
import windowStateKeeper from "electron-window-state";
import fs, { promises as afs } from "fs";
import os from "os";
import minimist from "minimist";
import path from "path";
import { URL } from "url";
import "./squirrelhooks";

// import * as Sentry from '@sentry/electron';
import childProcess from "child_process";

import { handleAiOperation } from "./ai/handler";
import { AppLocalization, _t } from "./language-helper";
import {
    contactsHelper,
    getContactsAuthStatus,
    requestContactAccess,
    setupContactListener,
    teardownContactListener,
} from "./mac-contacts-helper";
import "./oauth";
import { MediaRequestHandler } from "./media-request-handler";
import { startOAuthServer, stopOAuthServer } from "./oauth";
import { getProfileFromDeeplink, protocolInit, recordSSOSession } from "./protocol";
import { interceptConsole } from "./rageshake";
import * as tray from "./tray";
import * as updater from "./updater";
import { buildMenuTemplate } from "./vectormenu";
import webContentsHandler from "./webcontents-handler";

import macosVersion from "macos-version";

import * as macRegistrationProvider from "./mac-registration-provider";

const DEFAULT_KEY = "DEFAULT_KEY";

const argv = minimist(process.argv, {
    alias: { help: "h" },
});

let keytar;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    keytar = require("../.hak/hakModules/keytar");
} catch (e) {
    // Sentry.captureException(e);
    if (e.code === "MODULE_NOT_FOUND") {
        console.log("Keytar isn't installed; secure key storage is disabled.");
    } else {
        console.warn("Keytar unexpected error:", e);
    }
}

let seshatSupported = false;
let Seshat;
let SeshatRecovery;
let ReindexError;

const seshatPassphrase = "DEFAULT_PASSPHRASE";

try {
    const seshatModule = require("../.hak/hakModules/matrix-seshat");
    Seshat = seshatModule.Seshat;
    SeshatRecovery = seshatModule.SeshatRecovery;
    ReindexError = seshatModule.ReindexError;
    seshatSupported = true;
} catch (e) {
    // Sentry.captureException(e);
    if (e.code === "MODULE_NOT_FOUND") {
        console.log("Seshat isn't installed, event indexing is disabled.");
    } else {
        console.warn("Seshat unexpected error:", e);
    }
}

// Things we need throughout the file but need to be created
// async to are initialised in setupGlobals()
let asarPath;
let iconsPath;
let vectorConfig;
let iconPath;
let trayConfig;
let launcher;
let appLocalization;

if (argv["help"]) {
    console.log("Options:");
    console.log("  --profile-dir {path}: Path to where to store the profile.");
    console.log("  --profile {name}:     Name of alternate profile to use, allows for running multiple accounts.");
    console.log("  --devtools:           Install and use react-devtools and react-perf.");
    console.log("  --no-update:          Disable automatic updating.");
    console.log("  --default-frame:      Use OS-default window decorations.");
    console.log("  --hidden:             Start the application hidden in the system tray.");
    console.log("  --help:               Displays this help message.");
    console.log("And more such as --proxy, see:" + "https://electronjs.org/docs/api/command-line-switches");
    app.exit();
}

// Electron creates the user data directory (with just an empty 'Dictionaries' directory...)
// as soon as the app path is set, so pick a random path in it that must exist if it's a
// real user data directory.
function isRealUserDataDir(d) {
    return fs.existsSync(path.join(d, "IndexedDB"));
}

// check if we are passed a profile in the SSO callback url
let userDataPath;

const userDataPathInProtocol = getProfileFromDeeplink(argv["_"]);
if (userDataPathInProtocol) {
    app.setPath("userData", userDataPathInProtocol);
} else if (argv["profile-dir"]) {
    app.setPath("userData", argv["profile-dir"]);
} else if (argv["profile"]) {
    app.setPath("userData", `${app.getPath("userData")}-${argv["profile"]}`);
}

async function tryPaths(name, root, rawPaths) {
    // Make everything relative to root
    const paths = rawPaths.map((p) => path.join(root, p));

    for (const p of paths) {
        try {
            await afs.stat(p);
            return p + "/";
        } catch (e) {}
    }
    console.log(`Couldn't find ${name} files in any of: `);
    for (const p of paths) {
        console.log("\t" + path.resolve(p));
    }
    throw new Error(`Failed to find ${name} files`);
}

// Find the webapp resources and set up things that require them
async function setupGlobals() {
    // find the webapp asar.
    asarPath = await tryPaths("webapp", __dirname, [
        // If run from the source checkout, this will be in the directory above
        "../webapp.asar",
        // but if run from a packaged application, electron-main.js will be in
        // a different asar file so it will be two levels above
        "../../webapp.asar",
        // also try without the 'asar' suffix to allow symlinking in a directory
        "../webapp",
        // from a packaged application
        "../../webapp",

        // Workaround for developing beeper on windows, where symlinks are poorly supported.
        "../../packages/nova-web/webapp",
    ]);

    console.log("Web App Path is", asarPath);

    iconsPath = await tryPaths("icons", __dirname, ["../res/icons", "../../icons"]);

    console.log("iconsPath path is", iconsPath);

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    vectorConfig = require(asarPath + "config.json");

    console.log("Loading vector config for brand", vectorConfig.brand);

    try {
        // Load local config and use it to override values from the one baked with the build
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const localConfig = require(path.join(app.getPath("userData"), "config.json"));

        // If the local config has a homeserver defined, don't use the homeserver from the build
        // config. This is to avoid a problem where Riot thinks there are multiple homeservers
        // defined, and panics as a result.
        const homeserverProps = ["default_is_url", "default_hs_url", "default_server_name", "default_server_config"];
        if (Object.keys(localConfig).find((k) => homeserverProps.includes(k))) {
            // Rip out all the homeserver options from the vector config
            vectorConfig = Object.keys(vectorConfig)
                .filter((k) => !homeserverProps.includes(k))
                .reduce((obj, key) => {
                    obj[key] = vectorConfig[key];
                    return obj;
                }, {});
        }

        vectorConfig = Object.assign(vectorConfig, localConfig);
    } catch (e) {
        if (e instanceof SyntaxError) {
            dialog.showMessageBox({
                type: "error",
                title: `Your ${vectorConfig.brand || "Element"} is misconfigured`,
                message:
                    `Your custom ${vectorConfig.brand || "Element"} configuration contains invalid JSON. ` +
                    `Please correct the problem and reopen ${vectorConfig.brand || "Element"}.`,
                detail: e.message || "",
            });
        }
        // Could not load local config, this is expected in most cases.
    }

    // The tray icon
    // It's important to call `path.join` so we don't end up with the packaged asar in the final path.
    const iconSubdir = process.platform == "win32" ? "win" : "";
    const iconFile = `icon.png`;
    const unreadIcon = `icon-unread.png`;
    iconPath = path.join(iconsPath, iconSubdir, iconFile);

    // Unused on non win32 platforms
    const unreadIconPath = path.join(iconsPath, iconSubdir, unreadIcon);
    trayConfig = {
        icon_path: iconPath,
        unread_icon_path: unreadIconPath,
        brand: vectorConfig.brand || "Beeper",
    };

    // launcher
    launcher = new AutoLaunch({
        name: vectorConfig.brand || "Beeper",
        isHidden: true,
        mac: {
            useLaunchAgent: true,
        },
    });
}

const eventStorePath = path.join(app.getPath("userData"), "EventStore");
const store = new Store<{
    warnBeforeExit?: boolean;
    minimizeToTray?: boolean;
    spellCheckerEnabled?: boolean;
    autoHideMenuBar?: boolean;
    locale?: string | string[];
}>({ name: "electron-config" });

let eventIndex = null;

let mainWindow: BrowserWindow | null = null;
global.appQuitting = false;

interceptConsole(console, (key, ...args: any[]) => {
    mainWindow?.webContents?.send("forwardedLog", {
        level: key,
        args: args,
    });
});

const exitShortcuts = [
    (input, platform) => platform !== "darwin" && input.alt && input.key.toUpperCase() === "F4",
    (input, platform) => platform !== "darwin" && input.control && input.key.toUpperCase() === "Q",
    (input, platform) => platform === "darwin" && input.meta && input.key.toUpperCase() === "Q",
];

const warnBeforeExit = (event, input) => {
    const shouldWarnBeforeExit = store.get("warnBeforeExit", true);
    const exitShortcutPressed =
        input.type === "keyDown" && exitShortcuts.some((shortcutFn) => shortcutFn(input, process.platform));

    if (shouldWarnBeforeExit && exitShortcutPressed) {
        const shouldCancelCloseRequest =
            dialog.showMessageBoxSync(mainWindow, {
                type: "question",
                buttons: [_t("Cancel"), _t("Close Beeper")],
                message: _t("Please leave Beeper running in the background if possible"),
                defaultId: 1,
                cancelId: 0,
            }) === 0;

        if (shouldCancelCloseRequest) {
            event.preventDefault();
        }
    }
};

const deleteContents = async (p) => {
    for (const entry of await afs.readdir(p)) {
        const curPath = path.join(p, entry);
        await afs.unlink(curPath);
    }
};

async function randomArray(size) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(size, (err, buf) => {
            if (err) {
                reject(err);
            } else {
                resolve(buf.toString("base64").replace(/=+$/g, ""));
            }
        });
    });
}

// handle uncaught errors otherwise it displays
// stack traces in popup dialogs, which is terrible (which
// it will do any time the auto update poke fails, and there's
// no other way to catch this error).
// Assuming we generally run from the console when developing,
// this is far preferable.
process.on("uncaughtException", function (error) {
    console.log("Unhandled exception", error);
    if (mainWindow) {
        mainWindow.webContents.send("uncaughtException", error);
    }
});

let focusHandlerAttached = false;

const mediaRequestHandler = new MediaRequestHandler();

ipcMain.on("setMatrixAccessToken", (ev, accessToken: string | undefined, homeserverHost: string | undefined) => {
    mediaRequestHandler.saveMatrixAccessToken(accessToken, homeserverHost);
});

ipcMain.on("setBadgeCount", function (ev, count) {
    // Beeper: app.badgeCount appears to work on all platforms
    // but it doesn't look as nice on windows, so we will use an icon
    // overlay like slack/discord/thunderbird appear to do
    if (process.platform !== "win32") {
        // only set badgeCount on Mac/Linux, the docs say that only those platforms support it but turns out Electron
        // has some Windows support too, and in some Windows environments this leads to two badges rendering atop
        // each other. See https://github.com/vector-im/element-web/issues/16942
        app.badgeCount = count;
    }
    tray.setUnreadStatus(count > 0);
    if (count === 0 && mainWindow) {
        mainWindow.flashFrame(false);
    }
});

let iconOverlay = null;
function updateIconOverlay() {
    mainWindow && mainWindow.setOverlayIcon(iconOverlay, iconOverlay ? "Unread messages" : "");
}

ipcMain.on("setIconOverlay", function (ev, image) {
    if (process.platform == "win32") {
        iconOverlay = image != null ? nativeImage.createFromDataURL(image) : null;

        updateIconOverlay();
    }
});

ipcMain.on("loudNotification", function () {
    if (process.platform === "win32" && mainWindow && !mainWindow.isFocused() && !focusHandlerAttached) {
        mainWindow.flashFrame(true);
        mainWindow.once("focus", () => {
            mainWindow.flashFrame(false);
            focusHandlerAttached = false;
        });
        focusHandlerAttached = true;
    }
});

let powerSaveBlockerId = null;
ipcMain.on("app_onAction", function (ev, payload) {
    switch (payload.action) {
        case "call_state":
            if (powerSaveBlockerId !== null && powerSaveBlocker.isStarted(powerSaveBlockerId)) {
                if (payload.state === "ended") {
                    powerSaveBlocker.stop(powerSaveBlockerId);
                    powerSaveBlockerId = null;
                }
            } else {
                if (powerSaveBlockerId === null && payload.state === "connected") {
                    powerSaveBlockerId = powerSaveBlocker.start("prevent-display-sleep");
                }
            }
            break;
    }
});

ipcMain.on("ipcCall", async function (ev, payload) {
    if (!mainWindow) return;

    try {
        const ret = await handleIpcCall(payload);
        mainWindow.webContents.send("ipcReply", {
            id: payload.id,
            reply: ret,
        });
    } catch (e) {
        // Sentry.captureException(e);
        console.error("Error handling ipc call", payload.name, e);
        mainWindow.webContents.send("ipcReply", {
            id: payload.id,
            error: e,
        });
    }
});

async function handleIpcCall({ name, args, id }): Promise<any> {
    let ret;

    switch (name) {
        case "copyToClipboard":
            clipboard.writeText(args[0]);
            break;
        case "getUpdateFeedUrl":
            ret = autoUpdater.getFeedURL();
            break;
        case "getAutoLaunchEnabled":
            ret = await launcher.isEnabled();
            break;
        case "setAutoLaunchEnabled":
            if (args[0]) {
                launcher.enable();
            } else {
                launcher.disable();
            }
            break;
        case "shouldWarnBeforeExit":
            ret = store.get("warnBeforeExit", true);
            break;
        case "setWarnBeforeExit":
            store.set("warnBeforeExit", args[0]);
            break;
        case "getMinimizeToTrayEnabled":
            ret = tray.hasTray();
            break;
        case "setMinimizeToTrayEnabled":
            if (args[0]) {
                // Create trayIcon icon
                tray.create(trayConfig);
            } else {
                tray.destroy();
            }
            store.set("minimizeToTray", args[0]);
            break;
        case "getAutoHideMenuBarEnabled":
            ret = global.mainWindow.autoHideMenuBar;
            break;
        case "setAutoHideMenuBarEnabled":
            store.set("autoHideMenuBar", args[0]);
            global.mainWindow.autoHideMenuBar = Boolean(args[0]);
            global.mainWindow.setMenuBarVisibility(!args[0]);
            break;
        case "getAppVersion":
            ret = app.getVersion();
            break;
        case "getAppLocaleCountryCode":
            ret = app.getLocaleCountryCode();
            break;
        case "getAppName":
            ret = app.getName();
            break;
        case "getOs":
            ret = os.release();
            break;
        case "getOsVersion":
            ret = childProcess.execSync("sw_vers -productVersion").toString().trim();
            break;
        case "getCpuArch":
            ret = process.arch;
            break;
        case "reloadWindow":
            if (mainWindow) {
                mainWindow.reload();
            }
            break;
        case "clearHttpCache":
            if (mainWindow) {
                // noinspection ES6MissingAwait
                mainWindow.webContents.session.clearCache();
            }
            break;
        case "focusWindow":
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            // based on some stuff I found online, this weird looking section
            // is intended to fix this linear ticket:
            // https://linear.app/beeper/issue/DES-7562/jessica-clicking-a-desktop-notification-doesnt-open-up-the-app
            //
            // https://stackoverflow.com/questions/70925355/why-does-win-focus-not-bring-the-window-to-the-front
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.setAlwaysOnTop(false);
            mainWindow.focus();
            break;
        case "getConfig":
            ret = vectorConfig;
            break;
        case "navigateBack":
            if (mainWindow.webContents.canGoBack()) {
                mainWindow.webContents.goBack();
            }
            break;
        case "navigateForward":
            if (mainWindow.webContents.canGoForward()) {
                mainWindow.webContents.goForward();
            }
            break;
        case "setLanguage": {
            appLocalization.setAppLocale(args[0]);

            // work around `setSpellCheckerLanguages` being case-sensitive by converting to expected case
            const caseMap = {};
            const availableLanguages = mainWindow.webContents.session.availableSpellCheckerLanguages;
            availableLanguages.forEach((lang) => {
                caseMap[lang.toLowerCase()] = lang;
            });

            if (!caseMap["en"]) {
                // default special-case for `en` as in Riot is actually implies `en-GB`. `en-US` is distinct.
                // this way if `en` is requested and not available and `en-GB` is available it'll be used.
                caseMap["en"] = caseMap["en-gb"];
            }

            const languages = new Set();
            args[0].forEach((lang) => {
                const lcLang = lang.toLowerCase();
                if (caseMap[lcLang]) {
                    languages.add(caseMap[lcLang]);
                    return;
                }

                // as a fallback if the language is unknown check if the language group is known, e.g en for en-AU
                const langGroup = lcLang.split("-")[0];
                if (caseMap[langGroup]) {
                    languages.add(caseMap[langGroup]);
                    return;
                }

                // as a further fallback, pick all other matching variants from the same language group
                // this means that if we cannot find `ar-dz` or `ar` for example, we will pick `ar-*` to
                // offer a spellcheck which is least likely to wrongly red underline something.
                availableLanguages.forEach((availableLang) => {
                    if (availableLang.startsWith(langGroup)) {
                        languages.add(availableLang);
                    }
                });
            });

            if (languages.size > 0) {
                mainWindow.webContents.session.setSpellCheckerLanguages([...languages] as any);
            }
            break;
        }
        case "setSpellCheckLanguages":
            if (args[0] && args[0].length > 0) {
                mainWindow.webContents.session.setSpellCheckerEnabled(true);
                store.set("spellCheckerEnabled", true);

                try {
                    mainWindow.webContents.session.setSpellCheckerLanguages(args[0]);
                } catch (er) {
                    console.log("There were problems setting the spellcheck languages", er);
                }
            } else {
                mainWindow.webContents.session.setSpellCheckerEnabled(false);
                store.set("spellCheckerEnabled", false);
            }
            break;
        case "getSpellCheckLanguages":
            if (store.get("spellCheckerEnabled", true)) {
                ret = mainWindow.webContents.session.getSpellCheckerLanguages();
            } else {
                ret = [];
            }
            break;
        case "getAvailableSpellCheckLanguages":
            ret = mainWindow.webContents.session.availableSpellCheckerLanguages;
            break;

        case "startSSOFlow":
            recordSSOSession(args[0]);
            break;

        case "getPickleKey":
            ret = await keytar.getPassword("riot.im", `${args[0]}|${args[1]}`);
            break;

        case "createPickleKey":
            ret = null;
            break;

        case "destroyPickleKey":
            await keytar.deletePassword("riot.im", `${args[0]}|${args[1]}`);
            break;

        case "fireLatestMacRegistrationProviderState":
            macRegistrationProvider.fireLatestState();
            break;
        case "startMacRegistrationProvider":
            await macRegistrationProvider.start(args[0]);
            break;
        case "stopMacRegistrationProvider":
            await macRegistrationProvider.stop();
            break;
        case "resetMacRegistrationProvider":
            await macRegistrationProvider.reset();
            break;

        case "startOAuthServer":
            ret = await startOAuthServer();
            break;
        case "stopOAuthServer":
            stopOAuthServer();
            break;

        case "contactOperation":
            /*
            payload should be:
            {
              name: string;
              operation: 'create' | 'read' | 'update' | 'delete';
              content?: // content related to the above operations
            }
            */
            console.log("Beeper : electron-main : contactOperation");
            ret = await contactsHelper(args[0].operation, args[0].content);
            break;
        case "aiOperation":
            ret = await handleAiOperation(args[0]);
            break;
        case "getContactsAuthStatus":
            console.log("Beeper : electron-main : getContactsAuthStatus");
            ret = getContactsAuthStatus();
            break;
        case "requestContactAccess":
            console.log("Beeper : electron-main : requestContactAccess");
            ret = await requestContactAccess();
            break;
        case "openExternal":
            await shell.openExternal(args[0].url);
            break;
        default:
            throw new Error("Unknown IPC Call: " + name);
    }

    return ret;
}

export function onContactChanged() {
    mainWindow.webContents.send("onContactChanged");
}

const seshatDefaultPassphrase = "DEFAULT_PASSPHRASE";
async function getOrCreatePassphrase(key) {
    if (keytar) {
        try {
            const storedPassphrase = await keytar.getPassword("element.io", key);
            if (storedPassphrase !== null) {
                return storedPassphrase;
            } else {
                const newPassphrase = await randomArray(32);
                await keytar.setPassword("element.io", key, newPassphrase);
                return newPassphrase;
            }
        } catch (e) {
            console.log("Error getting the event index passphrase out of the secret store", e);
        }
    } else {
        return seshatDefaultPassphrase;
    }
}

let authWindow;
ipcMain.on("bridgeAuth", async function (ev, payload = {}) {
    if (!mainWindow) return;
    if (authWindow) {
        closeAuthWindow();
    }
    authWindow = new BrowserWindow({
        width: 970,
        height: 700,
        center: true,
        webPreferences: {
            partition: Math.random().toString(), // Create a new temporary session for each new auth window
        },
    });
    authWindow._beeperWindowId = payload.windowId;
    authWindow.setMenuBarVisibility(false);

    authWindow.webContents.session.webRequest.onBeforeRequest(function (details, callback) {
        console.log(`[AuthWindowHttp] AuthWindow #${details.id} ${details.method} ${details.url}`);
        callback({});
    });
    authWindow.webContents.session.webRequest.onCompleted(function (details) {
        console.log(
            `[AuthWindowHttp] AuthWindow #${details.id} ${details.method} ${details.url} completed got ${details.statusCode} fromCache? ${details.fromCache} error? ${details.error}`,
        );
    });
    authWindow.webContents.session.webRequest.onErrorOccurred(function (details) {
        console.log(
            `[AuthWindowHttp] AuthWindow #${details.id} ${details.method} ${details.url} failed got error ${details.error} fromCache? ${details.fromCache}`,
        );
    });

    authWindow.webContents.on("did-finish-load", function () {
        // Hide Google login button for Slack because Google blocks Electron apps.
        authWindow.webContents.insertCSS(".c-google_login { display: none !important; }");

        // Hide Google login for twitter
        // Also disable webauthn for LinkedIn, they half support it and it leads to bugs
        const disableGoogleLogin = () => {
            const found = (e: Element) => {
                e.parentElement.parentElement.style.display = "none";
            };

            const observer = new MutationObserver((records, observer) => {
                records.forEach((r) => {
                    if (r.type == "childList") {
                        for (const node of Array.from(r.addedNodes)) {
                            if (
                                node.nodeName == "IFRAME" &&
                                (node as Element).getAttribute("title") == "Sign in with Google Button"
                            ) {
                                found(node as Element);
                            }
                        }
                    }
                });
            });

            observer.observe(document.body, {
                subtree: true,
                childList: true,
            });
        };

        authWindow.webContents.executeJavaScript(`(${disableGoogleLogin.toString()})()`);

        if (payload.url.indexOf("linkedin.com") >= 0) {
            // Disable webauthn for LinkedIn, they half support it and it leads to bugs
            const disableLinkedInWebauthn = () => {
                if (window && window.navigator && window.navigator.credentials) {
                    let success = false;
                    try {
                        // @ts-ignore
                        delete Object.getPrototypeOf(window.navigator).credentials;
                        success = true;
                    } catch {}

                    if (!success) {
                        try {
                            // @ts-ignore
                            Object.getPrototypeOf(window.navigator).credentials = undefined;
                        } catch {}
                    }
                }
            };

            authWindow.webContents.executeJavaScript(`(${disableLinkedInWebauthn.toString()})()`);
        }

        // Hide Google login for linkedin
        authWindow.webContents.insertCSS("button#sign-in-with-google-button { display: none !important; }");
    });

    authWindow.webContents.insertCSS("#onetrust-banner-sdk { display: none; }");
    authWindow.webContents.setWindowOpenHandler((details) => {
        authWindow.webContents.executeJavaScript(`window.location = ${JSON.stringify(details.url)}`);
        return { action: "deny" };
    });
    authWindow.webContents.on("will-navigate", (evt, url) => {
        if (url.startsWith("slack://")) {
            evt.preventDefault();
        }
    });

    const clickUseSlackInBrowser = () => {
        // We write this as a function so that it still gets transpiled by typescript,
        // and we get nice syntax highlights.
        // We then inject it by converting the transpiled function back to a string at runtime.
        const code = function () {
            if (!/\.slack\.com$/.test(window.location.host)) return;

            function clickLink() {
                const link = document?.querySelector?.(".p-ssb_redirect__body")?.querySelector?.(".c-link");
                if (link) {
                    location.href = link.getAttribute("href");
                }
            }

            setInterval(clickLink, 1000);
        };

        authWindow.webContents.executeJavaScript(`(${code.toString()})()`);
    };

    let storageWatcher = () => {};
    if (payload.storage_keys) {
        storageWatcher = () => {
            const setupWatcher = () => {
                const js = `new Promise((resolve, reject) => {
          function getLocalStoragePropertyDescriptor() {
            const iframe = document.createElement('iframe');
            document.head.append(iframe);
            const pd = Object.getOwnPropertyDescriptor(iframe.contentWindow, 'localStorage');
            iframe.remove();
            return pd;
          }
          Object.defineProperty(window, 'localStorage', getLocalStoragePropertyDescriptor());

          const watchKeys = ${JSON.stringify(payload.storage_keys)};

          function checkFinished(){
            let foundAll = true
            for (const key in watchKeys) {
              watchKeys[key] = window.localStorage.getItem(key)
              if (!watchKeys[key]){
                foundAll = false
                break;
              }

              // SLACK SPECIFIC
              if (key === 'localConfig_v2' && !watchKeys[key].includes('xoxc-')) {
                foundAll = false
                break;
              }
            }
            if(foundAll){
              resolve(watchKeys)
            }
          }

          window.setInterval(checkFinished, 3000)

          checkFinished()

          const setItem = window.localStorage.setItem.bind(localStorage)
          window.localStorage.setItem = (...args) => {
            const key = args[0]
            const value = args[1]
            if (key in watchKeys) {
              watchKeys[key] = value
              checkFinished()
            }
            setItem.apply(localStorage, args)
          }

        })`;
                authWindow.webContents
                    .executeJavaScript(js)
                    .then((result) => {
                        mainWindow.webContents.send("bridgeAuthReply", {
                            windowId: authWindow._beeperWindowId,
                            url: payload.url,
                            storage: result,
                        });
                    })
                    .catch((err) => console.error("Storage Rejection", err));
            };
            setupWatcher();
        };
    }

    let cookieWatcher = () => {};
    if (payload.cookie_keys) {
        cookieWatcher = async () => {
            const filter = payload.domains
                ? {}
                : payload.cookie_filter_by_url
                  ? { url: payload.url }
                  : { domain: payload.domain };
            const cookies = await authWindow.webContents.session.cookies.get(filter);
            const filtered = cookies.filter(({ name, domain }) => {
                if (payload.domains) return payload.cookie_keys.includes(name) && payload.domains.includes(domain);
                return payload.cookie_keys.includes(name);
            });
            if (filtered.length === payload.cookie_keys.length) {
                const includedCookies = payload.include_all_cookies ? cookies : filtered;
                mainWindow.webContents.send("bridgeAuthReply", {
                    windowId: authWindow._beeperWindowId,
                    url: payload.url,
                    domain: payload.domain,
                    cookies: includedCookies.reduce((acc, { name, value }) => {
                        return { ...acc, [name]: value };
                    }, {}),
                });
            }
        };
    }

    let urlWatcher = (event, url) => {};
    if (payload.watch_url) {
        urlWatcher = (event, url) => {
            if (url.includes(payload.watch_url)) {
                mainWindow.webContents.send("bridgeAuthReply", {
                    windowId: authWindow._beeperWindowId,
                    url: url,
                });
                event.preventDefault();
            }
        };
    }

    if (payload.header_watcher) {
        authWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            if (details.url.indexOf(payload.header_watcher.url) >= 0) {
                if (payload.header_watcher.header === "*") {
                    mainWindow.webContents.send("bridgeAuthReply", {
                        windowId: authWindow._beeperWindowId,
                        all_headers: details.requestHeaders,
                    });
                } else {
                    mainWindow.webContents.send("bridgeAuthReply", {
                        windowId: authWindow._beeperWindowId,
                        header: details.requestHeaders[payload.header_watcher.header],
                    });
                }
            }
            callback({});
        });
    }

    authWindow.webContents.on("did-finish-load", storageWatcher);
    authWindow.webContents.on("did-finish-load", cookieWatcher);
    authWindow.webContents.on("did-finish-load", clickUseSlackInBrowser);

    authWindow.webContents.on("did-navigate-in-page", storageWatcher);
    authWindow.webContents.on("did-navigate-in-page", cookieWatcher);

    authWindow.webContents.on("will-redirect", urlWatcher);

    authWindow.on("closed", () => {
        mainWindow.webContents.send("bridgeAuthWindowClosed", {
            windowId: authWindow._beeperWindowId,
        });
    });

    authWindow.loadURL(payload.url, { userAgent: payload.userAgent });
});

function closeAuthWindow() {
    if (authWindow?.isDestroyed() === false) {
        authWindow.webContents.session.clearStorageData({ storages: ["cookies"] });
        authWindow.destroy();
    }
    authWindow = null;
}

ipcMain.on("closeAuthWindow", closeAuthWindow);

ipcMain.on("seshat", async function (ev, payload) {
    if (!mainWindow) return;

    const sendError = (id, e) => {
        const error = {
            message: e.message,
        };

        mainWindow.webContents.send("seshatReply", {
            id: id,
            error: error,
        });
    };

    const args = payload.args || [];
    let ret;

    switch (payload.name) {
        case "supportsEventIndexing":
            ret = seshatSupported;
            break;

        case "initEventIndex":
            if (eventIndex === null) {
                try {
                    await afs.mkdir(eventStorePath, { recursive: true });
                    eventIndex = new Seshat(eventStorePath, {
                        passphrase: seshatPassphrase,
                    });
                } catch (e) {
                    if (e instanceof ReindexError) {
                        // If this is a reindex error, the index schema
                        // changed. Try to open the database in recovery mode,
                        // reindex the database and finally try to open the
                        // database again.
                        try {
                            const recoveryIndex = new SeshatRecovery(eventStorePath, {
                                passphrase: seshatPassphrase,
                            });

                            const userVersion = await recoveryIndex.getUserVersion();

                            // If our user version is 0 we'll delete the db
                            // anyways so reindexing it is a waste of time.
                            if (userVersion === 0) {
                                await recoveryIndex.shutdown();

                                try {
                                    await deleteContents(eventStorePath);
                                } catch (e) {}
                            } else {
                                await recoveryIndex.reindex();
                            }

                            eventIndex = new Seshat(eventStorePath, {
                                passphrase: seshatPassphrase,
                            });
                        } catch (e) {
                            sendError(payload.id, e);
                            return;
                        }
                    } else {
                        sendError(payload.id, e);
                        return;
                    }
                }
            }
            break;

        case "closeEventIndex":
            if (eventIndex !== null) {
                const index = eventIndex;
                eventIndex = null;

                try {
                    await index.shutdown();
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "deleteEventIndex":
            {
                try {
                    await deleteContents(eventStorePath);
                } catch (e) {}
            }

            break;

        case "isEventIndexEmpty":
            if (eventIndex === null) ret = true;
            else ret = await eventIndex.isEmpty();
            break;

        case "isRoomIndexed":
            if (eventIndex === null) ret = false;
            else ret = await eventIndex.isRoomIndexed(args[0]);
            break;

        case "addEventToIndex":
            try {
                eventIndex.addEvent(args[0], args[1]);
            } catch (e) {
                sendError(payload.id, e);
                return;
            }
            break;

        case "deleteEvent":
            try {
                ret = await eventIndex.deleteEvent(args[0]);
            } catch (e) {
                sendError(payload.id, e);
                return;
            }
            break;

        case "commitLiveEvents":
            try {
                ret = await eventIndex.commit();
            } catch (e) {
                sendError(payload.id, e);
                return;
            }
            break;

        case "searchEventIndex":
            try {
                ret = await eventIndex.search(args[0]);
            } catch (e) {
                sendError(payload.id, e);
                return;
            }
            break;

        case "addHistoricEvents":
            if (eventIndex === null) ret = false;
            else {
                try {
                    ret = await eventIndex.addHistoricEvents(args[0], args[1], args[2]);
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "getStats":
            if (eventIndex === null) ret = 0;
            else {
                try {
                    ret = await eventIndex.getStats();
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "removeCrawlerCheckpoint":
            if (eventIndex === null) ret = false;
            else {
                try {
                    ret = await eventIndex.removeCrawlerCheckpoint(args[0]);
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "addCrawlerCheckpoint":
            if (eventIndex === null) ret = false;
            else {
                try {
                    ret = await eventIndex.addCrawlerCheckpoint(args[0]);
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "loadFileEvents":
            if (eventIndex === null) ret = [];
            else {
                try {
                    ret = await eventIndex.loadFileEvents(args[0]);
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "loadCheckpoints":
            if (eventIndex === null) ret = [];
            else {
                try {
                    ret = await eventIndex.loadCheckpoints();
                } catch (e) {
                    ret = [];
                }
            }
            break;

        case "setUserVersion":
            if (eventIndex === null) break;
            else {
                try {
                    await eventIndex.setUserVersion(args[0]);
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        case "getUserVersion":
            if (eventIndex === null) ret = 0;
            else {
                try {
                    ret = await eventIndex.getUserVersion();
                } catch (e) {
                    sendError(payload.id, e);
                    return;
                }
            }
            break;

        default:
            mainWindow.webContents.send("seshatReply", {
                id: payload.id,
                error: "Unknown IPC Call: " + payload.name,
            });
            return;
    }

    mainWindow.webContents.send("seshatReply", {
        id: payload.id,
        reply: ret,
    });
});

app.commandLine.appendSwitch("enable-features", "PlatformHEVCDecoderSupport");

const localdev = Array.isArray(argv._) && argv._.includes("localdev");
const localapi = Array.isArray(argv._) && argv._.includes("localapi");
if (!localdev) {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
        console.log("Other instance detected: exiting");
        app.exit();
    }
}

// Sentry.init({
//     dsn: 'https://51b38ff78b5e42b3a44114247abf22d6@o578031.ingest.sentry.io/5860012',
// });

// do this after we know we are the primary instance of the app
protocolInit();

// Register the scheme the app is served from as 'standard'
// which allows things like relative URLs and IndexedDB to
// work.
// Also mark it as secure (ie. accessing resources from this
// protocol and HTTPS won't trigger mixed content warnings).
protocol.registerSchemesAsPrivileged([
    {
        scheme: "nova",
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            allowServiceWorkers: true,
        },
    },
]);

// Turn the sandbox on for *all* windows we might generate. Doing this means we don't
// have to specify a `sandbox: true` to each BrowserWindow.
//
// This also fixes an issue with window.open where if we only specified the sandbox
// on the main window we'd run into cryptic "ipc_renderer be broke" errors. Turns out
// it's trying to jump the sandbox and make some calls into electron, which it can't
// do when half of it is sandboxed. By turning on the sandbox for everything, the new
// window (no matter how temporary it may be) is also sandboxed, allowing for a clean
// transition into the user's browser.
app.enableSandbox();

app.on("ready", async () => {
    try {
        await setupGlobals();
    } catch (e) {
        console.log("App setup failed: exiting", e);
        process.exit(1);
        // process.exit doesn't cause node to stop running code immediately,
        // so return (we could let the exception propagate but then we end up
        // with node printing all sorts of stuff about unhandled exceptions
        // when we want the actual error to be as obvious as possible).
        return;
    }

    setupContactListener();

    if (argv["devtools"]) {
        try {
            const { default: installExt, REACT_DEVELOPER_TOOLS, REACT_PERF } = require("electron-devtools-installer");

            await installExt([REACT_DEVELOPER_TOOLS, REACT_PERF], { loadExtensionOptions: { allowFileAccess: true } });
        } catch (e) {
            console.log(e);
        }
    }

    protocol.registerFileProtocol("nova", (request, callback) => {
        if (request.method !== "GET") {
            callback({ error: -322 }); // METHOD_NOT_SUPPORTED from chromium/src/net/base/net_error_list.h
            return null;
        }

        const parsedUrl = new URL(request.url);
        if (parsedUrl.protocol !== "nova:") {
            callback({ error: -302 }); // UNKNOWN_URL_SCHEME
            return;
        }
        if (parsedUrl.host !== "nova-web") {
            callback({ error: -105 }); // NAME_NOT_RESOLVED
            return;
        }

        const target = parsedUrl.pathname.split("/");

        // path starts with a '/'
        if (target[0] !== "") {
            callback({ error: -6 }); // FILE_NOT_FOUND
            return;
        }

        if (target[target.length - 1] == "") {
            target[target.length - 1] = "index.html";
        }

        let baseDir;
        if (target[1] === "webapp") {
            baseDir = asarPath;
        } else {
            callback({ error: -6 }); // FILE_NOT_FOUND
            return;
        }

        // Normalise the base dir and the target path separately, then make sure
        // the target path isn't trying to back out beyond its root
        baseDir = path.normalize(baseDir);

        const relTarget = path.normalize(path.join(...target.slice(2)));
        if (relTarget.startsWith("..")) {
            callback({ error: -6 }); // FILE_NOT_FOUND
            return;
        }
        const absTarget = path.join(baseDir, relTarget);

        callback({
            path: absTarget,
        });
    });

    if (argv["no-update"]) {
        console.log('Auto update disabled via command line flag "--no-update"');
    } else {
        updater.startAutoUpdate();
    }

    // Load the previous window state with fallback to defaults
    const mainWindowState = windowStateKeeper({
        defaultWidth: 1024,
        defaultHeight: 768,
    });

    const isMac = process.platform === "darwin";
    const preloadScript = path.normalize(`${__dirname}/preload.js`);

    mainWindow = global.mainWindow = new BrowserWindow({
        // https://www.electronjs.org/docs/faq#the-font-looks-blurry-what-is-this-and-what-can-i-do
        ...(isMac ? {} : { backgroundColor: "#fff" }),
        icon: iconPath,
        show: false,
        autoHideMenuBar: store.get("autoHideMenuBar", true),

        x: mainWindowState.x,
        y: mainWindowState.y,
        minWidth: 660,
        minHeight: 400,
        width: mainWindowState.width,
        height: mainWindowState.height,
        frame: argv["default-frame"] ?? false,
        titleBarStyle: isMac ? "hidden" : null,
        trafficLightPosition: { x: 16, y: 20 },
        webPreferences: {
            //devTools: false,
            //zoomFactor: 0.9,
            preload: preloadScript,
            nodeIntegration: true,
            //sandbox: true, // We enable sandboxing from app.enableSandbox() above
            // We don't use this: it's useful for the preload script to
            // share a context with the main page so we can give select
            // objects to the main page. The sandbox option isolates the
            // main page from the background script.
            spellcheck: true,
            contextIsolation: true,
            webgl: true,
            backgroundThrottling: false,
        },
        vibrancy: "fullscreen-ui",
        visualEffectState: "followWindow",
    });

    if (localdev) {
        // Open dev tools at startup if in dev mode
        mainWindow.webContents.openDevTools();
        app.on("certificate-error", (event, webContents, url, error, certificate, callback) => {
            // On certificate error we disable default behaviour (stop loading the page)
            // and we then say "it is all fine - true" to the callback
            event.preventDefault();
            callback(true);
        });
    }
    if (localapi) {
        vectorConfig.novaApiUrl = `https://localhost:4001`;
    }
    mainWindow.loadURL(localdev ? "http://localhost:8080" : "nova://nova-web/webapp/");

    // Create trayIcon icon
    if (store.get("minimizeToTray", true)) tray.create(trayConfig);

    mainWindow.once("ready-to-show", () => {
        mainWindowState.manage(mainWindow);

        if (!argv["hidden"]) {
            mainWindow.show();
        } else {
            // hide here explicitly because window manage above sometimes shows it
            mainWindow.hide();
        }
    });

    if (argv["default-frame"]) {
        mainWindow.webContents.on("did-finish-load", () => {
            mainWindow.webContents.insertCSS(".bp_TitleBar { display: none !important; }");
        });
    }

    function shouldLogUrl(url: string) {
        if (url?.startsWith("https://segment.beeper.com") || url?.startsWith("nova://nova-web/webapp")) {
            return false;
        }
        return true;
    }

    mainWindow.webContents.session.webRequest.onBeforeRequest(function (details, callback) {
        if (shouldLogUrl(details.url)) {
            //console.log(`[MainWindowHttp] #${details.id} ${details.method} ${details.url}`);
        }
        callback({});
    });

    // Authenticated media support
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        mediaRequestHandler.onBeforeSendHeadersListener(details, callback);
    });
    mainWindow.webContents.session.webRequest.onBeforeRedirect((details) => {
        mediaRequestHandler.onBeforeRedirectListener(details);
    });

    mainWindow.webContents.session.webRequest.onCompleted(function (details) {
        if (false && shouldLogUrl(details.url)) {
            console.log(
                `[MainWindowHttp] #${details.id} ${details.method} ${details.url} completed got ${details.statusCode} fromCache? ${details.fromCache} error? ${details.error}`,
            );
        }
    });
    mainWindow.webContents.session.webRequest.onErrorOccurred(function (details) {
        if (false && shouldLogUrl(details.url)) {
            console.log(
                `[MainWindowHttp] #${details.id} ${details.method} ${details.url} failed got error ${details.error} fromCache? ${details.fromCache}`,
            );
        }
    });

    ipcMain.on("minimize", () => mainWindow.minimize());
    ipcMain.on("maximize", () => mainWindow.maximize());
    ipcMain.on("unmaximize", () => {
        if (mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        } else {
            mainWindow.unmaximize();
        }
    });
    ipcMain.on("close", () => mainWindow.close());
    mainWindow.on("maximize", () => mainWindow.webContents.send("maximize"));
    mainWindow.on("unmaximize", () => mainWindow.webContents.send("unmaximize"));
    mainWindow.on("enter-full-screen", () => mainWindow.webContents.send("enter-full-screen"));
    mainWindow.on("leave-full-screen", () => {
        // Work-around until https://github.com/electron/electron/issues/38244 is fixed
        const { width, height } = mainWindow.getBounds();
        mainWindow.setSize(width - 1, height);
        mainWindow.setSize(width, height);
        mainWindow.webContents.send("leave-full-screen");
    });
    mainWindow.on("show", () => {
        updateIconOverlay();
    });

    powerMonitor.on("suspend", () => {
        mainWindow.webContents.send("power-status", "suspend");
    });
    powerMonitor.on("resume", () => {
        mainWindow.webContents.send("power-status", "resume");
    });
    powerMonitor.on("lock-screen", () => {
        mainWindow.webContents.send("power-status", "lock-screen");
    });

    mainWindow.webContents.on("before-input-event", warnBeforeExit);
    mainWindow.webContents.on("render-process-gone", (e) => {
        console.log("Render Process Gone", (e as any).details);
    });

    mainWindow.on("closed", () => {
        mainWindow = global.mainWindow = null;
    });

    mainWindow.on("close", (e) => {
        // If we are not quitting and have a tray icon then minimize to tray
        if (!global.appQuitting && (tray.hasTray() || process.platform === "darwin")) {
            // On Mac, closing the window just hides it
            // (this is generally how single-window Mac apps
            // behave, eg. Mail.app)
            e.preventDefault();
            mainWindow.hide();
            return false;
        }
    });

    if (process.platform === "win32") {
        // Handle forward/backward mouse buttons in Windows
        mainWindow.on("app-command", (e, cmd) => {
            if (cmd === "browser-backward" && mainWindow.webContents.canGoBack()) {
                mainWindow.webContents.goBack();
            } else if (cmd === "browser-forward" && mainWindow.webContents.canGoForward()) {
                mainWindow.webContents.goForward();
            }
        });
    }

    webContentsHandler(mainWindow.webContents);

    appLocalization = new AppLocalization({
        store,
        components: [() => tray.initApplicationMenu(), () => Menu.setApplicationMenu(buildMenuTemplate())],
    });
});

app.on("window-all-closed", () => {
    app.quit();
});

app.on("activate", () => {
    mainWindow.show();
});

function beforeQuit() {
    global.appQuitting = true;
    teardownContactListener();
    if (mainWindow) {
        mainWindow.webContents.send("before-quit");
    }
}

app.on("before-quit", beforeQuit);
autoUpdater.on("before-quit-for-update", beforeQuit);

app.on("second-instance", (ev, commandLine, workingDirectory) => {
    // If other instance launched with --hidden then skip showing window
    if (commandLine.includes("--hidden")) return;

    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (!mainWindow.isVisible()) mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// Set the App User Model ID to match what the squirrel
// installer uses for the shortcut icon.
// This makes notifications work on windows 8.1 (and is
// a noop on other platforms).
app.setAppUserModelId("Beeper");

app.on("browser-window-focus", () => {
    console.log("sending browser-window-focus to react");
    if (mainWindow) {
        mainWindow.webContents.send("browser-window-focus");
    }
});

app.on("browser-window-blur", () => {
    console.log("sending browser-window-blur to react");
    if (mainWindow) {
        mainWindow.webContents.send("browser-window-blur");
    }
});

ipcMain.on("register-global-shortcuts", () => {
    console.log("Register global shortcuts");
    const ret = globalShortcut.register("CmdOrCtrl+Shift+K", () => {
        app.focus({ steal: true });
        mainWindow.show();
        mainWindow.webContents.send("open-search");
    });
    if (!ret) {
        console.warn("Global shortcut registration failed", ret);
    }
});

ipcMain.on("unregister-global-shortcuts", () => {
    globalShortcut.unregisterAll();
});

// ipcMain.on("identify", (_, props) => {
//     Sentry.setUser({
//         id: props.userInfo.id,
//         email: props.userInfo.email,
//     });
//     Sentry.setTag("todesktop_version", props.todesktop_version);
//     Sentry.setTag("app_name", props.app_name);
//     Sentry.setTag("device_id", props.device_id);
// });

ipcMain.handle("isFullScreen", () => mainWindow.isFullScreen());
ipcMain.handle("isMaximized", () => mainWindow.isMaximized());
ipcMain.handle("get-sources", async (ev, options: SourcesOptions) => {
    const sources = await desktopCapturer.getSources(options);
    const desktopCapturerSources = [];

    for (const source of sources) {
        desktopCapturerSources.push({
            id: source.id,
            name: source.name,
            thumbnailURL: source.thumbnail.toDataURL(),
        });
    }

    return desktopCapturerSources;
});
app.on("will-quit", () => {
    globalShortcut.unregisterAll();
});

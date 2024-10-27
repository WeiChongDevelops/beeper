"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.contactsHelper = exports.getContactsAuthStatus = exports.requestContactAccess = exports.teardownContactListener = exports.setupContactListener = void 0;
const os_1 = __importDefault(require("os"));
const electron_log_1 = __importDefault(require("electron-log"));
const electron_main_1 = require("./electron-main");
let contacts = null;
if (os_1.default.platform() === "darwin") {
    try {
        contacts = require("node-mac-contacts");
        console.log("Loaded mac contacts helper");
    }
    catch (e) {
        console.warn("Failed to load node mac contacts", e);
    }
}
function setupContactListener() {
    if (!contacts)
        return;
    contacts.listener.setup();
    contacts.listener.on("contact-changed", () => {
        electron_log_1.default.debug("Beeper : MacContacts : a contact has been updated");
        (0, electron_main_1.onContactChanged)();
    });
}
exports.setupContactListener = setupContactListener;
function teardownContactListener() {
    if (!contacts)
        return;
    try {
        contacts.listener.remove();
    }
    catch (e) {
        electron_log_1.default.error("Error shutting down mac-contacts: ", e);
    }
}
exports.teardownContactListener = teardownContactListener;
async function requestContactAccess() {
    electron_log_1.default.debug("Beeper : MacContacts : requestContactAccess()");
    if (!contacts)
        return;
    return await contacts.requestAccess();
}
exports.requestContactAccess = requestContactAccess;
function getContactsAuthStatus() {
    electron_log_1.default.info("Beeper : MacContacts : getContactsAuthStatus()");
    return contacts ? contacts.getAuthStatus() : "Not Authorized";
}
exports.getContactsAuthStatus = getContactsAuthStatus;
async function contactsHelper(operation, content) {
    if (!contacts) {
        electron_log_1.default.info(`Beeper : MacContacts : contactsHelper, returning early since contacts does not exist`);
        return { success: false, reason: "node-mac-contacts does not exist" };
    }
    electron_log_1.default.info(`Beeper : MacContacts : contactsHelper, doing ${operation} operation`);
    if (contacts.getAuthStatus() === "Authorized") {
        switch (operation) {
            case "create":
                return createContact(content);
            case "read":
                return readContacts();
            case "update":
                return updateContact(content);
            case "delete":
                return deleteContact(content);
        }
    }
    else {
        electron_log_1.default.error(`Beeper : MacContacts : contactsHelper, contacts is not Authorized: ${contacts.getAuthStatus()}`);
        return { success: false, authStatus: contacts.getAuthStatus(), reason: "No permission" };
    }
}
exports.contactsHelper = contactsHelper;
function createContact(content) {
    const success = contacts.addNewContact(content);
    return { success };
}
function readContacts() {
    const allContacts = contacts.getAllContacts(["contactThumbnailImage", "organizationName", "socialProfiles"]);
    return { success: true, allContacts };
}
function updateContact(content) {
    const success = contacts.updateContact({ ...content.contact });
    return { success };
}
function deleteContact(content) {
    const success = contacts.deleteContact({ ...content });
    return { success };
}
//# sourceMappingURL=mac-contacts-helper.js.map
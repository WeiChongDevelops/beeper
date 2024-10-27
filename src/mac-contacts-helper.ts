import os from "os";
import log from "electron-log";
import { onContactChanged } from "./electron-main";

let contacts = null;
if (os.platform() === "darwin") {
    try {
        contacts = require("node-mac-contacts");
        console.log("Loaded mac contacts helper");
    } catch (e) {
        console.warn("Failed to load node mac contacts", e);
    }
}

export function setupContactListener() {
    if (!contacts) return;
    contacts.listener.setup();
    contacts.listener.on("contact-changed", () => {
        log.debug("Beeper : MacContacts : a contact has been updated");
        onContactChanged();
    });
}

export function teardownContactListener() {
    if (!contacts) return;
    try {
        contacts.listener.remove();
    } catch (e) {
        log.error("Error shutting down mac-contacts: ", e);
    }
}

export async function requestContactAccess() {
    log.debug("Beeper : MacContacts : requestContactAccess()");
    if (!contacts) return;
    return await contacts.requestAccess();
}

export function getContactsAuthStatus() {
    log.info("Beeper : MacContacts : getContactsAuthStatus()");
    return contacts ? contacts.getAuthStatus() : "Not Authorized";
}

export async function contactsHelper(operation, content) {
    if (!contacts) {
        log.info(`Beeper : MacContacts : contactsHelper, returning early since contacts does not exist`);
        return { success: false, reason: "node-mac-contacts does not exist" };
    }
    log.info(`Beeper : MacContacts : contactsHelper, doing ${operation} operation`);
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
    } else {
        log.error(`Beeper : MacContacts : contactsHelper, contacts is not Authorized: ${contacts.getAuthStatus()}`);
        return { success: false, authStatus: contacts.getAuthStatus(), reason: "No permission" };
    }
}

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

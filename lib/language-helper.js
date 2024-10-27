"use strict";
/*
Copyright 2021 New Vector Ltd

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
exports.AppLocalization = exports._t = exports._td = void 0;
const counterpart_1 = __importDefault(require("counterpart"));
const DEFAULT_LOCALE = "en";
function _td(text) {
    return text;
}
exports._td = _td;
function _t(text, variables = {}) {
    const args = Object.assign({ interpolate: false }, variables);
    const { count } = args;
    // Horrible hack to avoid https://github.com/vector-im/element-web/issues/4191
    // The interpolation library that counterpart uses does not support undefined/null
    // values and instead will throw an error. This is a problem since everywhere else
    // in JS land passing undefined/null will simply stringify instead, and when converting
    // valid ES6 template strings to i18n strings it's extremely easy to pass undefined/null
    // if there are no existing null guards. To avoid this making the app completely inoperable,
    // we'll check all the values for undefined/null and stringify them here.
    Object.keys(args).forEach((key) => {
        if (args[key] === undefined) {
            console.warn("safeCounterpartTranslate called with undefined interpolation name: " + key);
            args[key] = "undefined";
        }
        if (args[key] === null) {
            console.warn("safeCounterpartTranslate called with null interpolation name: " + key);
            args[key] = "null";
        }
    });
    let translated = counterpart_1.default.translate(text, args);
    if (translated === undefined && count !== undefined) {
        // counterpart does not do fallback if no pluralisation exists
        // in the preferred language, so do it here
        translated = counterpart_1.default.translate(text, Object.assign({}, args, { locale: DEFAULT_LOCALE }));
    }
    // The translation returns text so there's no XSS vector here (no unsafe HTML, no code execution)
    return translated;
}
exports._t = _t;
class AppLocalization {
    constructor({ store, components = [] }) {
        counterpart_1.default.registerTranslations("en", this.fetchTranslationJson("en_EN"));
        counterpart_1.default.setFallbackLocale("en");
        counterpart_1.default.setSeparator("|");
        if (Array.isArray(components)) {
            this.localizedComponents = new Set(components);
        }
        this.store = store;
        if (this.store.has(AppLocalization.STORE_KEY)) {
            const locales = this.store.get(AppLocalization.STORE_KEY);
            this.setAppLocale(locales);
        }
        this.resetLocalizedUI();
    }
    fetchTranslationJson(locale) {
        try {
            console.log("Fetching translation json for locale: " + locale);
            return require(`./i18n/strings/${locale}.json`);
        }
        catch (e) {
            console.log(`Could not fetch translation json for locale: '${locale}'`, e);
            return null;
        }
    }
    setAppLocale(locales) {
        console.log(`Changing application language to ${locales}`);
        if (!Array.isArray(locales)) {
            locales = [locales];
        }
        locales.forEach((locale) => {
            const translations = this.fetchTranslationJson(locale);
            if (translations !== null) {
                counterpart_1.default.registerTranslations(locale, translations);
            }
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - this looks like a bug but is out of scope for this conversion
        counterpart_1.default.setLocale(locales);
        this.store.set(AppLocalization.STORE_KEY, locales);
        this.resetLocalizedUI();
    }
    resetLocalizedUI() {
        console.log("Resetting the UI components after locale change");
        this.localizedComponents.forEach((componentSetup) => {
            if (typeof componentSetup === "function") {
                componentSetup();
            }
        });
    }
}
exports.AppLocalization = AppLocalization;
AppLocalization.STORE_KEY = "locale";
//# sourceMappingURL=language-helper.js.map
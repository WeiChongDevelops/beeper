import { Readability } from "@mozilla/readability";
import axios from "axios";
import jsdom from "jsdom";

export const curl = async (url: string) => {
    const o = await axios.get<string>(url, { maxRedirects: 5, timeout: 30000 });
    return o.data;
};

export const applyReadabilityToHtml = async (html: string) => {
    const virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on("error", () => {
        // Skip console errors otherwise this gets noisy.
    });
    const doc = new jsdom.JSDOM(html, { virtualConsole });
    const o = new Readability(doc.window.document, {}).parse();
    if (!o) return "";
    return [o.title, o.byline, o.excerpt, o.textContent].join("\n");
};

import sanitizeHtmlLib from "sanitize-html";

// Strict allow-list for community post / comment rich text. No styles, classes,
// ids, scripts, images, or event handlers — only basic formatting + safe links.
// Uses sanitize-html (pure JS, htmlparser2-based) so it runs safely server-side
// in serverless bundles — unlike jsdom-based sanitizers, which 500 there.
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
  transformTags: {
    // Force every surviving link to open safely.
    a: (_tagName, attribs) => ({
      tagName: "a",
      attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer nofollow" },
    }),
  },
};

/** Sanitize user HTML down to the safe allow-list. Safe to store + render. */
export function sanitizePostHtml(html: string): string {
  return sanitizeHtmlLib(html ?? "", OPTIONS);
}

/** Strip all tags to plain text — used for length / profanity / snippets / search. */
export function htmlToText(html: string): string {
  return sanitizeHtmlLib(html ?? "", { allowedTags: [], allowedAttributes: {} }).trim();
}

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;
export function looksLikeHtml(s: string): boolean {
  return HTML_TAG_RE.test(s);
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Render-ready HTML for a post body: sanitize rich HTML, or escape + <br> legacy plain text. */
export function postBodyHtml(content: string): string {
  if (!content) return "";
  if (looksLikeHtml(content)) return sanitizePostHtml(content);
  return escapeHtml(content).replace(/\n/g, "<br>");
}

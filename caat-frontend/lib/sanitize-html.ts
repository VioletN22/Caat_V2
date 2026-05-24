import DOMPurify from "isomorphic-dompurify";

// Strict allow-list for community post / comment rich text. No styles, classes,
// ids, scripts, images, or event handlers — only basic formatting + safe links.
const ALLOWED_TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li"];
const ALLOWED_ATTR = ["href", "target", "rel"];

let hookRegistered = false;
function ensureHook() {
  if (hookRegistered) return;
  hookRegistered = true;
  // Force every surviving link to open safely.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if ((node as Element).tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer nofollow");
    }
  });
}

/** Sanitize user HTML down to the safe allow-list. Safe to store + render. */
export function sanitizePostHtml(html: string): string {
  ensureHook();
  return DOMPurify.sanitize(html ?? "", {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:)/i,
  });
}

/** Strip all tags to plain text — used for length / profanity / snippets / search. */
export function htmlToText(html: string): string {
  return DOMPurify.sanitize(html ?? "", { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
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

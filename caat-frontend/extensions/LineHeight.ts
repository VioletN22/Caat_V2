import { Extension } from "@tiptap/core";

/**
 * Adds a `lineHeight` attribute to block nodes (paragraph + heading), rendered
 * as an inline `line-height` style so it carries into the preview + printed
 * PDF. Set it via `editor.chain().updateAttributes("paragraph", { lineHeight })`
 * (mirrored for "heading"); the toolbar does this for the whole selection.
 */
export const LineHeightExtension = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style.lineHeight || null,
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
});

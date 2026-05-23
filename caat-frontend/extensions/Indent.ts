import { Extension } from "@tiptap/core";

const STEP_EM = 1.5;
export const MAX_INDENT = 8;

/**
 * Adds an `indent` level (0..MAX_INDENT) to block nodes, rendered as an inline
 * `margin-left` so it carries into the preview + printed PDF. The toolbar's
 * indent/outdent buttons read the current level and updateAttributes.
 */
export const IndentExtension = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const ml = (element as HTMLElement).style.marginLeft;
              if (!ml) return 0;
              const n = parseFloat(ml);
              return Number.isNaN(n) ? 0 : Math.round(n / STEP_EM);
            },
            renderHTML: (attributes) => {
              const level = Number(attributes.indent) || 0;
              if (level <= 0) return {};
              return { style: `margin-left: ${level * STEP_EM}em` };
            },
          },
        },
      },
    ];
  },
});

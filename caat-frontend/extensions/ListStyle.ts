import { Extension } from "@tiptap/core";

/**
 * Adds a `listStyleType` attribute to list nodes, rendered as an inline
 * `list-style-type` style so the chosen bullet/number marker carries into the
 * preview + printed PDF. The toolbar sets it via updateAttributes on the
 * active list type.
 */
export const ListStyleExtension = Extension.create({
  name: "listStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          listStyleType: {
            default: null,
            parseHTML: (element) => (element as HTMLElement).style.listStyleType || null,
            renderHTML: (attributes) => {
              if (!attributes.listStyleType) return {};
              return { style: `list-style-type: ${attributes.listStyleType}` };
            },
          },
        },
      },
    ];
  },
});

"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import React, { useEffect } from "react";
import { FontSizeExtension } from "@/extensions/FontSize";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FONT_FAMILIES: { value: string; label: string }[] = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier" },
];

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];

const ToolbarButton = ({
  onClick,
  isActive,
  children,
  label,
}: {
  onClick: () => void;
  isActive: boolean;
  children: React.ReactNode;
  label: string;
}) => (
  <button
    onClick={onClick}
    aria-label={label}
    aria-pressed={isActive}
    className={`px-2 py-1 rounded-md transition text-sm font-medium ${
      isActive
        ? "bg-blue-600 text-white"
        : "bg-background text-foreground hover:bg-muted"
    }`}
  >
    {children}
  </button>
);

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({
  content,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSizeExtension,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  }, [content, editor]);

  // Opening a Radix Select moves focus out of the editor, which collapses the
  // visible selection. We snapshot the editor's selection range the moment a
  // font/size dropdown opens, then restore it before applying the mark so the
  // change lands on the text the user had selected (matching the old native
  // <select> behaviour). A collapsed range still works — it sets the stored
  // mark for the next typed text.
  const savedSelection = React.useRef<{ from: number; to: number } | null>(null);
  const snapshotSelection = (open: boolean) => {
    if (open && editor) {
      const { from, to } = editor.state.selection;
      savedSelection.current = { from, to };
    }
  };
  const withSavedSelection = () => {
    const chain = editor!.chain().focus();
    const sel = savedSelection.current;
    return sel ? chain.setTextSelection(sel) : chain;
  };

  if (!editor) {
    return (
      <div className="border rounded-md p-2 min-h-30 text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap items-center gap-2 mb-3 bg-muted p-2 rounded-md"
      >
        <ToolbarButton
          label="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          B
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          I
        </ToolbarButton>

        <ToolbarButton
          label="Align left"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={editor.isActive({ textAlign: "left" })}
        >
          Left
        </ToolbarButton>

        <ToolbarButton
          label="Align center"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={editor.isActive({ textAlign: "center" })}
        >
          Center
        </ToolbarButton>

        <ToolbarButton
          label="Align right"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={editor.isActive({ textAlign: "right" })}
        >
          Right
        </ToolbarButton>

        {/* Font family — shadcn Select. onCloseAutoFocus is prevented so the
            Radix popover doesn't yank focus back to the trigger; the
            onValueChange runs editor.focus() which restores ProseMirror's
            (retained) selection and applies the mark to it. */}
        <Select
          value={editor.getAttributes("textStyle").fontFamily || undefined}
          onOpenChange={snapshotSelection}
          onValueChange={(v) => withSavedSelection().setFontFamily(v).run()}
        >
          <SelectTrigger size="sm" className="w-auto gap-1.5 text-sm" aria-label="Font family">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={editor.getAttributes("textStyle").fontSize || undefined}
          onOpenChange={snapshotSelection}
          onValueChange={(v) =>
            withSavedSelection().setMark("textStyle", { fontSize: v }).run()
          }
        >
          <SelectTrigger size="sm" className="w-auto gap-1.5 text-sm" aria-label="Font size">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("px", "")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Editor area */}
      <div className="border rounded-md p-2 min-h-30 bg-background text-foreground focus-within:ring-1 focus-within:ring-ring">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

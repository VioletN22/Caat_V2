"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle, Color, BackgroundColor } from "@tiptap/extension-text-style";
import React, { useEffect } from "react";
import { FontSizeExtension } from "@/extensions/FontSize";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Link2, Highlighter, Baseline, ChevronDown, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FONT_FAMILIES: { value: string; label: string }[] = [
  { value: "Arial", label: "Arial" },
  { value: "Georgia", label: "Georgia" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Comic Sans MS", label: "Comic Sans" },
  { value: "Verdana", label: "Verdana" },
  { value: "Courier New", label: "Courier" },
];
const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const TEXT_COLORS: { value: string | null; label: string }[] = [
  { value: null, label: "Default" },
  { value: "#0a0a0a", label: "Black" },
  { value: "#9a1a27", label: "CAAT red" },
  { value: "#525252", label: "Grey" },
  { value: "#2563eb", label: "Blue" },
  { value: "#16a34a", label: "Green" },
];
const HIGHLIGHTS: { value: string | null; label: string }[] = [
  { value: null, label: "None" },
  { value: "#fef08a", label: "Yellow" },
  { value: "#bbf7d0", label: "Green" },
  { value: "#bfdbfe", label: "Blue" },
  { value: "#fbcfe8", label: "Pink" },
];

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
    type="button"
    onClick={onClick}
    aria-label={label}
    aria-pressed={isActive}
    title={label}
    className={`inline-flex h-8 min-w-8 items-center justify-center px-2 rounded-md transition text-sm font-medium ${
      isActive ? "bg-[#9a1a27] text-white" : "bg-background text-foreground hover:bg-muted"
    }`}
  >
    {children}
  </button>
);

const Divider = () => <span className="mx-0.5 h-6 w-px bg-border" aria-hidden />;

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      TextStyle,
      Color,
      BackgroundColor,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSizeExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
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

  // Snapshot the editor selection when a Radix popover opens (it moves focus
  // out of the editor, collapsing the visible selection), and restore it before
  // applying the change so marks land on the originally-selected text.
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

  // Link input (inline)
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");
  const openLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const { from, to } = editor.state.selection;
    savedSelection.current = { from, to };
    setLinkValue(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  };
  const applyLink = () => {
    const url = linkValue.trim();
    if (url) {
      withSavedSelection().extendMarkRange("link").setLink({ href: url }).run();
    }
    setLinkOpen(false);
    setLinkValue("");
  };

  if (!editor) {
    return (
      <div className="border rounded-md p-2 min-h-30 text-muted-foreground">Loading editor...</div>
    );
  }

  const currentHeading = editor.isActive("heading", { level: 1 })
    ? "1"
    : editor.isActive("heading", { level: 2 })
      ? "2"
      : editor.isActive("heading", { level: 3 })
        ? "3"
        : "normal";

  return (
    <div>
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap items-center gap-1.5 mb-3 bg-muted p-2 rounded-md"
      >
        <ToolbarButton label="Bold" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive("bold")}>
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive("italic")}>
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive("underline")}>
          <Underline className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        {/* Heading level */}
        <Select
          value={currentHeading}
          onOpenChange={snapshotSelection}
          onValueChange={(v) =>
            v === "normal"
              ? withSavedSelection().setParagraph().run()
              : withSavedSelection().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run()
          }
        >
          <SelectTrigger size="sm" className="w-auto gap-1.5 text-sm" aria-label="Text style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="1">Heading 1</SelectItem>
            <SelectItem value="2">Heading 2</SelectItem>
            <SelectItem value="3">Heading 3</SelectItem>
          </SelectContent>
        </Select>

        <Divider />

        <ToolbarButton label="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive("bulletList")}>
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive("orderedList")}>
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton label="Align left" onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={editor.isActive({ textAlign: "left" })}>
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Align center" onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={editor.isActive({ textAlign: "center" })}>
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="Align right" onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={editor.isActive({ textAlign: "right" })}>
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <Divider />

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
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={editor.getAttributes("textStyle").fontSize || undefined}
          onOpenChange={snapshotSelection}
          onValueChange={(v) => withSavedSelection().setMark("textStyle", { fontSize: v }).run()}
        >
          <SelectTrigger size="sm" className="w-auto gap-1.5 text-sm" aria-label="Font size">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("px", "")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Divider />

        {/* Text colour */}
        <DropdownMenu onOpenChange={snapshotSelection}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Text colour">
              <Baseline className="h-4 w-4" style={{ color: editor.getAttributes("textStyle").color || undefined }} />
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            {TEXT_COLORS.map((c) => (
              <DropdownMenuItem
                key={c.label}
                onSelect={() =>
                  c.value
                    ? withSavedSelection().setColor(c.value).run()
                    : withSavedSelection().unsetColor().run()
                }
              >
                <span className="h-3.5 w-3.5 rounded-sm border" style={{ background: c.value ?? "transparent" }} />
                {c.label}
                {(editor.getAttributes("textStyle").color || null) === c.value ? (
                  <Check className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Highlight */}
        <DropdownMenu onOpenChange={snapshotSelection}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5" aria-label="Highlight">
              <Highlighter className="h-4 w-4" />
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
            {HIGHLIGHTS.map((h) => (
              <DropdownMenuItem
                key={h.label}
                onSelect={() =>
                  h.value
                    ? withSavedSelection().setBackgroundColor(h.value).run()
                    : withSavedSelection().unsetBackgroundColor().run()
                }
              >
                <span className="h-3.5 w-3.5 rounded-sm border" style={{ background: h.value ?? "transparent" }} />
                {h.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Divider />

        <ToolbarButton label="Link" onClick={openLink} isActive={editor.isActive("link")}>
          <Link2 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Inline link input */}
      {linkOpen && (
        <div className="flex items-center gap-2 mb-3">
          <Input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") {
                setLinkOpen(false);
                setLinkValue("");
              }
            }}
            placeholder="https://example.com"
            className="h-8 text-sm max-w-xs"
            aria-label="Link URL"
          />
          <Button size="sm" className="h-8" onClick={applyLink}>Apply</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => { setLinkOpen(false); setLinkValue(""); }}>
            Cancel
          </Button>
        </div>
      )}

      {/* Editor area */}
      <div className="border rounded-md p-2 min-h-30 bg-background text-foreground focus-within:ring-1 focus-within:ring-ring">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

"use client";

import { GripVertical, X, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWidgetById } from "./widget-registry";
import type { PlacedWidget } from "./api";

interface WidgetCardProps {
  widget: PlacedWidget;
  /** Absolute-positioning style injected by WidgetGrid. */
  style?: React.CSSProperties;
  isDragging?: boolean;
  isResizing?: boolean;
  /** When false (mobile/tablet reflow), pointer drag/resize is disabled and
   *  controls are always visible rather than hover-gated. */
  interactive?: boolean;
  onRemove: (instanceId: string) => void;
  /** Called when the user presses on the drag handle. */
  onDragHandlePointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  /** Called when the user presses on the resize handle. */
  onResizeHandlePointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  /** Keyboard/step resize: nudge width/height by the given deltas. */
  onResizeStep?: (dw: number, dh: number) => void;
}

export function WidgetCard({
  widget,
  style,
  isDragging,
  isResizing,
  interactive = true,
  onRemove,
  onDragHandlePointerDown,
  onResizeHandlePointerDown,
  onResizeStep,
}: WidgetCardProps) {
  const definition = getWidgetById(widget.widgetId);
  if (!definition) return null;

  const Icon = definition.icon;
  const WidgetComponent = definition.component;

  // Controls are always visible when not interactive (touch/mobile reflow),
  // and revealed on hover or keyboard focus on the interactive desktop grid.
  const controlVisibility = interactive
    ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100"
    : "opacity-100";

  function handleResizeKeyDown(e: React.KeyboardEvent) {
    if (!onResizeStep) return;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        onResizeStep(1, 0);
        break;
      case "ArrowLeft":
        e.preventDefault();
        onResizeStep(-1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        onResizeStep(0, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        onResizeStep(0, -1);
        break;
    }
  }

  return (
    <div
      style={style}
      className="w-full"
      data-widget-id={widget.instanceId}
    >
      <Card
        className={`relative group overflow-hidden h-full flex flex-col ${
          isDragging || isResizing ? "ring-2 ring-primary/40 shadow-xl" : ""
        }`}
      >
        <CardHeader className="flex flex-row items-center gap-2 pb-2 pt-2.5 px-4 shrink-0">
          {/* Drag handle — pointer drag only on the interactive desktop grid */}
          {interactive && (
            <button
              onPointerDown={onDragHandlePointerDown}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors touch-none"
              aria-label={`Drag to move ${definition.title}`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

          <CardTitle className="text-sm font-medium flex-1">
            {definition.title}
          </CardTitle>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 transition-opacity text-muted-foreground hover:text-destructive shrink-0 ${controlVisibility}`}
            onClick={() => onRemove(widget.instanceId)}
            aria-label={`Remove ${definition.title}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="px-4 pb-3 pt-0 flex-1 min-h-0 overflow-hidden flex flex-col">
          <WidgetComponent />
        </CardContent>

        {/* Resize handle — bottom-right corner. A real button so it is
            keyboard-reachable; arrow keys grow/shrink, pointer-drag on the
            interactive desktop grid. */}
        <button
          type="button"
          onPointerDown={interactive ? onResizeHandlePointerDown : undefined}
          onKeyDown={handleResizeKeyDown}
          className={`absolute bottom-1 right-1 p-1 text-muted-foreground touch-none transition-opacity hover:!opacity-100 ${
            interactive ? "cursor-se-resize" : "cursor-default"
          } ${controlVisibility}`}
          aria-label={`Resize ${definition.title}. Use arrow keys to grow or shrink.`}
        >
          <GripHorizontal className="h-3 w-3 rotate-45" />
        </button>
      </Card>
    </div>
  );
}

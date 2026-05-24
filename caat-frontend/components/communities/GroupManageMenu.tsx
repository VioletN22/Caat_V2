"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings, Lock, Globe, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { updateGroupAction, deleteGroupAction } from "@/app/(main)/communities/actions";
import { cn } from "@/lib/utils";

interface GroupManageMenuProps {
  groupId: string;
  groupSlug: string;
  initialName: string;
  initialDescription: string;
  initialIsPrivate: boolean;
}

export function GroupManageMenu({ groupId, groupSlug, initialName, initialDescription, initialIsPrivate }: GroupManageMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (name.trim().length < 3) { toast.error("Name must be at least 3 characters"); return; }
    startTransition(async () => {
      const { error } = await updateGroupAction(groupId, {
        name: name.trim(),
        description,
        is_private: isPrivate,
      });
      if (error) { toast.error(error); return; }
      toast.success("Community updated.");
      setOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const { error } = await deleteGroupAction(groupId);
      if (error) { toast.error(error); return; }
      toast.success("Community deleted.");
      router.push("/communities/groups");
    });
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirmingDelete(false); }}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="w-full gap-1.5">
          <Settings className="size-3.5" />
          Manage community
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage community</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="mg-name">Name</Label>
            <Input id="mg-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            <p className="text-xs text-muted-foreground">URL stays <span className="font-mono">c/{groupSlug}</span> (renaming keeps existing links working).</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mg-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea id="mg-desc" value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none min-h-[80px] text-sm" maxLength={280} />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsPrivate(false)} className={cn("flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors", !isPrivate ? "border-foreground bg-muted/40" : "hover:bg-muted/30")}>
                <div className="flex items-center gap-1.5"><Globe className="size-3.5" /><span className="text-sm font-medium">Public</span></div>
                <span className="text-[11px] text-muted-foreground">Anyone can view and join</span>
              </button>
              <button type="button" onClick={() => setIsPrivate(true)} className={cn("flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors", isPrivate ? "border-foreground bg-muted/40" : "hover:bg-muted/30")}>
                <div className="flex items-center gap-1.5"><Lock className="size-3.5" /><span className="text-sm font-medium">Private</span></div>
                <span className="text-[11px] text-muted-foreground">Only members can see posts</span>
              </button>
            </div>
          </div>

          <Button onClick={handleSave} disabled={isPending || name.trim().length < 3} className="w-full">
            {isPending ? "Saving…" : "Save changes"}
          </Button>

          <div className="rounded-lg border border-destructive/30 p-3 space-y-2">
            <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Danger zone</p>
            {confirmingDelete ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Delete <span className="font-medium">{name}</span> and all of its posts? This can&rsquo;t be undone.</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="flex-1" onClick={() => setConfirmingDelete(false)} disabled={isPending}>Cancel</Button>
                  <Button size="sm" variant="destructive" className="flex-1 gap-1.5" onClick={handleDelete} disabled={isPending}>
                    <Trash2 className="size-3.5" />{isPending ? "Deleting…" : "Delete"}
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-destructive hover:text-destructive" onClick={() => setConfirmingDelete(true)}>
                <Trash2 className="size-3.5" /> Delete community
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

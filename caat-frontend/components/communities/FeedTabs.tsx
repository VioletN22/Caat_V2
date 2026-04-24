"use client";

import { cn } from "@/lib/utils";

type FeedTab = "all" | "following";

interface FeedTabsProps {
  activeTab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className="flex gap-1 border-b mb-4">
      {(["all", "following"] as FeedTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors capitalize border-b-2 -mb-px",
            activeTab === tab
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab === "all" ? "All Posts" : "Following"}
        </button>
      ))}
    </div>
  );
}

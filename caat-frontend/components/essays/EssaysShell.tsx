"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Lightbulb, Save } from "lucide-react";

/* ---------------------------
   Mock data: common essay prompts
   (Replace with API/DB when backend is ready)
---------------------------- */

const ESSAY_PROMPTS = [
  {
    id: "personal-statement",
    title: "Personal Statement",
    description: "Common App main essay (650 words).",
    tips: "Focus on a specific moment or theme that reveals your character. Show, don't tell. Be authentic—admissions officers read thousands of essays; yours should sound like you. Start with a hook that draws the reader in.",
  },
  {
    id: "why-this-college",
    title: "Why This College?",
    description: "Why do you want to attend this school?",
    tips: "Research specific programs, professors, or opportunities. Avoid generic praise. Tie your academic and career goals to what the school offers. Mention 2–3 concrete examples (e.g. a lab, a club, a course).",
  },
  {
    id: "why-this-major",
    title: "Why This Major?",
    description: "Why are you interested in this field of study?",
    tips: "Connect your past experiences (courses, projects, reading) to your chosen major. Discuss what you hope to learn and how it fits your long-term goals. Be specific to the department, not just the discipline.",
  },
  {
    id: "community-contribution",
    title: "Community / Contribution",
    description: "How will you contribute to our community?",
    tips: "Highlight unique perspectives, skills, or experiences you'll bring. Mention clubs, initiatives, or campus culture you're excited to join. Balance what you'll give with what you hope to gain.",
  },
] as const;

type PromptId = (typeof ESSAY_PROMPTS)[number]["id"];

export default function EssaysShell() {
  const [selectedPromptId, setSelectedPromptId] = useState<PromptId | null>(
    "personal-statement"
  );
  const [essayContent, setEssayContent] = useState("");
  // Placeholder: draft selector (no API/DB yet)
  const [selectedDraftLabel, setSelectedDraftLabel] = useState("Draft 1");

  const selectedPrompt = ESSAY_PROMPTS.find((p) => p.id === selectedPromptId);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Note: essays tied to profile — placeholder until auth/persistence is wired */}
      <p className="rounded-md border border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        Your essays will be saved to your account and persist across sessions once
        you’re signed in. (Placeholder: profile persistence not connected yet.)
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left: list of essay prompts */}
        <Card className="h-fit rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg">Essay prompts</CardTitle>
            <CardDescription>
              Choose a prompt to view tips and write your response.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {ESSAY_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                onClick={() => setSelectedPromptId(prompt.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                  selectedPromptId === prompt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent hover:bg-muted/50"
                }`}
              >
                <ChevronRight
                  className={`h-4 w-4 shrink-0 ${
                    selectedPromptId === prompt.id ? "rotate-90" : ""
                  }`}
                />
                <span className="font-medium">{prompt.title}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Right: selected prompt + guidance + editor */}
        <div className="flex min-h-100 min-w-0 flex-col gap-4">
          {selectedPrompt ? (
            <>
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedPrompt.title}</CardTitle>
                  <CardDescription>{selectedPrompt.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 text-muted-foreground"
                      >
                        <Lightbulb className="h-4 w-4" />
                        Tips & guidance
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedPrompt.tips}
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>

              <Card className="flex flex-1 flex-col rounded-xl">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b pb-4">
                  <div>
                    <CardTitle className="text-base">Your response</CardTitle>
                    <CardDescription>
                      Write your essay here. Auto-save will be enabled when
                      connected. (Placeholder.)
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Placeholder: drafts selector — no API/DB yet */}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="draft-select" className="text-sm text-muted-foreground">
                        Draft
                      </Label>
                      <Button
                        id="draft-select"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDraftLabel(
                          selectedDraftLabel === "Draft 1" ? "Draft 2" : "Draft 1"
                        )}
                      >
                        {selectedDraftLabel} (placeholder)
                      </Button>
                    </div>
                    {/* Placeholder: save button — no API/DB yet */}
                    <Button size="sm" disabled>
                      <Save className="h-4 w-4" />
                      Save (placeholder)
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col pt-4">
                  {/* Placeholder: "Last saved" — no auto-save yet */}
                  <p className="mb-2 text-xs text-muted-foreground">
                    Last saved: — (auto-save not connected yet)
                  </p>
                  <Textarea
                    placeholder="Start writing your essay here. Your work will be saved to your profile once persistence is connected."
                    value={essayContent}
                    onChange={(e) => setEssayContent(e.target.value)}
                    className="min-h-70 flex-1 resize-y font-mono text-sm"
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="flex flex-1 items-center justify-center rounded-xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                Select an essay prompt from the list to view guidance and start
                writing.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

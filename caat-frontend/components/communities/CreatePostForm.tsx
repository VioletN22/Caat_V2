"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { PlusCircle, X, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getInitials } from "@/lib/user-utils";
import { cn } from "@/lib/utils";
import type { CommunityPost, PostAuthor, TopicTag, ResultCard, ScoreCard } from "@/types/community";
import { TOPIC_LABELS } from "@/types/community";
import { createPostAction } from "@/app/(main)/communities/actions";

const TOPIC_TAGS = Object.keys(TOPIC_LABELS) as TopicTag[];

const EXAM_OPTIONS = ["SAT", "ACT", "IB", "A-Levels", "ATAR", "AP"] as const;
const OUTCOME_OPTIONS = [
  { value: "accepted",   label: "Accepted",   icon: CheckCircle, color: "text-green-600" },
  { value: "waitlisted", label: "Waitlisted", icon: Clock,        color: "text-amber-600" },
  { value: "rejected",   label: "Rejected",   icon: XCircle,      color: "text-red-600" },
] as const;

interface CreatePostFormProps {
  currentUser: PostAuthor | null;
  onPostCreated: (post: CommunityPost) => void;
}

export function CreatePostForm({ currentUser, onPostCreated }: CreatePostFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [topicTag, setTopicTag] = useState<TopicTag | "">("");
  const [showResult, setShowResult] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [resultOutcome, setResultOutcome] = useState<ResultCard["outcome"] | "">("");
  const [resultUniversity, setResultUniversity] = useState("");
  const [resultProgram, setResultProgram] = useState("");
  const [scoreExam, setScoreExam] = useState<ScoreCard["exam"] | "">("");
  const [scoreValue, setScoreValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const authorName = currentUser
    ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(" ") || "You"
    : "You";

  useEffect(() => {
    if (isExpanded) textareaRef.current?.focus();
  }, [isExpanded]);

  function reset() {
    setContent("");
    setTopicTag("");
    setShowResult(false);
    setShowScore(false);
    setResultOutcome("");
    setResultUniversity("");
    setResultProgram("");
    setScoreExam("");
    setScoreValue("");
    setIsExpanded(false);
  }

  function handleSubmit() {
    if (!content.trim()) return toast.error("Write something before posting.");
    if (!topicTag) return toast.error("Select a topic for your post.");
    if (showResult && (!resultOutcome || !resultUniversity.trim())) {
      return toast.error("Fill in the result card or remove it.");
    }
    if (showScore && (!scoreExam || !scoreValue.trim())) {
      return toast.error("Fill in the score card or remove it.");
    }

    const resultCard: ResultCard | null = showResult && resultOutcome && resultUniversity.trim()
      ? { outcome: resultOutcome, university_name: resultUniversity.trim(), program: resultProgram.trim() || undefined }
      : null;

    const scoreCard: ScoreCard | null = showScore && scoreExam && scoreValue.trim()
      ? { exam: scoreExam, score: scoreValue.trim() }
      : null;

    startTransition(async () => {
      const { post, error } = await createPostAction({
        content: content.trim(),
        topic_tag: topicTag,
        result_card: resultCard,
        score_card: scoreCard,
      });

      if (error || !post) {
        toast.error(error ?? "Failed to create post.");
        return;
      }

      toast.success("Post shared.");
      onPostCreated(post);
      reset();
    });
  }

  const charCount = content.length;
  const isOverLimit = charCount > 2000;

  if (!isExpanded) {
    return (
      <Card
        className="w-full cursor-text"
        onClick={() => setIsExpanded(true)}
      >
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-9 shrink-0">
              <AvatarImage src={currentUser?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {getInitials(authorName)}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm text-muted-foreground select-none">
              Share your experience, results, or advice…
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4 pb-3 space-y-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Avatar className="size-9 shrink-0">
            <AvatarImage src={currentUser?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {getInitials(authorName)}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{authorName}</p>
        </div>

        {/* Content textarea */}
        <div className="space-y-1">
          <Textarea
            ref={textareaRef}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="resize-none min-h-[100px]"
            maxLength={2100}
          />
          <p className={cn("text-xs text-right", isOverLimit ? "text-red-500" : "text-muted-foreground")}>
            {charCount} / 2000
          </p>
        </div>

        {/* Topic select */}
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Topic *</Label>
          <Select value={topicTag} onValueChange={(v) => setTopicTag(v as TopicTag)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a topic" />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_TAGS.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {TOPIC_LABELS[tag]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Attachment toggles */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={showResult ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowResult((v) => !v)}
          >
            {showResult ? <X className="size-3" /> : <PlusCircle className="size-3" />}
            Result
          </Button>
          <Button
            type="button"
            variant={showScore ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setShowScore((v) => !v)}
          >
            {showScore ? <X className="size-3" /> : <PlusCircle className="size-3" />}
            Score
          </Button>
        </div>

        {/* Result card inputs */}
        {showResult && (
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Result Card</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Outcome *</Label>
              <Select value={resultOutcome} onValueChange={(v) => setResultOutcome(v as ResultCard["outcome"])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {OUTCOME_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className={opt.color}>{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">University *</Label>
              <Input
                placeholder="e.g. University of Toronto"
                value={resultUniversity}
                onChange={(e) => setResultUniversity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Program (optional)</Label>
              <Input
                placeholder="e.g. Computer Science"
                value={resultProgram}
                onChange={(e) => setResultProgram(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Score card inputs */}
        {showScore && (
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Score Card</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Exam *</Label>
                <Select value={scoreExam} onValueChange={(v) => setScoreExam(v as ScoreCard["exam"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Exam type" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_OPTIONS.map((exam) => (
                      <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Score *</Label>
                <Input
                  placeholder="e.g. 1520"
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2 justify-end">
        <Separator className="mb-3 w-full absolute left-0" />
        <Button variant="ghost" size="sm" onClick={reset} disabled={isPending}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isPending || isOverLimit || !content.trim() || !topicTag}
        >
          {isPending ? "Posting…" : "Post"}
        </Button>
      </CardFooter>
    </Card>
  );
}

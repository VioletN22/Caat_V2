"use client";

import React, { useState } from "react";
import { Award, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProfileCard } from "./ProfileCard";
import {
  CURRICULUM_OPTIONS,
  GPA_SCALES,
  ENGLISH_PROFICIENCY_TESTS,
  type StandardisedTestScore,
  type StandardisedTestSubjectRow,
} from "@/types/profile";

interface StandardisedTestingCardProps {
  scores: StandardisedTestScore[];
  onSave: (scores: StandardisedTestScore[]) => Promise<void>;
}

// ── Display helpers ────────────────────────────────────────────────────────────

function scoreMaxLabel(score: StandardisedTestScore): string | null {
  switch (score.curriculum) {
    case "SAT": return "/ 1600";
    case "ATAR": return "/ 99.95";
    case "IB": return "/ 46";
    case "GPA": return score.score_scale ? `/ ${score.score_scale}` : null;
    case "CBSE": return "/ 100";
    case "CISCE": return "/ 100";
    case "French Baccalauréat": return "/ 20";
    case "Gaokao": return "/ 750";
    case "German Abitur": return "/ 900";
    case "English Proficiency": {
      const test = ENGLISH_PROFICIENCY_TESTS.find(
        (t) => t.label === score.score_scale
      );
      return test ? `/ ${test.maxScore}` : null;
    }
    default: return null;
  }
}

function ScoreDisplay({ score }: { score: StandardisedTestScore }) {
  const max = scoreMaxLabel(score);
  const label =
    score.curriculum === "English Proficiency" && score.score_scale
      ? score.score_scale
      : score.curriculum;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      {score.cumulative_score && (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">
            {score.cumulative_score}
          </span>
          {max && <span className="text-sm text-muted-foreground">{max}</span>}
        </div>
      )}
      {score.subjects.length > 0 && (
        <div className="mt-1 flex flex-col gap-0.5">
          {score.subjects.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.subject_name}</span>
              <span className="font-medium">{s.grade}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Edit helpers ───────────────────────────────────────────────────────────────

function newSubject(): StandardisedTestSubjectRow {
  return {
    id: crypto.randomUUID(),
    test_score_id: "",
    subject_name: "",
    grade: "",
    created_at: new Date().toISOString(),
  };
}

function ScoreEditor({
  score,
  onChange,
  onRemove,
}: {
  score: StandardisedTestScore;
  onChange: (updated: StandardisedTestScore) => void;
  onRemove: () => void;
}) {
  // Curricula that support per-subject grade entries
  const SUBJECTS_CURRICULA = ["A-Levels", "IB", "AP", "IGCSE"];
  // Curricula that are subjects-only (no single cumulative score)
  const SUBJECTS_ONLY_CURRICULA = ["A-Levels", "IGCSE", "AP"];
  const hasSubjects = SUBJECTS_CURRICULA.includes(score.curriculum);
  const hasCumulative = !SUBJECTS_ONLY_CURRICULA.includes(score.curriculum);

  // Custom GPA scale: "custom mode" is on when a GPA score's scale is the
  // "custom" sentinel OR any free-form value not in the preset list.
  const gpaScaleValues: string[] = GPA_SCALES.map((s) => s.value);
  const isCustomScale =
    score.curriculum === "GPA" &&
    !!score.score_scale &&
    !gpaScaleValues.includes(score.score_scale);
  // Draft buffer for the custom-scale input, kept separate from score_scale so a
  // keystroke never flips isCustomScale and unmounts the input mid-typing. It is
  // committed into score_scale on blur.
  const [customScale, setCustomScale] = useState(
    isCustomScale && score.score_scale !== "custom" ? score.score_scale! : ""
  );

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-muted/30">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <Select
          value={score.curriculum || undefined}
          onValueChange={(v) =>
            onChange({
              ...score,
              curriculum: v,
              cumulative_score: null,
              score_scale: null,
              subjects: [],
            })
          }
        >
          <SelectTrigger size="sm" className="h-8 flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRICULUM_OPTIONS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* GPA scale selector */}
      {score.curriculum === "GPA" && (
        <Select
          value={isCustomScale ? "custom" : (score.score_scale ?? undefined)}
          onValueChange={(v) => onChange({ ...score, score_scale: v })}
        >
          <SelectTrigger size="sm" className="h-8 w-full">
            <SelectValue placeholder="Select scale…" />
          </SelectTrigger>
          <SelectContent>
            {GPA_SCALES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Custom GPA scale input — controlled by a draft, committed on blur so
          typing multiple characters no longer unmounts the field. */}
      {score.curriculum === "GPA" && isCustomScale && (
        <Input
          placeholder="Enter max score (e.g. 7.0)"
          className="h-8 text-sm"
          value={customScale}
          onChange={(e) => setCustomScale(e.target.value)}
          onBlur={() =>
            onChange({ ...score, score_scale: customScale.trim() || "custom" })
          }
        />
      )}

      {/* English proficiency test selector */}
      {score.curriculum === "English Proficiency" && (
        <Select
          value={score.score_scale ?? undefined}
          onValueChange={(v) => onChange({ ...score, score_scale: v })}
        >
          <SelectTrigger size="sm" className="h-8 w-full">
            <SelectValue placeholder="Select test…" />
          </SelectTrigger>
          <SelectContent>
            {ENGLISH_PROFICIENCY_TESTS.map((t) => (
              <SelectItem key={t.label} value={t.label}>
                {t.label} (/ {t.maxScore})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Cumulative score input */}
      {hasCumulative && (
        <Input
          placeholder={
            score.curriculum === "GPA"
              ? "Your GPA"
              : score.curriculum === "English Proficiency"
              ? "Your score"
              : "Score"
          }
          value={score.cumulative_score ?? ""}
          onChange={(e) =>
            onChange({ ...score, cumulative_score: e.target.value })
          }
          className="h-8 text-sm"
        />
      )}

      {/* Subject rows */}
      {hasSubjects && (
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Subjects
          </p>
          {score.subjects.map((sub, i) => (
            <div key={sub.id} className="flex items-center gap-2">
              <Input
                placeholder="Subject name"
                value={sub.subject_name}
                onChange={(e) => {
                  const updated = [...score.subjects];
                  updated[i] = { ...sub, subject_name: e.target.value };
                  onChange({ ...score, subjects: updated });
                }}
                className="h-8 text-sm flex-1"
              />
              <Input
                placeholder={
                  score.curriculum === "IB" ? "1–7" :
                  score.curriculum === "AP" ? "1–5" :
                  "A*, A, B…"
                }
                value={sub.grade}
                onChange={(e) => {
                  const updated = [...score.subjects];
                  updated[i] = { ...sub, grade: e.target.value };
                  onChange({ ...score, subjects: updated });
                }}
                className="h-8 text-sm w-24"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onChange({
                    ...score,
                    subjects: score.subjects.filter((_, idx) => idx !== i),
                  })
                }
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onChange({ ...score, subjects: [...score.subjects, newSubject()] })
            }
            className="h-7 text-xs border-dashed self-start"
          >
            <Plus className="h-3 w-3" />
            Add subject
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function StandardisedTestingCard({
  scores,
  onSave,
}: StandardisedTestingCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<StandardisedTestScore[]>(scores);

  function handleEdit() {
    setDraft(scores);
    setIsEditing(true);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setDraft(scores);
    setIsEditing(false);
  }

  function addCurriculum() {
    const used = new Set(draft.map((s) => s.curriculum));
    const next =
      CURRICULUM_OPTIONS.find((c) => !used.has(c)) ?? CURRICULUM_OPTIONS[0];
    setDraft((d) => [
      ...d,
      {
        id: crypto.randomUUID(),
        profile_id: "",
        curriculum: next,
        cumulative_score: null,
        score_scale: null,
        subjects: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  }

  return (
    <ProfileCard
      title="Standardised Testing"
      icon={<Award className="h-4 w-4" />}
      isEditing={isEditing}
      isSaving={isSaving}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      {isEditing ? (
        <div className="flex flex-col gap-3">
          {draft.map((score, i) => (
            <ScoreEditor
              key={score.id}
              score={score}
              onChange={(updated) =>
                setDraft((d) => d.map((s, idx) => (idx === i ? updated : s)))
              }
              onRemove={() =>
                setDraft((d) => d.filter((_, idx) => idx !== i))
              }
            />
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addCurriculum}
            className="border-dashed text-xs self-start"
          >
            <Plus className="h-3 w-3" />
            Add curriculum
          </Button>
        </div>
      ) : scores.length === 0 ? (
        <p className="text-sm text-muted-foreground">No test scores added yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {scores.map((score) => (
            <ScoreDisplay key={score.id} score={score} />
          ))}
        </div>
      )}
    </ProfileCard>
  );
}

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Major } from "@/types/majors";
import { CATEGORY_COLORS } from "@/constants/majors";

interface Props {
  majors: Major[];
}

export default function CompareTable({ majors }: Props) {
  const cols = majors.length;

  const gridStyle = {
    gridTemplateColumns: `11rem repeat(${cols}, 1fr)`,
  };

  const cellBorder = (i: number) =>
    `${i < cols - 1 ? "border-r" : ""}`;

  return (
    <div
      className="grid overflow-hidden text-sm"
      style={gridStyle}
    >
      {/* ── Major name headers ── */}
      <div className="bg-muted/50 p-4 border-b border-r" />
      {majors.map((major, i) => (
        <div
          key={major.id}
          className={`bg-muted/50 p-4 border-b ${cellBorder(i)}`}
        >
          <Link
            href={`/majors/${major.id}`}
            className="font-semibold text-base hover:underline underline-offset-2"
          >
            {major.name}
          </Link>
        </div>
      ))}

      {/* ── Category ── */}
      <div className="p-4 border-b border-r font-medium text-muted-foreground flex items-center">
        Category
      </div>
      {majors.map((major, i) => (
        <div
          key={major.id}
          className={`p-4 border-b ${cellBorder(i)} flex items-center`}
        >
          <span
            className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
              CATEGORY_COLORS[major.category] ??
              "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {major.category}
          </span>
        </div>
      ))}

      {/* ── Description ── */}
      <div className="p-4 border-b border-r font-medium text-muted-foreground">
        Description
      </div>
      {majors.map((major, i) => (
        <div
          key={major.id}
          className={`p-4 border-b ${cellBorder(i)} text-muted-foreground leading-relaxed`}
        >
          {major.description ?? "—"}
        </div>
      ))}

      {/* ── Career Paths ── */}
      <div className="p-4 border-b border-r font-medium text-muted-foreground">
        Career Paths
      </div>
      {majors.map((major, i) => (
        <div key={major.id} className={`p-4 border-b ${cellBorder(i)}`}>
          <div className="flex flex-wrap gap-1.5">
            {major.career_paths.map((path) => (
              <span
                key={path}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
              >
                {path}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* ── Typical Coursework ── */}
      <div className="p-4 border-r font-medium text-muted-foreground">
        Typical Coursework
      </div>
      {majors.map((major, i) => (
        <div key={major.id} className={`p-4 ${cellBorder(i)}`}>
          <ul className="space-y-1.5">
            {major.typical_coursework.map((course) => (
              <li key={course} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                {course}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

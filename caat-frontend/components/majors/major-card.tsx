import Link from "next/link";
import { Bookmark, Check, Plus } from "lucide-react";
import { Major } from "@/types/majors";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS } from "@/constants/majors";

interface Props {
  major: Major;
  isBookmarked: boolean;
  isSelected: boolean;
  canSelect: boolean;
  onToggleSelect: (id: string) => void;
  onToggleBookmark: (id: string) => void;
}

export default function MajorCard({
  major,
  isBookmarked,
  isSelected,
  canSelect,
  onToggleSelect,
  onToggleBookmark,
}: Props) {
  const categoryColor =
    CATEGORY_COLORS[major.category] ??
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <Card
      className={`flex flex-col h-full hover:shadow-lg transition-shadow ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
    >
      <CardHeader>
        <span
          className={`inline-block self-start text-xs font-medium px-2 py-0.5 rounded-full ${categoryColor}`}
        >
          {major.category}
        </span>
        <CardTitle className="text-lg leading-tight">
          <Link
            href={`/majors/${major.id}`}
            className="hover:underline underline-offset-2"
          >
            {major.name}
          </Link>
        </CardTitle>
        {major.description && (
          <CardDescription className="line-clamp-2">
            {major.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-grow" />

      <CardFooter className="justify-end gap-2">
        <Button
          size="sm"
          variant={isSelected ? "default" : "outline"}
          disabled={!canSelect && !isSelected}
          onClick={() => onToggleSelect(major.id)}
        >
          {isSelected ? (
            <>
              <Check />
              Selected
            </>
          ) : (
            <>
              <Plus />
              Compare
            </>
          )}
        </Button>

        <Button
          size="icon-sm"
          variant={isBookmarked ? "default" : "outline"}
          onClick={() => onToggleBookmark(major.id)}
          aria-label={isBookmarked ? "Remove bookmark" : "Bookmark major"}
        >
          <Bookmark className={isBookmarked ? "fill-current" : ""} />
        </Button>
      </CardFooter>
    </Card>
  );
}

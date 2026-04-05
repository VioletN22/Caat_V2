import type { MajorCategory } from "@/types/majors";

export const CATEGORY_COLORS: Record<string, string> = {
  Engineering:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Business:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "Health Sciences":
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "Arts & Humanities":
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  "Social Sciences":
    "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  "Natural Sciences":
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  Education:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export const MAJOR_CATEGORIES: (MajorCategory | "All")[] = [
  "All",
  "Engineering",
  "Business",
  "Health Sciences",
  "Arts & Humanities",
  "Social Sciences",
  "Natural Sciences",
  "Education",
];

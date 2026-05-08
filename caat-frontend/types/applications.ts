export type ApplicationStatus =
  | "researching"
  | "applying"
  | "submitted"
  | "decision_pending"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";

export interface ApplicationRow {
  id: string;
  user_id: string;
  school_id: number;
  status: ApplicationStatus;
  deadline_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  schools: { id: number; name: string; country: string | null } | null;
}

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "researching",
  "applying",
  "submitted",
  "decision_pending",
  "accepted",
  "rejected",
  "waitlisted",
  "withdrawn",
];

export const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  researching: {
    label: "Researching",
    className: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  },
  applying: {
    label: "Applying",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  },
  submitted: {
    label: "Submitted",
    className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  },
  decision_pending: {
    label: "Decision Pending",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  },
  accepted: {
    label: "Accepted",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  },
  rejected: {
    label: "Rejected",
    className: "bg-[#b81f2f]/10 text-[#b81f2f] dark:bg-[#b81f2f]/20 dark:text-[#b81f2f]",
  },
  waitlisted: {
    label: "Waitlisted",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

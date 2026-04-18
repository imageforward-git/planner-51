export const STATUS_CONFIG = {
  todo: { label: "To Do", color: "#94a3b8", bg: "bg-slate-100 text-slate-700" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  in_review: { label: "In Review", color: "#a855f7", bg: "bg-purple-100 text-purple-700" },
  done: { label: "Done", color: "#22c55e", bg: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "#ef4444", bg: "bg-red-100 text-red-700" },
} as const;

export const PRIORITY_CONFIG = {
  none: { label: "None", color: "#9ca3af", bg: "bg-gray-100 text-gray-600" },
  low: { label: "Low", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  medium: { label: "Medium", color: "#eab308", bg: "bg-yellow-100 text-yellow-700" },
  high: { label: "High", color: "#f97316", bg: "bg-orange-100 text-orange-700" },
  urgent: { label: "Urgent", color: "#ef4444", bg: "bg-red-100 text-red-700" },
} as const;

export const TYPE_CONFIG = {
  task: { label: "Task", bg: "bg-blue-100 text-blue-700" },
  note: { label: "Note", bg: "bg-green-100 text-green-700" },
  doc: { label: "Doc", bg: "bg-purple-100 text-purple-700" },
} as const;

export type Status = keyof typeof STATUS_CONFIG;
export type Priority = keyof typeof PRIORITY_CONFIG;
export type ItemType = keyof typeof TYPE_CONFIG;

export const STATUS_CYCLE: Status[] = ["todo", "in_progress", "in_review", "done"];

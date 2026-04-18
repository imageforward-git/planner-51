import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  STATUS_CYCLE,
  type Status,
  type Priority,
  type ItemType,
} from "../lib/constants";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function WorkspaceHome() {
  const { slug } = useParams({ from: "/w/$slug" });

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("task");
  const [createStatus, setCreateStatus] = useState<Status>("todo");
  const [createPriority, setCreatePriority] = useState<Priority>("none");
  const [createDueDate, setCreateDueDate] = useState("");

  // Filter state
  const [filterStatus, setFilterStatus] = useState<Status | "">("");
  const [filterPriority, setFilterPriority] = useState<Priority | "">("");
  const [filterType, setFilterType] = useState<ItemType | "">("");

  const workspaces = trpc.workspace.list.useQuery();
  const ws = workspaces.data?.find((m) => m.workspace.slug === slug);
  const workspaceId = ws?.workspace.id;

  const filter: Record<string, string> = {};
  if (filterStatus) filter.status = filterStatus;
  if (filterPriority) filter.priority = filterPriority;
  if (filterType) filter.type = filterType;

  const itemsQuery = trpc.item.list.useQuery(
    { workspaceId: workspaceId!, filter: Object.keys(filter).length > 0 ? filter : undefined },
    { enabled: !!workspaceId }
  );

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
      setTitle("");
      setType("task");
      setCreateStatus("todo");
      setCreatePriority("none");
      setCreateDueDate("");
      setShowCreate(false);
    },
  });

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
    },
  });

  function cycleStatus(itemId: string, currentStatus: string) {
    const idx = STATUS_CYCLE.indexOf(currentStatus as Status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    updateItem.mutate({ id: itemId, status: next });
  }

  if (!workspaceId) {
    return <div className="p-8 text-gray-500">Loading workspace...</div>;
  }

  const activeFilters: { key: string; label: string; onRemove: () => void }[] = [];
  if (filterStatus) {
    activeFilters.push({
      key: "status",
      label: `Status: ${STATUS_CONFIG[filterStatus].label}`,
      onRemove: () => setFilterStatus(""),
    });
  }
  if (filterPriority) {
    activeFilters.push({
      key: "priority",
      label: `Priority: ${PRIORITY_CONFIG[filterPriority].label}`,
      onRemove: () => setFilterPriority(""),
    });
  }
  if (filterType) {
    activeFilters.push({
      key: "type",
      label: `Type: ${TYPE_CONFIG[filterType].label}`,
      onRemove: () => setFilterType(""),
    });
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4 shrink-0">
        <h2 className="text-lg font-bold mb-4">{ws?.workspace.name}</h2>
        <nav className="space-y-1">
          <Link
            to="/w/$slug"
            params={{ slug }}
            className="block px-3 py-2 rounded font-medium bg-blue-50 text-blue-700"
          >
            List
          </Link>
          <Link
            to="/w/$slug/board"
            params={{ slug }}
            className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
          >
            Board
          </Link>
          <Link
            to="/w/$slug/graph"
            params={{ slug }}
            className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
          >
            Graph
          </Link>
          <Link
            to="/w/$slug/search"
            params={{ slug }}
            className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
          >
            Search
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Items</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            + New Item
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="mb-6 rounded-lg border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Create New Item</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Item title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && title.trim()) {
                      createItem.mutate({
                        workspaceId,
                        type,
                        title,
                        status: createStatus,
                        priority: createPriority,
                        dueDate: createDueDate || undefined,
                      });
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ItemType)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  >
                    {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={createDueDate}
                    onChange={(e) => setCreateDueDate(e.target.value)}
                    className="w-full rounded-md border px-2 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-1">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setCreateStatus(k as Status)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      createStatus === k ? v.bg + " ring-2 ring-offset-1 ring-current" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => setCreatePriority(k as Priority)}
                    className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      createPriority === k ? v.bg + " ring-2 ring-offset-1 ring-current" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    createItem.mutate({
                      workspaceId,
                      type,
                      title,
                      status: createStatus,
                      priority: createPriority,
                      dueDate: createDueDate || undefined,
                    })
                  }
                  disabled={!title.trim()}
                  className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Status | "")}
            className="rounded-md border px-2 py-1 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as Priority | "")}
            className="rounded-md border px-2 py-1 text-sm bg-white"
          >
            <option value="">All Priorities</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ItemType | "")}
            className="rounded-md border px-2 py-1 text-sm bg-white"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex gap-2 mb-4">
            {activeFilters.map((f) => (
              <span
                key={f.key}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
              >
                {f.label}
                <button
                  onClick={f.onRemove}
                  className="ml-1 hover:text-blue-900"
                >
                  &times;
                </button>
              </span>
            ))}
            <button
              onClick={() => {
                setFilterStatus("");
                setFilterPriority("");
                setFilterType("");
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Table list */}
        <div className="rounded-lg border bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[28px_1fr_100px_110px_80px] gap-3 px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div></div>
            <div>Title</div>
            <div>Priority</div>
            <div>Due Date</div>
            <div>Type</div>
          </div>

          {/* Items */}
          {itemsQuery.data?.map((item) => {
            const status = (item.status || "todo") as Status;
            const priority = (item.priority || "none") as Priority;
            const itemType = (item.type || "task") as ItemType;
            const statusConf = STATUS_CONFIG[status];
            const priorityConf = PRIORITY_CONFIG[priority];
            const typeConf = TYPE_CONFIG[itemType];

            return (
              <div
                key={item.id}
                className="grid grid-cols-[28px_1fr_100px_110px_80px] gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 items-center transition-colors"
              >
                {/* Status dot */}
                <button
                  onClick={() => cycleStatus(item.id, status)}
                  title={`${statusConf.label} (click to change)`}
                  className="w-4 h-4 rounded-full border-2 shrink-0 transition-colors hover:scale-110"
                  style={{
                    backgroundColor: status === "done" ? statusConf.color : "transparent",
                    borderColor: statusConf.color,
                  }}
                />

                {/* Title */}
                <Link
                  to="/w/$slug/i/$id"
                  params={{ slug, id: item.id }}
                  className="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
                >
                  {item.title}
                </Link>

                {/* Priority badge */}
                <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${priorityConf.bg}`}>
                  {priorityConf.label}
                </span>

                {/* Due date */}
                <span
                  className={`text-xs ${
                    isOverdue(item.dueDate) ? "text-red-600 font-medium" : "text-gray-500"
                  }`}
                >
                  {item.dueDate ? formatDate(item.dueDate) : <span className="text-gray-300">--</span>}
                </span>

                {/* Type badge */}
                <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-medium w-fit ${typeConf.bg}`}>
                  {typeConf.label}
                </span>
              </div>
            );
          })}

          {/* Empty state */}
          {itemsQuery.data?.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3 text-gray-300">No items found</div>
              <p className="text-gray-500 text-sm mb-4">
                {activeFilters.length > 0
                  ? "Try adjusting your filters or create a new item."
                  : "Get started by creating your first item."}
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                + New Item
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

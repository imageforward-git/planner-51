import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  TYPE_CONFIG,
  type Status,
  type Priority,
  type ItemType,
} from "../lib/constants";

const BOARD_COLUMNS: Status[] = ["todo", "in_progress", "in_review", "done"];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

export function BoardView() {
  const { slug } = useParams({ from: "/w/$slug/board" });

  const workspaces = trpc.workspace.list.useQuery();
  const ws = workspaces.data?.find((m) => m.workspace.slug === slug);
  const workspaceId = ws?.workspace.id;

  const itemsQuery = trpc.item.list.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  const createItem = trpc.item.create.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
    },
  });

  const updateItem = trpc.item.update.useMutation({
    onSuccess: () => {
      itemsQuery.refetch();
    },
  });

  // Inline create state per column
  const [addingColumn, setAddingColumn] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");

  if (!workspaceId) {
    return <div className="p-8 text-gray-500">Loading workspace...</div>;
  }

  const items = itemsQuery.data ?? [];
  const columnItems: Record<Status, typeof items> = {
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
    cancelled: [],
  };
  for (const item of items) {
    const status = (item.status || "todo") as Status;
    if (columnItems[status]) {
      columnItems[status].push(item);
    }
  }

  function handleCreate(status: Status) {
    if (!newTitle.trim()) return;
    createItem.mutate({
      workspaceId: workspaceId!,
      type: "task" as ItemType,
      title: newTitle,
      status,
    });
    setNewTitle("");
    setAddingColumn(null);
  }

  function moveToStatus(itemId: string, newStatus: Status) {
    updateItem.mutate({ id: itemId, status: newStatus });
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
            className="block px-3 py-2 rounded hover:bg-gray-100 text-gray-700"
          >
            List
          </Link>
          <Link
            to="/w/$slug/board"
            params={{ slug }}
            className="block px-3 py-2 rounded font-medium bg-blue-50 text-blue-700"
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

      {/* Board */}
      <main className="flex-1 p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Board</h1>
        </div>

        <div className="flex gap-4 min-h-[calc(100vh-140px)]">
          {BOARD_COLUMNS.map((status) => {
            const conf = STATUS_CONFIG[status];
            const colItems = columnItems[status];

            return (
              <div key={status} className="flex flex-col w-72 shrink-0">
                {/* Column header */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: conf.color }}
                  />
                  <h3 className="text-sm font-semibold text-gray-700">{conf.label}</h3>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {colItems.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2">
                  {colItems.map((item) => {
                    const priority = (item.priority || "none") as Priority;
                    const itemType = (item.type || "task") as ItemType;
                    const priorityConf = PRIORITY_CONFIG[priority];
                    const typeConf = TYPE_CONFIG[itemType];

                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border bg-white p-3 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <Link
                          to="/w/$slug/i/$id"
                          params={{ slug, id: item.id }}
                          className="block text-sm font-medium text-gray-900 hover:text-blue-600 mb-2"
                        >
                          {item.title}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityConf.bg}`}>
                            {priorityConf.label}
                          </span>
                          <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ${typeConf.bg}`}>
                            {typeConf.label}
                          </span>
                          {item.dueDate && (
                            <span
                              className={`text-xs ml-auto ${
                                isOverdue(item.dueDate) ? "text-red-600 font-medium" : "text-gray-500"
                              }`}
                            >
                              {formatDate(item.dueDate)}
                            </span>
                          )}
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-100">
                          {BOARD_COLUMNS.filter((s) => s !== status).map((targetStatus) => (
                            <button
                              key={targetStatus}
                              onClick={() => moveToStatus(item.id, targetStatus)}
                              className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              title={`Move to ${STATUS_CONFIG[targetStatus].label}`}
                            >
                              <span
                                className="inline-block w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: STATUS_CONFIG[targetStatus].color }}
                              />
                              {STATUS_CONFIG[targetStatus].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline add */}
                  {addingColumn === status ? (
                    <div className="rounded-lg border border-blue-300 bg-white p-3">
                      <input
                        type="text"
                        placeholder="Item title..."
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreate(status);
                          if (e.key === "Escape") {
                            setAddingColumn(null);
                            setNewTitle("");
                          }
                        }}
                        autoFocus
                        className="w-full rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCreate(status)}
                          disabled={!newTitle.trim()}
                          className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setAddingColumn(null);
                            setNewTitle("");
                          }}
                          className="rounded px-3 py-1 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setAddingColumn(status);
                        setNewTitle("");
                      }}
                      className="w-full rounded-lg border border-dashed border-gray-300 p-2 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

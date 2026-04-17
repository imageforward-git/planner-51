import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

export function WorkspaceHome() {
  const { slug } = useParams({ from: "/w/$slug" });
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"task" | "note" | "doc">("task");

  // Get workspace by slug — for MVP we use the workspace list and filter
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
      setTitle("");
      setShowCreate(false);
    },
  });

  if (!workspaceId) {
    return <div className="p-8">Loading workspace...</div>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white p-4">
        <h2 className="text-lg font-bold mb-4">{ws?.workspace.name}</h2>
        <nav className="space-y-2">
          <Link to="/w/$slug" params={{ slug }} className="block px-2 py-1 rounded hover:bg-gray-100">
            Items
          </Link>
          <Link to="/w/$slug/graph" params={{ slug }} className="block px-2 py-1 rounded hover:bg-gray-100">
            Graph
          </Link>
          <Link to="/w/$slug/search" params={{ slug }} className="block px-2 py-1 rounded hover:bg-gray-100">
            Search
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Items</h1>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            + New Item
          </button>
        </div>

        {showCreate && (
          <div className="mb-6 rounded border bg-white p-4">
            <div className="flex gap-2 mb-2">
              {(["task", "note", "doc"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`rounded px-3 py-1 text-sm ${type === t ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2 mb-2"
            />
            <button
              onClick={() => createItem.mutate({ workspaceId, type, title })}
              className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Create
            </button>
          </div>
        )}

        <div className="space-y-2">
          {itemsQuery.data?.map((item) => (
            <Link
              key={item.id}
              to="/w/$slug/i/$id"
              params={{ slug, id: item.id }}
              className="block rounded border bg-white p-4 hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`inline-block rounded px-2 py-0.5 text-xs ${
                  item.type === "task" ? "bg-blue-100 text-blue-700" :
                  item.type === "note" ? "bg-green-100 text-green-700" :
                  "bg-purple-100 text-purple-700"
                }`}>
                  {item.type}
                </span>
                <span className="font-medium">{item.title}</span>
              </div>
            </Link>
          ))}
          {itemsQuery.data?.length === 0 && (
            <p className="text-gray-400 text-center py-8">No items yet. Create one above!</p>
          )}
        </div>
      </main>
    </div>
  );
}

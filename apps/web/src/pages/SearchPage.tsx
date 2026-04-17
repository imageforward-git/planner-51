import React, { useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

export function SearchPage() {
  const { slug } = useParams({ from: "/w/$slug/search" });
  const [query, setQuery] = useState("");
  const workspaces = trpc.workspace.list.useQuery();
  const ws = workspaces.data?.find((m) => m.workspace.slug === slug);
  const workspaceId = ws?.workspace.id;

  const searchQuery = trpc.search.query.useQuery(
    { workspaceId: workspaceId!, q: query },
    { enabled: !!workspaceId && query.length > 0 }
  );

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link to="/w/$slug" params={{ slug }} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to items
      </Link>
      <h1 className="text-2xl font-bold mb-4">Search</h1>
      <input
        type="text"
        placeholder="Search items..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border px-4 py-2 mb-4"
      />
      <div className="space-y-2">
        {searchQuery.data?.map((item) => (
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
        {searchQuery.data?.length === 0 && query && (
          <p className="text-gray-400 text-center py-4">No results found.</p>
        )}
      </div>
    </div>
  );
}

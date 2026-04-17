import React from "react";
import { useParams, Link } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

export function GraphView() {
  const { slug } = useParams({ from: "/w/$slug/graph" });
  const workspaces = trpc.workspace.list.useQuery();
  const ws = workspaces.data?.find((m) => m.workspace.slug === slug);
  const workspaceId = ws?.workspace.id;

  const graphQuery = trpc.link.graph.useQuery(
    { workspaceId: workspaceId! },
    { enabled: !!workspaceId }
  );

  if (!graphQuery.data) {
    return <div className="p-8">Loading graph...</div>;
  }

  const { nodes, edges } = graphQuery.data;

  // Simple force-free layout: arrange nodes in a circle
  const cx = 400, cy = 300, r = 200;
  const positions = nodes.map((_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / nodes.length),
    y: cy + r * Math.sin((2 * Math.PI * i) / nodes.length),
  }));

  const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

  return (
    <div className="p-8">
      <Link to="/w/$slug" params={{ slug }} className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        &larr; Back to items
      </Link>
      <h1 className="text-2xl font-bold mb-4">Graph View</h1>
      <div className="rounded border bg-white p-4">
        {nodes.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No items with links yet.</p>
        ) : (
          <svg width="800" height="600" className="mx-auto">
            {edges.map((e, i) => {
              const si = nodeMap.get(e.source);
              const ti = nodeMap.get(e.target);
              if (si === undefined || ti === undefined) return null;
              return (
                <line key={i}
                  x1={positions[si].x} y1={positions[si].y}
                  x2={positions[ti].x} y2={positions[ti].y}
                  stroke="#cbd5e1" strokeWidth="1.5"
                />
              );
            })}
            {nodes.map((n, i) => (
              <g key={n.id}>
                <circle cx={positions[i].x} cy={positions[i].y} r="20" fill="#3b82f6" />
                <text
                  x={positions[i].x} y={positions[i].y + 30}
                  textAnchor="middle" fontSize="11" fill="#374151"
                >
                  {n.label.length > 15 ? n.label.slice(0, 15) + "..." : n.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}

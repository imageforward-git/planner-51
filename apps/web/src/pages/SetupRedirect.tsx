import React, { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { trpc } from "../lib/trpc";

export function SetupRedirect() {
  const navigate = useNavigate();
  const workspaces = trpc.workspace.list.useQuery();
  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (ws) => {
      navigate({ to: "/w/$slug", params: { slug: ws.slug } });
    },
  });

  useEffect(() => {
    if (workspaces.isLoading) return;
    if (workspaces.data && workspaces.data.length > 0) {
      navigate({ to: "/w/$slug", params: { slug: workspaces.data[0].workspace.slug } });
    } else if (workspaces.data && workspaces.data.length === 0) {
      createWorkspace.mutate({ name: "My Workspace", slug: "main" });
    }
  }, [workspaces.isLoading, workspaces.data]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );
}

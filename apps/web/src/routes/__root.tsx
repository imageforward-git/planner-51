import { createRootRoute, createRoute, Outlet, Link, redirect, createRouter, Navigate } from "@tanstack/react-router";
import { WorkspaceHome } from "../pages/WorkspaceHome";
import { ItemView } from "../pages/ItemView";
import { GraphView } from "../pages/GraphView";
import { SearchPage } from "../pages/SearchPage";
import { BoardView } from "../pages/BoardView";
import { SetupRedirect } from "../pages/SetupRedirect";

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: SetupRedirect,
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/w/$slug",
  component: WorkspaceHome,
});

const itemRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/w/$slug/i/$id",
  component: ItemView,
});

const graphRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/w/$slug/graph",
  component: GraphView,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/w/$slug/search",
  component: SearchPage,
});

const boardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/w/$slug/board",
  component: BoardView,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  workspaceRoute,
  itemRoute,
  graphRoute,
  searchRoute,
  boardRoute,
]);

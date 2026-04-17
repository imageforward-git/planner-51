import { createRootRoute, createRoute, Outlet, Link, redirect, createRouter } from "@tanstack/react-router";
import { LoginPage } from "../pages/Login";
import { WorkspaceHome } from "../pages/WorkspaceHome";
import { ItemView } from "../pages/ItemView";
import { GraphView } from "../pages/GraphView";
import { SearchPage } from "../pages/SearchPage";

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
  component: () => {
    // Redirect to login for now
    return <LoginPage />;
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
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

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  workspaceRoute,
  itemRoute,
  graphRoute,
  searchRoute,
]);

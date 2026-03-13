/**
 * Root layout route for the History Gauntlet admin dashboard.
 *
 * Wraps all child routes with the app shell (header, sidebar, content area).
 * Uses TanStack Router's createRootRoute.
 */

import { Outlet, createRootRoute } from "@tanstack/react-router";
import { Layout } from "../components/common/Layout";
import { Sidebar } from "../components/common/Sidebar";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <Layout sidebar={<Sidebar />}>
      <Outlet />
    </Layout>
  );
}

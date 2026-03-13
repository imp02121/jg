/**
 * Dashboard home route.
 *
 * Redirects to the questions list, which is the default landing page.
 */

import { Navigate, createRoute } from "@tanstack/react-router";
import { rootRoute } from "./__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: IndexPage,
});

function IndexPage() {
  return <Navigate to="/questions" />;
}

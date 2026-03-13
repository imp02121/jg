/**
 * TanStack Router instance for the History Gauntlet admin dashboard.
 *
 * Manually assembles the route tree from route definitions.
 * Each route uses createRoute / createRootRoute for full type safety.
 */

import { createRouter } from "@tanstack/react-router";
import { rootRoute } from "./routes/__root";
import { gamesDateRoute } from "./routes/games/$date";
import { gamesGenerateRoute } from "./routes/games/generate";
import { gamesIndexRoute } from "./routes/games/index";
import { indexRoute } from "./routes/index";
import { questionsEditRoute } from "./routes/questions/$questionId";
import { questionsIndexRoute } from "./routes/questions/index";
import { questionsNewRoute } from "./routes/questions/new";

const routeTree = rootRoute.addChildren([
  indexRoute,
  questionsIndexRoute,
  questionsNewRoute,
  questionsEditRoute,
  gamesIndexRoute,
  gamesGenerateRoute,
  gamesDateRoute,
]);

export const router = createRouter({ routeTree });

/** Register the router for full type safety across the app. */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

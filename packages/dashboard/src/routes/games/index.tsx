/**
 * Game calendar page.
 *
 * Displays a calendar view showing which dates have generated games.
 * Calendar implementation will be added in Phase 3.3.
 */

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const gamesIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games",
  component: GamesIndexPage,
});

const styles = {
  container: {
    maxWidth: "1200px",
  },
  heading: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#e8d9b8",
    marginBottom: "8px",
  },
  description: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "14px",
    color: "#b0a48a",
    marginBottom: "24px",
  },
  placeholder: {
    padding: "48px",
    textAlign: "center" as const,
    border: "1px dashed #3d3225",
    borderRadius: "12px",
    color: "#887a62",
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "14px",
  },
} as const;

function GamesIndexPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Game Calendar</h1>
      <p style={styles.description}>
        View generated daily games on a calendar. Green indicators show dates with games.
      </p>
      <div style={styles.placeholder}>Game calendar will be implemented in Phase 3.3</div>
    </div>
  );
}

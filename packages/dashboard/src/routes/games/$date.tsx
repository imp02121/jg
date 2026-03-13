/**
 * Game preview page.
 *
 * Shows a full preview of a generated game for a specific date.
 * Preview implementation will be added in Phase 3.3.
 */

import { createRoute, useParams } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const gamesDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games/$date",
  component: GamePreviewPage,
});

const styles = {
  container: {
    maxWidth: "900px",
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

function GamePreviewPage() {
  const { date } = useParams({ from: "/games/$date" });

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Game Preview</h1>
      <p style={styles.description}>Previewing game for: {date}</p>
      <div style={styles.placeholder}>Game preview will be implemented in Phase 3.3</div>
    </div>
  );
}

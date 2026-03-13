/**
 * Game generator page.
 *
 * Provides controls to generate a new daily game with tier distribution config.
 * Generator implementation will be added in Phase 3.3.
 */

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const gamesGenerateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games/generate",
  component: GenerateGamePage,
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

function GenerateGamePage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Generate Daily Game</h1>
      <p style={styles.description}>
        Select a date and configure tier distribution to generate a new daily game.
      </p>
      <div style={styles.placeholder}>Game generator will be implemented in Phase 3.3</div>
    </div>
  );
}

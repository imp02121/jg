/**
 * Question list page.
 *
 * Displays the question bank with filters and search.
 * Data fetching will be implemented in Phase 3.2.
 */

import { createRoute } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const questionsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions",
  component: QuestionsIndexPage,
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

function QuestionsIndexPage() {
  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Question Bank</h1>
      <p style={styles.description}>
        Browse, filter, and manage questions across all difficulty tiers.
      </p>
      <div style={styles.placeholder}>Question table will be implemented in Phase 3.2</div>
    </div>
  );
}

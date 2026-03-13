/**
 * Edit question page.
 *
 * Loads an existing question by ID and provides an edit form.
 * Form implementation will be added in Phase 3.2.
 */

import { createRoute, useParams } from "@tanstack/react-router";
import { rootRoute } from "../__root";

export const questionsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions/$questionId",
  component: EditQuestionPage,
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

function EditQuestionPage() {
  const { questionId } = useParams({ from: "/questions/$questionId" });

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Edit Question</h1>
      <p style={styles.description}>Editing question: {questionId}</p>
      <div style={styles.placeholder}>Edit question form will be implemented in Phase 3.2</div>
    </div>
  );
}

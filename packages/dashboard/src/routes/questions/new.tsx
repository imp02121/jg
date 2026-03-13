/**
 * Create question page.
 *
 * Provides a form to create a new question with live preview.
 * Redirects to the question list on success.
 */

import type { CreateQuestionRequest } from "@history-gauntlet/shared";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { QuestionForm } from "../../components/questions/QuestionForm";
import { useCreateQuestion } from "../../hooks/use-questions";
import { rootRoute } from "../__root";

export const questionsNewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions/new",
  component: NewQuestionPage,
});

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  container: { maxWidth: "900px" },
  heading: {
    fontFamily: FONT,
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#e8d9b8",
    marginBottom: "8px",
  },
  description: {
    fontFamily: FONT,
    fontSize: "14px",
    color: "#b0a48a",
    marginBottom: "24px",
  },
  error: {
    padding: "12px 16px",
    backgroundColor: "rgba(139, 45, 45, 0.15)",
    border: "1px solid #8b2d2d",
    borderRadius: "8px",
    color: "#e6a8a8",
    fontSize: "14px",
    fontFamily: FONT,
    marginBottom: "16px",
  },
} as const;

function NewQuestionPage() {
  const navigate = useNavigate();
  const mutation = useCreateQuestion();

  function handleSubmit(data: CreateQuestionRequest) {
    mutation.mutate(data, {
      onSuccess: () => {
        navigate({ to: "/questions" });
      },
    });
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Create Question</h1>
      <p style={styles.description}>Add a new question to the question bank with live preview.</p>
      {mutation.isError && (
        <div style={styles.error}>
          Failed to create question: {(mutation.error as Error).message}
        </div>
      )}
      <QuestionForm onSubmit={handleSubmit} isLoading={mutation.isPending} />
    </div>
  );
}

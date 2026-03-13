/**
 * Edit question page.
 *
 * Loads an existing question by ID and provides an edit form.
 * Redirects to the question list on success.
 */

import type { CreateQuestionRequest } from "@history-gauntlet/shared";
import { createRoute, useNavigate, useParams } from "@tanstack/react-router";
import { QuestionForm } from "../../components/questions/QuestionForm";
import { useQuestion, useUpdateQuestion } from "../../hooks/use-questions";
import { rootRoute } from "../__root";

export const questionsEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions/$questionId",
  component: EditQuestionPage,
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
  loading: {
    padding: "48px",
    textAlign: "center" as const,
    color: "#887a62",
    fontSize: "14px",
    fontFamily: FONT,
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

function EditQuestionPage() {
  const { questionId } = useParams({ from: "/questions/$questionId" });
  const navigate = useNavigate();
  const { data: question, isLoading, isError, error } = useQuestion(questionId);
  const mutation = useUpdateQuestion();

  function handleSubmit(data: CreateQuestionRequest) {
    mutation.mutate(
      { id: questionId, data },
      {
        onSuccess: () => {
          navigate({ to: "/questions" });
        },
      },
    );
  }

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading question...</div>
      </div>
    );
  }

  if (isError || !question) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>
          {isError ? `Failed to load question: ${(error as Error).message}` : "Question not found."}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Edit Question</h1>
      <p style={styles.description}>Editing question: {questionId}</p>
      {mutation.isError && (
        <div style={styles.error}>
          Failed to update question: {(mutation.error as Error).message}
        </div>
      )}
      <QuestionForm initialData={question} onSubmit={handleSubmit} isLoading={mutation.isPending} />
    </div>
  );
}

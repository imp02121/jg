/**
 * Question list page.
 *
 * Displays the question bank with sortable/filterable table,
 * search, pagination, and delete functionality.
 */

import { DIFFICULTY_TIER_VALUES, type DifficultyTier } from "@history-gauntlet/shared";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useState } from "react";
import { QuestionTable } from "../../components/questions/QuestionTable";
import { useDeleteQuestion, useQuestions } from "../../hooks/use-questions";
import { rootRoute } from "../__root";

export const questionsIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/questions",
  component: QuestionsIndexPage,
});

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  container: { maxWidth: "1200px" },
  heading: {
    fontFamily: FONT,
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#e8d9b8",
    marginBottom: "8px",
  },
  description: { fontFamily: FONT, fontSize: "14px", color: "#b0a48a", marginBottom: "24px" },
  filters: {
    display: "flex" as const,
    gap: "12px",
    marginBottom: "20px",
    flexWrap: "wrap" as const,
    alignItems: "center" as const,
  },
  input: {
    padding: "8px 12px",
    backgroundColor: "#2c2218",
    border: "1px solid #3d3225",
    borderRadius: "8px",
    color: "#e8d9b8",
    fontSize: "13px",
    fontFamily: FONT,
    minWidth: "180px",
  },
  select: {
    padding: "8px 12px",
    backgroundColor: "#2c2218",
    border: "1px solid #3d3225",
    borderRadius: "8px",
    color: "#e8d9b8",
    fontSize: "13px",
    fontFamily: FONT,
  },
  pagination: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginTop: "20px",
    fontFamily: FONT,
  },
  pageInfo: { fontSize: "13px", color: "#887a62" },
  pageBtn: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    border: "1px solid #3d3225",
    borderRadius: "6px",
    color: "#d4c5a9",
    fontSize: "13px",
    fontFamily: FONT,
    cursor: "pointer",
  },
  pageBtnDisabled: {
    padding: "6px 14px",
    backgroundColor: "transparent",
    border: "1px solid #2c2218",
    borderRadius: "6px",
    color: "#555",
    fontSize: "13px",
    fontFamily: FONT,
    cursor: "not-allowed",
  },
  error: {
    padding: "16px",
    backgroundColor: "rgba(139, 45, 45, 0.15)",
    border: "1px solid #8b2d2d",
    borderRadius: "8px",
    color: "#e6a8a8",
    fontSize: "14px",
    fontFamily: FONT,
  },
  loading: {
    padding: "48px",
    textAlign: "center" as const,
    color: "#887a62",
    fontSize: "14px",
    fontFamily: FONT,
  },
  newBtn: {
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "2px solid #8b7355",
    borderRadius: "8px",
    color: "#e8d9b8",
    fontSize: "13px",
    fontFamily: FONT,
    cursor: "pointer",
    marginLeft: "auto",
  },
} as const;

function QuestionsIndexPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [difficulty, setDifficulty] = useState<DifficultyTier | "">("");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  const params = {
    page,
    limit: 20,
    ...(difficulty ? { difficulty: difficulty as DifficultyTier } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  };

  const { data, isLoading, isError, error } = useQuestions(params);
  const deleteMutation = useDeleteQuestion();

  function handleEdit(id: string) {
    navigate({ to: "/questions/$questionId", params: { questionId: id } });
  }

  function handleDelete(id: string) {
    deleteMutation.mutate(id);
  }

  function onFilterChange(setter: (v: string) => void) {
    return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value);
      setPage(1);
    };
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Question Bank</h1>
      <p style={styles.description}>
        Browse, filter, and manage questions across all difficulty tiers.
      </p>

      <div style={styles.filters}>
        <select
          style={styles.select}
          value={difficulty}
          onChange={(e) => {
            setDifficulty(e.target.value as DifficultyTier | "");
            setPage(1);
          }}
        >
          <option value="">All Tiers</option>
          {DIFFICULTY_TIER_VALUES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input
          style={styles.input}
          placeholder="Filter by category..."
          value={category}
          onChange={onFilterChange(setCategory)}
        />
        <input
          style={styles.input}
          placeholder="Search questions..."
          value={search}
          onChange={onFilterChange(setSearch)}
        />
        <button
          type="button"
          style={styles.newBtn}
          onClick={() => navigate({ to: "/questions/new" })}
        >
          + New Question
        </button>
      </div>

      {isLoading && <div style={styles.loading}>Loading questions...</div>}
      {isError && (
        <div style={styles.error}>Failed to load questions: {(error as Error).message}</div>
      )}
      {data && (
        <>
          <QuestionTable questions={data.data} onEdit={handleEdit} onDelete={handleDelete} />
          <div style={styles.pagination}>
            <span style={styles.pageInfo}>
              Page {data.page} of {totalPages} ({data.total} total)
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                style={page <= 1 ? styles.pageBtnDisabled : styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                style={page >= totalPages ? styles.pageBtnDisabled : styles.pageBtn}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

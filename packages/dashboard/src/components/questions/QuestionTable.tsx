/**
 * Sortable question table component.
 *
 * Displays questions with difficulty badge, text, category, used count, and actions.
 * Supports sorting by column headers.
 */

import type { Question } from "@history-gauntlet/shared";
import { TIER_BY_KEY } from "@history-gauntlet/shared";
import { useState } from "react";

type SortField = "difficulty" | "question" | "category" | "usedCount";
type SortDirection = "asc" | "desc";

interface QuestionTableProps {
  readonly questions: readonly Question[];
  readonly onEdit: (id: string) => void;
  readonly onDelete: (id: string) => void;
}

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontFamily: FONT,
  },
  th: {
    padding: "12px 16px",
    textAlign: "left" as const,
    fontSize: "11px",
    color: "#887a62",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    borderBottom: "2px solid #3d3225",
    cursor: "pointer",
    userSelect: "none" as const,
  },
  td: {
    padding: "12px 16px",
    fontSize: "14px",
    color: "#d4c5a9",
    borderBottom: "1px solid #2c2218",
  },
  row: { transition: "background-color 0.15s ease" },
  badge: {
    display: "inline-block" as const,
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "600" as const,
  },
  questionText: {
    maxWidth: "300px",
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  actions: { display: "flex" as const, gap: "8px" },
  actionBtn: {
    padding: "6px 12px",
    backgroundColor: "transparent",
    border: "1px solid #3d3225",
    borderRadius: "6px",
    color: "#d4c5a9",
    fontSize: "12px",
    fontFamily: FONT,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  deleteBtn: {
    padding: "6px 12px",
    backgroundColor: "transparent",
    border: "1px solid #8b2d2d",
    borderRadius: "6px",
    color: "#e6a8a8",
    fontSize: "12px",
    fontFamily: FONT,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  empty: {
    padding: "48px",
    textAlign: "center" as const,
    color: "#887a62",
    fontSize: "14px",
    fontFamily: FONT,
  },
  sortIndicator: { marginLeft: "4px", fontSize: "10px" },
} as const;

const TIER_SORT_ORDER: Record<string, number> = {
  Novice: 0,
  Apprentice: 1,
  Journeyman: 2,
  Scholar: 3,
  Master: 4,
  Grandmaster: 5,
};

function sortQuestions(
  questions: readonly Question[],
  field: SortField,
  direction: SortDirection,
): Question[] {
  return [...questions].sort((a, b) => {
    let cmp = 0;
    if (field === "difficulty") {
      cmp = (TIER_SORT_ORDER[a.difficulty] ?? 0) - (TIER_SORT_ORDER[b.difficulty] ?? 0);
    } else if (field === "usedCount") {
      cmp = a.usedCount - b.usedCount;
    } else {
      cmp = a[field].localeCompare(b[field]);
    }
    return direction === "asc" ? cmp : -cmp;
  });
}

export function QuestionTable({ questions, onEdit, onDelete }: QuestionTableProps) {
  const [sortField, setSortField] = useState<SortField>("difficulty");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function handleDelete(id: string) {
    if (confirmId === id) {
      onDelete(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
    }
  }

  const sorted = sortQuestions(questions, sortField, sortDir);
  const indicator = (field: SortField) =>
    sortField === field ? (sortDir === "asc" ? " \u25B2" : " \u25BC") : "";

  if (questions.length === 0) {
    return <div style={styles.empty}>No questions found. Create one to get started.</div>;
  }

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th
            style={styles.th}
            onClick={() => handleSort("difficulty")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSort("difficulty");
            }}
          >
            Tier{indicator("difficulty")}
          </th>
          <th
            style={styles.th}
            onClick={() => handleSort("question")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSort("question");
            }}
          >
            Question{indicator("question")}
          </th>
          <th
            style={styles.th}
            onClick={() => handleSort("category")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSort("category");
            }}
          >
            Category{indicator("category")}
          </th>
          <th
            style={styles.th}
            onClick={() => handleSort("usedCount")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleSort("usedCount");
            }}
          >
            Used{indicator("usedCount")}
          </th>
          <th style={{ ...styles.th, cursor: "default" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((q) => {
          const tier = TIER_BY_KEY[q.difficulty];
          return (
            <tr
              key={q.id}
              style={styles.row}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(139,115,85,0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <td style={styles.td}>
                <span
                  style={{ ...styles.badge, backgroundColor: tier.bgColor, color: tier.textColor }}
                >
                  {tier.label}
                </span>
              </td>
              <td style={styles.td}>
                <div style={styles.questionText}>{q.question}</div>
              </td>
              <td style={styles.td}>{q.category}</td>
              <td style={styles.td}>{q.usedCount}</td>
              <td style={styles.td}>
                <div style={styles.actions}>
                  <button type="button" style={styles.actionBtn} onClick={() => onEdit(q.id)}>
                    Edit
                  </button>
                  <button type="button" style={styles.deleteBtn} onClick={() => handleDelete(q.id)}>
                    {confirmId === q.id ? "Confirm?" : "Delete"}
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

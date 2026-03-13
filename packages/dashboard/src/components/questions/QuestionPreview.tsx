/**
 * Live preview of a question as it would appear in the mobile app.
 *
 * Uses the same color scheme and typography from the shared theme.
 */

import type { CorrectIndex, DifficultyTier } from "@history-gauntlet/shared";
import { TIER_BY_KEY } from "@history-gauntlet/shared";

interface PreviewData {
  readonly difficulty: DifficultyTier;
  readonly question: string;
  readonly options: readonly [string, string, string, string];
  readonly correctIndex: CorrectIndex;
  readonly fact: string;
}

interface QuestionPreviewProps {
  readonly data: PreviewData;
}

const styles = {
  container: {
    maxWidth: "375px",
    backgroundColor: "#1a1410",
    borderRadius: "12px",
    border: "1px solid #3d3225",
    padding: "20px",
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
  },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: "16px",
  },
  badge: {
    display: "inline-block" as const,
    padding: "4px 12px",
    borderRadius: "12px",
    fontSize: "12px",
    fontWeight: "600" as const,
  },
  label: {
    fontSize: "11px",
    color: "#887a62",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  questionText: {
    fontSize: "16px",
    color: "#e8d9b8",
    lineHeight: "1.5",
    marginBottom: "16px",
  },
  option: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #3d3225",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#d4c5a9",
    backgroundColor: "#2c2218",
  },
  optionCorrect: {
    padding: "12px 16px",
    borderRadius: "8px",
    border: "1px solid #4a7c59",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#a8e6b0",
    backgroundColor: "rgba(74, 124, 89, 0.2)",
  },
  divider: {
    height: "2px",
    margin: "16px 0",
    background: "linear-gradient(to right, transparent, #8b7355, transparent)",
  },
  factLabel: {
    fontSize: "11px",
    color: "#8b7355",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  factText: {
    fontSize: "13px",
    color: "#b0a48a",
    lineHeight: "1.5",
    fontStyle: "italic" as const,
  },
} as const;

export function QuestionPreview({ data }: QuestionPreviewProps) {
  const tier = TIER_BY_KEY[data.difficulty];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={{ ...styles.badge, backgroundColor: tier.bgColor, color: tier.textColor }}>
          {tier.label}
        </span>
        <span style={styles.label}>Preview</span>
      </div>
      <div style={styles.questionText}>{data.question || "Enter a question..."}</div>
      {data.options.map((option, index) => (
        <div
          key={`opt-${String.fromCharCode(65 + index)}`}
          style={index === data.correctIndex ? styles.optionCorrect : styles.option}
        >
          {option || `Option ${index + 1}`}
          {index === data.correctIndex ? " [correct]" : ""}
        </div>
      ))}
      {data.fact && (
        <>
          <div style={styles.divider} />
          <div style={styles.factLabel}>Did you know?</div>
          <div style={styles.factText}>{data.fact}</div>
        </>
      )}
    </div>
  );
}

/**
 * Full game preview component.
 *
 * Renders all questions grouped by tier in a mobile-width container
 * with parchment styling to mirror the mobile app appearance.
 */

import type { DailyGame } from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, TIER_BY_KEY } from "@history-gauntlet/shared";

interface GamePreviewProps {
  readonly game: DailyGame;
}

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  container: {
    maxWidth: "420px",
    backgroundColor: "#1a1410",
    borderRadius: "12px",
    border: "1px solid #3d3225",
    padding: "24px",
    fontFamily: FONT,
  },
  title: { fontSize: "20px", fontWeight: "700" as const, color: "#e8d9b8", marginBottom: "4px" },
  date: { fontSize: "13px", color: "#887a62", marginBottom: "20px" },
  tierSection: { marginBottom: "24px" },
  tierHeader: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "10px",
    marginBottom: "12px",
  },
  tierBadge: {
    display: "inline-block" as const,
    padding: "4px 12px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "600" as const,
  },
  tierCount: { fontSize: "12px", color: "#887a62" },
  questionCard: {
    backgroundColor: "#2c2218",
    borderRadius: "8px",
    border: "1px solid #3d3225",
    padding: "16px",
    marginBottom: "12px",
  },
  questionNum: {
    fontSize: "11px",
    color: "#8b7355",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  questionText: { fontSize: "14px", color: "#e8d9b8", lineHeight: "1.5", marginBottom: "12px" },
  option: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #3d3225",
    marginBottom: "4px",
    fontSize: "13px",
    color: "#d4c5a9",
    backgroundColor: "#1e1a14",
  },
  optionCorrect: {
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #4a7c59",
    marginBottom: "4px",
    fontSize: "13px",
    color: "#a8e6b0",
    backgroundColor: "rgba(74, 124, 89, 0.15)",
  },
  factBox: {
    marginTop: "8px",
    padding: "10px 12px",
    borderRadius: "6px",
    backgroundColor: "rgba(139, 115, 85, 0.1)",
    borderLeft: "3px solid #8b7355",
  },
  factLabel: {
    fontSize: "10px",
    color: "#8b7355",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "4px",
  },
  factText: { fontSize: "12px", color: "#b0a48a", lineHeight: "1.4", fontStyle: "italic" as const },
  divider: {
    height: "2px",
    margin: "20px 0",
    background: "linear-gradient(to right, transparent, #8b7355, transparent)",
  },
  meta: { fontSize: "12px", color: "#887a62", textAlign: "center" as const },
} as const;

export function GamePreview({ game }: GamePreviewProps) {
  let questionNumber = 0;

  return (
    <div style={styles.container}>
      <div style={styles.title}>{game.title}</div>
      <div style={styles.date}>{game.date}</div>

      {DIFFICULTY_TIERS.map((tierDef) => {
        const questions = game.questionsByTier[tierDef.key];
        if (!questions || questions.length === 0) return null;
        const tier = TIER_BY_KEY[tierDef.key];

        return (
          <div key={tierDef.key} style={styles.tierSection}>
            <div style={styles.tierHeader}>
              <span
                style={{
                  ...styles.tierBadge,
                  backgroundColor: tier.bgColor,
                  color: tier.textColor,
                }}
              >
                {tier.label}
              </span>
              <span style={styles.tierCount}>{questions.length} questions</span>
            </div>
            {questions.map((q) => {
              questionNumber += 1;
              return (
                <div key={q.id} style={styles.questionCard}>
                  <div style={styles.questionNum}>Question {questionNumber}</div>
                  <div style={styles.questionText}>{q.question}</div>
                  {q.options.map((opt, i) => (
                    <div
                      key={`${q.id}-opt-${String.fromCharCode(65 + i)}`}
                      style={i === q.correctIndex ? styles.optionCorrect : styles.option}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </div>
                  ))}
                  <div style={styles.factBox}>
                    <div style={styles.factLabel}>Did you know?</div>
                    <div style={styles.factText}>{q.fact}</div>
                  </div>
                </div>
              );
            })}
            <div style={styles.divider} />
          </div>
        );
      })}

      <div style={styles.meta}>
        {game.metadata.totalQuestions} questions | Generated {game.metadata.generatedAt}
      </div>
    </div>
  );
}

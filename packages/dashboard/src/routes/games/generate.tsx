/**
 * Game generator page.
 *
 * Provides date picker and tier distribution config to generate a new daily game.
 * Shows a preview of the generated game after creation.
 */

import { DIFFICULTY_TIERS, type DailyGame, type DifficultyTier } from "@history-gauntlet/shared";
import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GamePreview } from "../../components/games/GamePreview";
import { TierDistribution } from "../../components/games/TierDistribution";
import { useGenerateGame } from "../../hooks/use-games";
import { rootRoute } from "../__root";

export const gamesGenerateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games/generate",
  component: GenerateGamePage,
});

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

function getDefaultDistribution(): Record<DifficultyTier, number> {
  const dist = {} as Record<DifficultyTier, number>;
  for (const tier of DIFFICULTY_TIERS) {
    dist[tier.key] = tier.questionsPerDay;
  }
  return dist;
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const styles = {
  container: { maxWidth: "900px" },
  heading: {
    fontFamily: FONT,
    fontSize: "28px",
    fontWeight: "700" as const,
    color: "#e8d9b8",
    marginBottom: "8px",
  },
  description: { fontFamily: FONT, fontSize: "14px", color: "#b0a48a", marginBottom: "24px" },
  section: { marginBottom: "24px" },
  sectionLabel: {
    fontFamily: FONT,
    fontSize: "13px",
    color: "#887a62",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "12px",
  },
  dateInput: {
    padding: "10px 12px",
    backgroundColor: "#2c2218",
    border: "1px solid #3d3225",
    borderRadius: "8px",
    color: "#e8d9b8",
    fontSize: "14px",
    fontFamily: FONT,
  },
  button: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "2px solid #8b7355",
    borderRadius: "8px",
    color: "#e8d9b8",
    fontSize: "14px",
    fontFamily: FONT,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  buttonDisabled: {
    padding: "12px 24px",
    backgroundColor: "transparent",
    border: "2px solid #3d3225",
    borderRadius: "8px",
    color: "#887a62",
    fontSize: "14px",
    fontFamily: FONT,
    cursor: "not-allowed",
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
  success: {
    padding: "12px 16px",
    backgroundColor: "rgba(74, 124, 89, 0.15)",
    border: "1px solid #4a7c59",
    borderRadius: "8px",
    color: "#a8e6b0",
    fontSize: "14px",
    fontFamily: FONT,
    marginBottom: "16px",
  },
  divider: {
    height: "2px",
    margin: "24px 0",
    background: "linear-gradient(to right, transparent, #8b7355, transparent)",
  },
  actions: { display: "flex" as const, gap: "12px", alignItems: "center" as const },
  previewLink: {
    fontSize: "13px",
    color: "#8b7355",
    fontFamily: FONT,
    cursor: "pointer",
    textDecoration: "underline",
  },
} as const;

function GenerateGamePage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayString());
  const [distribution, setDistribution] =
    useState<Record<DifficultyTier, number>>(getDefaultDistribution);
  const [generatedGame, setGeneratedGame] = useState<DailyGame | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const mutation = useGenerateGame();

  function handleDistChange(tier: DifficultyTier, count: number) {
    setDistribution((prev) => ({ ...prev, [tier]: count }));
  }

  function handleGenerate() {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setShowConfirm(false);
    mutation.mutate(
      { date, tierDistribution: distribution },
      {
        onSuccess: (game) => {
          setGeneratedGame(game);
        },
      },
    );
  }

  function handleViewGame() {
    navigate({ to: "/games/$date", params: { date } });
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Generate Daily Game</h1>
      <p style={styles.description}>
        Select a date and configure tier distribution to generate a new daily game.
      </p>

      {mutation.isError && (
        <div style={styles.error}>Failed to generate game: {(mutation.error as Error).message}</div>
      )}

      {generatedGame && (
        <div style={styles.success}>
          Game generated successfully for {generatedGame.date}!{" "}
          <span
            style={styles.previewLink}
            onClick={handleViewGame}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleViewGame();
              }
            }}
          >
            View in calendar
          </span>
        </div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Target Date</div>
        <input
          type="date"
          style={styles.dateInput}
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setShowConfirm(false);
          }}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Tier Distribution</div>
        <TierDistribution distribution={distribution} onChange={handleDistChange} />
      </div>

      <div style={styles.actions}>
        <button
          type="button"
          style={mutation.isPending ? styles.buttonDisabled : styles.button}
          disabled={mutation.isPending}
          onClick={handleGenerate}
        >
          {mutation.isPending
            ? "Generating..."
            : showConfirm
              ? "Click again to confirm"
              : "Generate Game"}
        </button>
      </div>

      {generatedGame && (
        <>
          <div style={styles.divider} />
          <div style={styles.section}>
            <div style={styles.sectionLabel}>Generated Game Preview</div>
            <GamePreview game={generatedGame} />
          </div>
        </>
      )}
    </div>
  );
}

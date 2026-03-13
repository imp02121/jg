/**
 * Game preview page.
 *
 * Shows a full preview of a generated game for a specific date.
 * Displays all questions grouped by tier with correct answers highlighted.
 */

import { createRoute, useNavigate, useParams } from "@tanstack/react-router";
import { GamePreview } from "../../components/games/GamePreview";
import { useGamePreview } from "../../hooks/use-games";
import { rootRoute } from "../__root";

export const gamesDateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games/$date",
  component: GamePreviewPage,
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
    padding: "16px",
    backgroundColor: "rgba(139, 45, 45, 0.15)",
    border: "1px solid #8b2d2d",
    borderRadius: "8px",
    color: "#e6a8a8",
    fontSize: "14px",
    fontFamily: FONT,
  },
  backBtn: {
    display: "inline-block" as const,
    padding: "8px 16px",
    backgroundColor: "transparent",
    border: "1px solid #3d3225",
    borderRadius: "6px",
    color: "#d4c5a9",
    fontSize: "13px",
    fontFamily: FONT,
    cursor: "pointer",
    marginBottom: "20px",
    textDecoration: "none",
  },
} as const;

function GamePreviewPage() {
  const { date } = useParams({ from: "/games/$date" });
  const navigate = useNavigate();
  const { data: game, isLoading, isError, error } = useGamePreview(date);

  return (
    <div style={styles.container}>
      <button type="button" style={styles.backBtn} onClick={() => navigate({ to: "/games" })}>
        &lt; Back to Calendar
      </button>

      <h1 style={styles.heading}>Game Preview</h1>
      <p style={styles.description}>Previewing game for: {date}</p>

      {isLoading && <div style={styles.loading}>Loading game...</div>}
      {isError && <div style={styles.error}>Failed to load game: {(error as Error).message}</div>}
      {game && <GamePreview game={game} />}
    </div>
  );
}

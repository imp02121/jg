/**
 * Game calendar page.
 *
 * Displays a month-view calendar showing which dates have generated games.
 * Green dots indicate dates with games; click a date to navigate to preview.
 */

import { createRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { GameCalendar } from "../../components/games/GameCalendar";
import { useGames } from "../../hooks/use-games";
import { rootRoute } from "../__root";

export const gamesIndexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games",
  component: GamesIndexPage,
});

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  container: { maxWidth: "800px" },
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
} as const;

function GamesIndexPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const { data, isLoading, isError, error } = useGames({ limit: 100 });

  const gameDates = new Set<string>();
  if (data) {
    for (const item of data.data) {
      gameDates.add(item.date);
    }
  }

  function handlePrevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function handleSelectDate(date: string) {
    if (gameDates.has(date)) {
      navigate({ to: "/games/$date", params: { date } });
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Game Calendar</h1>
      <p style={styles.description}>
        View generated daily games on a calendar. Green indicators show dates with games.
      </p>

      {isLoading && <div style={styles.loading}>Loading games...</div>}
      {isError && <div style={styles.error}>Failed to load games: {(error as Error).message}</div>}
      {!isLoading && !isError && (
        <GameCalendar
          year={year}
          month={month}
          gameDates={gameDates}
          onSelectDate={handleSelectDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
        />
      )}
    </div>
  );
}

/**
 * Month-view calendar showing which dates have generated games.
 *
 * Green dots indicate dates with games. Click a date to navigate to its preview.
 */

import type { CSSProperties } from "react";

interface GameCalendarProps {
  readonly year: number;
  readonly month: number;
  readonly gameDates: ReadonlySet<string>;
  readonly onSelectDate: (date: string) => void;
  readonly onPrevMonth: () => void;
  readonly onNextMonth: () => void;
}

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const styles = {
  container: { fontFamily: FONT },
  header: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: "16px",
  },
  monthLabel: { fontSize: "18px", fontWeight: "600" as const, color: "#e8d9b8" },
  navBtn: {
    padding: "8px 14px",
    backgroundColor: "transparent",
    border: "1px solid #3d3225",
    borderRadius: "6px",
    color: "#d4c5a9",
    fontSize: "14px",
    fontFamily: FONT,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  grid: {
    display: "grid" as const,
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: "2px",
  },
  dayHeader: {
    padding: "8px 0",
    textAlign: "center" as const,
    fontSize: "11px",
    color: "#887a62",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
  },
  cell: {
    padding: "10px 4px",
    textAlign: "center" as const,
    fontSize: "14px",
    color: "#d4c5a9",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    position: "relative" as const,
    minHeight: "40px",
  },
  cellEmpty: {
    padding: "10px 4px",
    minHeight: "40px",
  },
  dot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#4a7c59",
    margin: "4px auto 0",
    display: "block" as const,
  },
  today: {
    border: "1px solid #8b7355",
  },
} as const;

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function GameCalendar({
  year,
  month,
  gameDates,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: GameCalendarProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = new Date().toISOString().split("T")[0] ?? "";

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button type="button" style={styles.navBtn} onClick={onPrevMonth}>
          &lt; Prev
        </button>
        <span style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button type="button" style={styles.navBtn} onClick={onNextMonth}>
          Next &gt;
        </button>
      </div>
      <div style={styles.grid}>
        {DAY_NAMES.map((d) => (
          <div key={d} style={styles.dayHeader}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-col-${i % 7}`} style={styles.cellEmpty} />;
          }
          const dateStr = formatDate(year, month, day);
          const hasGame = gameDates.has(dateStr);
          const isToday = dateStr === todayStr;
          const cellStyle: CSSProperties = {
            ...styles.cell,
            ...(isToday ? styles.today : {}),
          };
          return (
            <div
              key={dateStr}
              style={cellStyle}
              onClick={() => onSelectDate(dateStr)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(dateStr);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(139,115,85,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {day}
              {hasGame && <span style={styles.dot} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

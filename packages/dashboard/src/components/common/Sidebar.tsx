/**
 * Navigation sidebar for the History Gauntlet admin dashboard.
 *
 * Provides links to all major sections: Questions and Games.
 * Highlights the currently active section based on the current route.
 */

import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { CSSProperties, MouseEvent } from "react";

interface NavItem {
  readonly label: string;
  readonly to: string;
  readonly section: string;
}

const QUESTION_LINKS: readonly NavItem[] = [
  { label: "Questions", to: "/questions", section: "/questions" },
  { label: "New Question", to: "/questions/new", section: "/questions" },
] as const;

const GAME_LINKS: readonly NavItem[] = [
  { label: "Games", to: "/games", section: "/games" },
  { label: "Generate Game", to: "/games/generate", section: "/games" },
] as const;

const styles = {
  sidebar: {
    width: "240px",
    backgroundColor: "#1a1410",
    borderRight: "2px solid #3d3225",
    padding: "16px 0",
    flexShrink: 0,
    display: "flex",
    flexDirection: "column" as const,
    overflowY: "auto" as const,
  },
  sectionLabel: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "11px",
    fontWeight: "700" as const,
    color: "#887a62",
    letterSpacing: "1.5px",
    textTransform: "uppercase" as const,
    padding: "16px 20px 8px",
  },
  link: {
    display: "block",
    padding: "10px 20px",
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "14px",
    color: "#d4c5a9",
    textDecoration: "none",
    borderLeft: "3px solid transparent",
    transition: "all 0.2s ease",
    cursor: "pointer",
    background: "none",
    border: "none",
    width: "100%",
    textAlign: "left" as const,
  },
  linkActive: {
    display: "block",
    padding: "10px 20px",
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "14px",
    color: "#e8d9b8",
    textDecoration: "none",
    borderLeft: "3px solid #8b7355",
    backgroundColor: "rgba(139, 115, 85, 0.15)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    background: "rgba(139, 115, 85, 0.15)",
    border: "none",
    width: "100%",
    textAlign: "left" as const,
  },
  divider: {
    height: "1px",
    margin: "8px 20px",
    background: "linear-gradient(to right, #3d3225, transparent)",
  },
} as const;

function NavLink({
  item,
  active,
}: {
  readonly item: NavItem;
  readonly active: boolean;
}) {
  const navigate = useNavigate();
  const style: CSSProperties = active ? styles.linkActive : styles.link;

  function handleClick(e: MouseEvent) {
    e.preventDefault();
    navigate({ to: item.to });
  }

  return (
    <a href={item.to} onClick={handleClick} style={style}>
      {item.label}
    </a>
  );
}

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <nav style={styles.sidebar}>
      <div style={styles.sectionLabel}>Question Bank</div>
      {QUESTION_LINKS.map((item) => (
        <NavLink
          key={item.to}
          item={item}
          active={currentPath === item.to || currentPath.startsWith(`${item.to}/`)}
        />
      ))}

      <div style={styles.divider} />

      <div style={styles.sectionLabel}>Daily Games</div>
      {GAME_LINKS.map((item) => (
        <NavLink
          key={item.to}
          item={item}
          active={currentPath === item.to || currentPath.startsWith(`${item.to}/`)}
        />
      ))}
    </nav>
  );
}

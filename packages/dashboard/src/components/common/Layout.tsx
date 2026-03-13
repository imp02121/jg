/**
 * App shell layout for the History Gauntlet admin dashboard.
 *
 * Provides a header bar and a container for page content.
 * Used by the root route to wrap all child routes.
 */

import type { ReactNode } from "react";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    minHeight: "100vh",
    backgroundColor: "#0f0d0a",
  },
  header: {
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    padding: "16px 24px",
    backgroundColor: "#1a1410",
    borderBottom: "2px solid #3d3225",
    flexShrink: 0,
  },
  titleWrapper: {
    display: "flex",
    alignItems: "center" as const,
    gap: "12px",
  },
  title: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "20px",
    fontWeight: "700" as const,
    color: "#e8d9b8",
    letterSpacing: "0.5px",
  },
  subtitle: {
    fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif',
    fontSize: "13px",
    color: "#887a62",
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },
  divider: {
    height: "2px",
    background: "linear-gradient(to right, transparent, #8b7355, transparent)",
  },
  body: {
    display: "flex",
    flex: 1,
    overflow: "hidden" as const,
  },
  content: {
    flex: 1,
    padding: "24px",
    overflowY: "auto" as const,
    backgroundColor: "#1e1a14",
  },
} as const;

interface LayoutProps {
  readonly sidebar: ReactNode;
  readonly children: ReactNode;
}

export function Layout({ sidebar, children }: LayoutProps) {
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.titleWrapper}>
          <div>
            <div style={styles.title}>The History Gauntlet</div>
            <div style={styles.subtitle}>Admin Dashboard</div>
          </div>
        </div>
      </header>
      <div style={styles.divider} />
      <div style={styles.body}>
        {sidebar}
        <main style={styles.content}>{children}</main>
      </div>
    </div>
  );
}

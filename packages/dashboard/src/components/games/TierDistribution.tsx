/**
 * Tier distribution configuration component.
 *
 * Shows a number input per tier with defaults from DIFFICULTY_TIERS.
 * Displays available vs required question counts.
 */

import type { DifficultyTier } from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, TIER_BY_KEY } from "@history-gauntlet/shared";

interface TierDistributionProps {
  readonly distribution: Record<DifficultyTier, number>;
  readonly onChange: (tier: DifficultyTier, count: number) => void;
  readonly availableCounts?: Partial<Record<DifficultyTier, number>>;
}

const FONT = '"Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif';

const styles = {
  container: { fontFamily: FONT },
  row: {
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "12px",
    padding: "10px 0",
    borderBottom: "1px solid #2c2218",
  },
  badge: {
    display: "inline-block" as const,
    padding: "3px 10px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "600" as const,
    width: "110px",
    textAlign: "center" as const,
  },
  input: {
    width: "60px",
    padding: "6px 8px",
    backgroundColor: "#2c2218",
    border: "1px solid #3d3225",
    borderRadius: "6px",
    color: "#e8d9b8",
    fontSize: "14px",
    fontFamily: FONT,
    textAlign: "center" as const,
  },
  label: { fontSize: "13px", color: "#b0a48a", minWidth: "80px" },
  available: { fontSize: "12px", color: "#887a62", marginLeft: "auto" },
  sufficient: { color: "#4a7c59" },
  insufficient: { color: "#e6a8a8" },
  total: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    padding: "12px 0",
    fontSize: "14px",
    color: "#e8d9b8",
    fontWeight: "600" as const,
    borderTop: "2px solid #3d3225",
    marginTop: "4px",
  },
} as const;

export function TierDistribution({
  distribution,
  onChange,
  availableCounts,
}: TierDistributionProps) {
  const totalRequired = Object.values(distribution).reduce((s, n) => s + n, 0);

  return (
    <div style={styles.container}>
      {DIFFICULTY_TIERS.map((tier) => {
        const tierKey = tier.key;
        const required = distribution[tierKey];
        const available = availableCounts?.[tierKey];
        const isSufficient = available === undefined || available >= required;
        const tierDef = TIER_BY_KEY[tierKey];

        return (
          <div key={tierKey} style={styles.row}>
            <span
              style={{
                ...styles.badge,
                backgroundColor: tierDef.bgColor,
                color: tierDef.textColor,
              }}
            >
              {tierDef.label}
            </span>
            <span style={styles.label}>Questions:</span>
            <input
              type="number"
              min={0}
              max={20}
              style={styles.input}
              value={required}
              onChange={(e) => onChange(tierKey, Math.max(0, Number(e.target.value)))}
            />
            {available !== undefined && (
              <span
                style={{
                  ...styles.available,
                  ...(isSufficient ? styles.sufficient : styles.insufficient),
                }}
              >
                {available} available{isSufficient ? "" : " (not enough)"}
              </span>
            )}
          </div>
        );
      })}
      <div style={styles.total}>
        <span>Total questions:</span>
        <span>{totalRequired}</span>
      </div>
    </div>
  );
}

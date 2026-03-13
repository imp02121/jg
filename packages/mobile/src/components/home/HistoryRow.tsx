/**
 * A single row in the history list showing date, rank, tiers, and score.
 */

import type React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LocalGameResult } from "@history-gauntlet/shared";
import { getRankForPercent } from "@history-gauntlet/shared";

import {
  accent,
  cardBgStart,
  cardBorder,
  textMuted,
  textPrimary,
  textSecondary,
} from "../../theme/colors";
import { radiusLg, spacingSm, spacingXl } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeLg,
  fontSizeSm,
  fontSizeXs,
  fontWeightBold,
  fontWeightSemibold,
  letterSpacingWide,
} from "../../theme/typography";
import { DifficultyBadge } from "../common/DifficultyBadge";
import { ChevronRightIcon } from "../icons";

interface HistoryRowProps {
  result: LocalGameResult;
  onPress: (resultId: string) => void;
}

export const HistoryRow: React.FC<HistoryRowProps> = ({ result, onPress }) => {
  const pct = result.totalQuestions > 0 ? (result.score / result.totalQuestions) * 100 : 0;
  const rank = getRankForPercent(pct);
  const displayDate = formatDisplayDate(result.date);

  return (
    <Pressable onPress={() => onPress(result.id)} testID={`history-row-${result.id}`}>
      <View style={styles.row}>
        <View style={styles.rowLeft}>
          <Text style={styles.rowDate}>{displayDate}</Text>
          <Text style={styles.rowRank}>{rank.title}</Text>
          <View style={styles.tiersRow}>
            {result.selectedTiers.map((tier) => (
              <DifficultyBadge key={tier} tier={tier} size="sm" />
            ))}
          </View>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowScore}>
            {result.score}/{result.totalQuestions}
          </Text>
          <Text style={styles.rowPct}>{Math.round(pct)}%</Text>
          <ChevronRightIcon size={16} color={textMuted} />
        </View>
      </View>
    </Pressable>
  );
};

function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: cardBgStart,
    borderWidth: 1,
    borderColor: cardBorder,
    borderRadius: radiusLg,
    paddingVertical: spacingXl,
    paddingHorizontal: spacingXl,
  },
  rowLeft: {
    flex: 1,
    gap: spacingSm,
  },
  rowDate: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXs,
    color: textMuted,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  rowRank: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    fontWeight: fontWeightSemibold,
    color: textPrimary,
  },
  tiersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacingSm,
    marginTop: spacingSm,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: spacingSm,
  },
  rowScore: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeLg,
    fontWeight: fontWeightBold,
    color: accent,
  },
  rowPct: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textSecondary,
  },
});

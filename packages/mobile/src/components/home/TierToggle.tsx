/**
 * Toggle buttons for difficulty tier selection.
 *
 * Renders one button per tier styled with DifficultyBadge colors.
 * Selected tiers are highlighted; deselected tiers are grayed out.
 * Prevents deselecting the last remaining tier (at least one must stay).
 * Shows the total question count at the bottom.
 */

import type React from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import type { DifficultyTier } from "@history-gauntlet/shared";
import { DIFFICULTY_TIERS, TIER_BY_KEY } from "@history-gauntlet/shared";

import { cardBorder, textMuted, textSubtle } from "../../theme/colors";
import { radiusPill, spacingLg, spacingMd, spacingXs } from "../../theme/spacing";
import {
  fontFamilyPrimary,
  fontSizeSm,
  fontSizeXs,
  fontWeightBold,
  letterSpacingNormal,
  letterSpacingWide,
} from "../../theme/typography";

interface TierToggleProps {
  /** Currently selected tiers. */
  selectedTiers: DifficultyTier[];
  /** Called when a tier is toggled. */
  onToggle: (tier: DifficultyTier) => void;
  /** Optional style override for the outer container. */
  style?: StyleProp<ViewStyle>;
  /** Test identifier for testing frameworks. */
  testID?: string;
}

interface TierButtonProps {
  tier: DifficultyTier;
  selected: boolean;
  isLastSelected: boolean;
  onPress: () => void;
  testID?: string | undefined;
}

const TierButton: React.FC<TierButtonProps> = ({
  tier,
  selected,
  isLastSelected,
  onPress,
  testID,
}) => {
  const tierDef = TIER_BY_KEY[tier];
  const disabled = selected && isLastSelected;

  return (
    <Pressable onPress={onPress} disabled={disabled} testID={testID}>
      <View
        style={[
          styles.badge,
          selected ? { backgroundColor: tierDef.bgColor } : styles.badgeDeselected,
          disabled ? styles.badgeDisabled : undefined,
        ]}
      >
        <Text
          style={[
            styles.badgeLabel,
            selected ? { color: tierDef.textColor } : styles.labelDeselected,
          ]}
        >
          {tierDef.label}
        </Text>
      </View>
    </Pressable>
  );
};

export const TierToggle: React.FC<TierToggleProps> = ({
  selectedTiers,
  onToggle,
  style,
  testID,
}) => {
  const selectedSet = new Set(selectedTiers);
  const isLastSelected = selectedTiers.length === 1;

  /** Calculate total question count from selected tiers. */
  const totalQuestions = DIFFICULTY_TIERS.reduce((sum, tier) => {
    if (selectedSet.has(tier.key)) {
      return sum + tier.questionsPerDay;
    }
    return sum;
  }, 0);

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.tiersRow}>
        {DIFFICULTY_TIERS.map((tier) => (
          <TierButton
            key={tier.key}
            tier={tier.key}
            selected={selectedSet.has(tier.key)}
            isLastSelected={isLastSelected}
            onPress={() => onToggle(tier.key)}
            testID={testID != null ? `${testID}-${tier.key}` : undefined}
          />
        ))}
      </View>
      <Text style={styles.questionCount}>
        {totalQuestions} {totalQuestions === 1 ? "question" : "questions"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacingMd,
  },
  tiersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacingMd,
  },
  badge: {
    borderRadius: radiusPill,
    paddingVertical: spacingXs + 2,
    paddingHorizontal: spacingLg + 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  badgeDeselected: {
    backgroundColor: "transparent",
    borderColor: cardBorder,
  },
  badgeDisabled: {
    opacity: 0.5,
  },
  badgeLabel: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeXs,
    fontWeight: fontWeightBold,
    letterSpacing: letterSpacingWide,
    textTransform: "uppercase",
  },
  labelDeselected: {
    color: textSubtle,
  },
  questionCount: {
    fontFamily: fontFamilyPrimary,
    fontSize: fontSizeSm,
    color: textMuted,
    textAlign: "center",
    letterSpacing: letterSpacingNormal,
  },
});

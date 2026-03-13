import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Mountain peaks icon for geography/trade-route category questions. */
export const MountainIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 20L8 6L12 14L15 8L22 20H2Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.5 14L8 11.5L9.5 14"
        stroke={color}
        strokeWidth={sw * 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

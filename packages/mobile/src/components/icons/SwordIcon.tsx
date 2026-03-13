import type React from "react";
import Svg, { Path, Line } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Crossed swords icon for military/battle category questions. */
export const SwordIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.5 17.5L3 6V3H6L17.5 14.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13 19L19 13"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={16} y1={16} x2={20} y2={20} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M6 3L3 6" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={9} y1={12} x2={12} y2={9} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

import type React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Traveler's backpack/satchel icon for the "Travelling Scholar" rank. */
export const BackpackIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={5}
        y={8}
        width={14}
        height={13}
        rx={2}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 8V5C9 3.9 9.9 3 11 3H13C14.1 3 15 3.9 15 5V8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M5 13H19" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M10 13V15H14V13"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

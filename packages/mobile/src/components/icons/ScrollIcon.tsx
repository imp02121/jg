import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Rolled scroll/parchment icon for the "Master Chronicler" rank. */
export const ScrollIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2H18C19.1 2 20 2.9 20 4C20 5.1 19.1 6 18 6H8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 6H8V18H6C4.9 18 4 18.9 4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20C20 18.9 19.1 18 18 18H8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 2C6.9 2 6 2.9 6 4C6 5.1 6.9 6 8 6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M11 10H16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M11 14H14" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

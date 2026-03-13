import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** X mark icon for incorrect answer indicators. */
export const CrossIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (2 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6L18 18" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M18 6L6 18" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

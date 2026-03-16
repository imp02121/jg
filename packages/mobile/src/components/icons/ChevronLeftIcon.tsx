import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Left-pointing chevron for back navigation. */
export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (2 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 6L9 12L15 18"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

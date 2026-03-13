import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Trophy cup icon for achievement displays. */
export const TrophyIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 2H16V9C16 11.2 14.2 13 12 13C9.8 13 8 11.2 8 9V2Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 4H5C5 7 6.5 8.5 8 9"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 4H19C19 7 17.5 8.5 16 9"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 13V16" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M8 22H16V19C16 17.9 15.1 17 14 17H10C8.9 17 8 17.9 8 19V22Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

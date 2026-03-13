import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Wheat/grain stalk icon for the "Curious Peasant" rank. */
export const WheatIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 21V8" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M12 8C12 8 9 5 7 5C9 5 12 2 12 2C12 2 15 5 17 5C15 5 12 8 12 8Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 13C8 13 6.5 10.5 5 10C6.5 10.5 7 8 7 8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 13C16 13 17.5 10.5 19 10C17.5 10.5 17 8 17 8"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 17C9 17 7 14.5 5.5 14C7 14.5 7.5 12 7.5 12"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 17C15 17 17 14.5 18.5 14C17 14.5 16.5 12 16.5 12"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

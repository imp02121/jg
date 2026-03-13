import type React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Clock face icon for time-related displays. */
export const ClockIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} />
      <Path
        d="M12 6V12L16 14"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

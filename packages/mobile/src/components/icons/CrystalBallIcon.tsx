import type React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Mystical crystal ball on stand for the "Immortal Oracle" rank. */
export const CrystalBallIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={10} r={7} stroke={color} strokeWidth={sw} />
      <Path d="M9 7C10 6 11 5.5 13 6" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />
      <Path
        d="M8 17L7 20H17L16 17"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 20H18V22H6V20Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

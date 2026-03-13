import type React from "react";
import Svg, { Circle, Path, Line } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Anchor icon for maritime/naval category questions. */
export const AnchorIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={5} r={2} stroke={color} strokeWidth={sw} />
      <Line x1={12} y1={7} x2={12} y2={21} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M5 13H7C7 17 9.2 19.5 12 21C14.8 19.5 17 17 17 13H19"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={8} y1={10} x2={16} y2={10} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

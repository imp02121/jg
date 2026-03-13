import type React from "react";
import Svg, { Path, Line, Rect } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Classical pillared building/archive for the "Grand Archivist" rank. */
export const ColumnsIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 21H21" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Rect
        x={3}
        y={18}
        width={18}
        height={3}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M4 7H20L12 2L4 7Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={6} y1={7} x2={6} y2={18} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={10} y1={7} x2={10} y2={18} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={14} y1={7} x2={14} y2={18} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Line x1={18} y1={7} x2={18} y2={18} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

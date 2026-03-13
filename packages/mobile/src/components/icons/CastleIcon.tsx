import type React from "react";
import Svg, { Path, Rect } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Castle tower icon for medieval/dynasty category questions. */
export const CastleIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 22V10L1 10V7H3V4H5V7H7V4H9V7H11V10H13V7H15V4H17V7H19V4H21V7H23V10L21 10V22H3Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={10}
        y={16}
        width={4}
        height={6}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

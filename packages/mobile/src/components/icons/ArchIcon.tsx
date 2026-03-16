import type React from "react";
import Svg, { Path, Line } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Classical triumphal arch with keystone and columns. */
export const ArchIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Base / ground line */}
      <Path d="M2 22H22" stroke={color} strokeWidth={sw} strokeLinecap="round" />

      {/* Left column */}
      <Path
        d="M4 22V6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M7 22V6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Right column */}
      <Path
        d="M17 22V6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M20 22V6"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Entablature / top beam */}
      <Path
        d="M3 6H21"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M3 4.5H21"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />

      {/* Pediment / triangle top */}
      <Path
        d="M3 4.5L12 1L21 4.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Arch opening */}
      <Path
        d="M7 22V14C7 10.5 9.2 8 12 8C14.8 8 17 10.5 17 14V22"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Keystone */}
      <Line x1={12} y1={8} x2={12} y2={9.5} stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

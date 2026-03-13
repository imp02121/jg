import type React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Globe/world icon for geography/exploration category questions. */
export const GlobeIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={sw} />
      <Path d="M3 12H21" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M12 3C14.5 5.5 16 8.5 16 12C16 15.5 14.5 18.5 12 21"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      <Path
        d="M12 3C9.5 5.5 8 8.5 8 12C8 15.5 9.5 18.5 12 21"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Svg>
  );
};

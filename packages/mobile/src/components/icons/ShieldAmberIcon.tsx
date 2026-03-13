import type React from "react";
import Svg, { Path, Circle } from "react-native-svg";
import { tierJourneymanBg } from "../../theme/colors";
import type { IconProps } from "./types";

/** Shield icon in Journeyman tier amber color. */
export const ShieldAmberIcon: React.FC<IconProps> = ({ size = 24, color = tierJourneymanBg }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 6V11C4 16.5 7.8 21.7 12 22C16.2 21.7 20 16.5 20 11V6L12 2Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={11} r={3} stroke={color} strokeWidth={sw * 0.8} />
    </Svg>
  );
};

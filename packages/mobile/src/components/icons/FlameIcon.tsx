import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Flame icon for conflict/revolution category questions and streaks. */
export const FlameIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C12 2 8 7 8 12C8 14.2 9.8 16 12 16C14.2 16 16 14.2 16 12C16 7 12 2 12 2Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 22C7.6 22 4 18.4 4 14C4 10 7 5 12 2C17 5 20 10 20 14C20 18.4 16.4 22 12 22Z"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

import type React from "react";
import Svg, { Path } from "react-native-svg";
import { tierApprenticeBg } from "../../theme/colors";
import type { IconProps } from "./types";

/** Shield icon in Apprentice tier olive color. */
export const ShieldOliveIcon: React.FC<IconProps> = ({ size = 24, color = tierApprenticeBg }) => {
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
      <Path d="M8 11H16" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />
      <Path d="M12 7V15" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />
    </Svg>
  );
};

import type React from "react";
import Svg, { Path } from "react-native-svg";
import { tierMasterBg } from "../../theme/colors";
import type { IconProps } from "./types";

/** Shield icon in Master tier crimson color. */
export const ShieldCrimsonIcon: React.FC<IconProps> = ({ size = 24, color = tierMasterBg }) => {
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
      <Path
        d="M12 7L13.5 10.5L17 11L14.5 13.5L15 17L12 15.5L9 17L9.5 13.5L7 11L10.5 10.5L12 7Z"
        stroke={color}
        strokeWidth={sw * 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

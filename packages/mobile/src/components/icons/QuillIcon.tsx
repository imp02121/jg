import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Feather quill pen icon for the "Apprentice Scribe" rank. */
export const QuillIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 2C15 3 10 8 8 12C7 14 6.5 16 7 18L4 22"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M7 18C9 18 11 17 13 15C16 12 19 7 20 2"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M10 14L8 12" stroke={color} strokeWidth={sw} strokeLinecap="round" />
      <Path d="M12 11L10 9" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

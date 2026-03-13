import type React from "react";
import Svg, { Path } from "react-native-svg";
import { accent } from "../../theme/colors";
import type { IconProps } from "./types";

/** Open book icon for literature/knowledge category questions. */
export const BookIcon: React.FC<IconProps> = ({ size = 24, color = accent }) => {
  const sw = (1.75 * size) / 24;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 4C2 4 5 2 9 2C11 2 12 3 12 3"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4C22 4 19 2 15 2C13 2 12 3 12 3"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2 4V19C2 19 5 17.5 9 17.5C11 17.5 12 18.5 12 18.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4V19C22 19 19 17.5 15 17.5C13 17.5 12 18.5 12 18.5"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 3V18.5" stroke={color} strokeWidth={sw} strokeLinecap="round" />
    </Svg>
  );
};

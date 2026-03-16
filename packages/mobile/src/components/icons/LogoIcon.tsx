import type React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";
import type { IconProps } from "./types";

/** Classical triumphal arch logo for The History Gauntlet. */
export const LogoIcon: React.FC<IconProps> = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 512 512">
    <Defs>
      <LinearGradient id="lGoldMain" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#e8d9b8" />
        <Stop offset="50%" stopColor="#d4c5a9" />
        <Stop offset="100%" stopColor="#8b7355" />
      </LinearGradient>
      <LinearGradient id="lGoldLight" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#f0e6d0" />
        <Stop offset="100%" stopColor="#c4b494" />
      </LinearGradient>
      <LinearGradient id="lPillar" x1="0" y1="0" x2="1" y2="0">
        <Stop offset="0%" stopColor="#a89878" />
        <Stop offset="25%" stopColor="#d4c5a9" />
        <Stop offset="50%" stopColor="#e8d9b8" />
        <Stop offset="75%" stopColor="#d4c5a9" />
        <Stop offset="100%" stopColor="#a89878" />
      </LinearGradient>
      <LinearGradient id="lArchStroke" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0%" stopColor="#f0e6d0" />
        <Stop offset="50%" stopColor="#d4c5a9" />
        <Stop offset="100%" stopColor="#8b7355" />
      </LinearGradient>
      <LinearGradient id="lShadowInner" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0%" stopColor="#8b7355" stopOpacity={0.15} />
        <Stop offset="100%" stopColor="#8b7355" stopOpacity={0.05} />
      </LinearGradient>
      <LinearGradient id="lPedimentFill" x1="0" y1="1" x2="0" y2="0">
        <Stop offset="0%" stopColor="#c4b494" stopOpacity={0.3} />
        <Stop offset="100%" stopColor="#e8d9b8" stopOpacity={0.1} />
      </LinearGradient>
    </Defs>

    <G x={256} y={275}>
      {/* Base platform */}
      <Rect x={-155} y={148} width={310} height={14} rx={2} fill="url(#lGoldMain)" opacity={0.7} />
      <Line x1={-155} y1={149} x2={155} y2={149} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.4} />
      <Rect x={-140} y={134} width={280} height={18} rx={2} fill="url(#lGoldMain)" opacity={0.8} />
      <Line x1={-140} y1={135} x2={140} y2={135} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.5} />

      {/* Left pillar */}
      <Rect x={-122} y={118} width={52} height={20} rx={1.5} fill="url(#lGoldMain)" opacity={0.85} />
      <Line x1={-122} y1={119} x2={-70} y2={119} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.4} />
      <Rect x={-116} y={-58} width={40} height={176} fill="url(#lPillar)" opacity={0.8} />
      <Line x1={-108} y1={-52} x2={-108} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Line x1={-100} y1={-52} x2={-100} y2={118} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.2} />
      <Line x1={-96} y1={-52} x2={-96} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Line x1={-88} y1={-52} x2={-88} y2={118} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.2} />
      <Line x1={-84} y1={-52} x2={-84} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Rect x={-122} y={-72} width={52} height={8} rx={1} fill="url(#lGoldLight)" opacity={0.9} />
      <Rect x={-119} y={-64} width={46} height={6} rx={1} fill="url(#lGoldMain)" opacity={0.85} />
      <Circle cx={-118} cy={-72} r={4} fill="none" stroke="url(#lGoldMain)" strokeWidth={1.5} opacity={0.5} />
      <Circle cx={-74} cy={-72} r={4} fill="none" stroke="url(#lGoldMain)" strokeWidth={1.5} opacity={0.5} />

      {/* Right pillar */}
      <Rect x={70} y={118} width={52} height={20} rx={1.5} fill="url(#lGoldMain)" opacity={0.85} />
      <Line x1={70} y1={119} x2={122} y2={119} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.4} />
      <Rect x={76} y={-58} width={40} height={176} fill="url(#lPillar)" opacity={0.8} />
      <Line x1={84} y1={-52} x2={84} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Line x1={92} y1={-52} x2={92} y2={118} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.2} />
      <Line x1={96} y1={-52} x2={96} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Line x1={100} y1={-52} x2={100} y2={118} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.2} />
      <Line x1={108} y1={-52} x2={108} y2={118} stroke="#a89878" strokeWidth={1} opacity={0.35} />
      <Rect x={70} y={-72} width={52} height={8} rx={1} fill="url(#lGoldLight)" opacity={0.9} />
      <Rect x={73} y={-64} width={46} height={6} rx={1} fill="url(#lGoldMain)" opacity={0.85} />
      <Circle cx={74} cy={-72} r={4} fill="none" stroke="url(#lGoldMain)" strokeWidth={1.5} opacity={0.5} />
      <Circle cx={118} cy={-72} r={4} fill="none" stroke="url(#lGoldMain)" strokeWidth={1.5} opacity={0.5} />

      {/* Arch */}
      <Path d="M-100,-52 A100,100 0 0,1 100,-52 L100,118 L-100,118 Z" fill="url(#lShadowInner)" />
      <Path d="M-116,-58 A116,116 0 0,1 116,-58" fill="none" stroke="url(#lArchStroke)" strokeWidth={16} opacity={0.85} />
      <Path d="M-100,-52 A100,100 0 0,1 100,-52" fill="none" stroke="#a89878" strokeWidth={1.5} opacity={0.4} />
      <Path d="M-124,-58 A124,124 0 0,1 124,-58" fill="none" stroke="#f0e6d0" strokeWidth={0.8} opacity={0.25} />

      {/* Keystone */}
      <Polygon points="-14,-172 14,-172 18,-156 -18,-156" fill="url(#lGoldLight)" opacity={0.9} />
      <Polygon points="-10,-168 10,-168 13,-158 -13,-158" fill="url(#lGoldMain)" opacity={0.7} />
      <Line x1={0} y1={-170} x2={0} y2={-158} stroke="#a89878" strokeWidth={0.8} opacity={0.4} />

      {/* Entablature */}
      <Rect x={-130} y={-82} width={260} height={10} rx={1} fill="url(#lGoldMain)" opacity={0.8} />
      <Line x1={-130} y1={-82} x2={130} y2={-82} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.4} />
      <Rect x={-128} y={-100} width={256} height={18} rx={1} fill="url(#lGoldMain)" opacity={0.65} />
      {/* Triglyphs */}
      <G opacity={0.4}>
        <Rect x={-100} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
        <Rect x={-60} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
        <Rect x={-20} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
        <Rect x={16} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
        <Rect x={52} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
        <Rect x={92} y={-97} width={8} height={12} rx={0.5} fill="#a89878" />
      </G>
      <Rect x={-134} y={-108} width={268} height={8} rx={1} fill="url(#lGoldLight)" opacity={0.75} />
      <Line x1={-134} y1={-108} x2={134} y2={-108} stroke="#f0e6d0" strokeWidth={0.5} opacity={0.5} />

      {/* Pediment */}
      <Polygon points="0,-160 -138,-108 138,-108" fill="url(#lPedimentFill)" />
      <Polygon points="0,-160 -138,-108 138,-108" fill="none" stroke="url(#lArchStroke)" strokeWidth={3} opacity={0.7} />
      <Polygon points="0,-148 -125,-112 125,-112" fill="none" stroke="#a89878" strokeWidth={0.8} opacity={0.3} />

      {/* Pediment ornament */}
      <Circle cx={0} cy={-128} r={10} fill="none" stroke="url(#lGoldMain)" strokeWidth={1.5} opacity={0.6} />
      <Circle cx={0} cy={-128} r={5} fill="url(#lGoldMain)" opacity={0.3} />
      <Path d="M-14,-128 Q-10,-136 0,-138" fill="none" stroke="url(#lGoldMain)" strokeWidth={1.2} opacity={0.5} />
      <Path d="M14,-128 Q10,-136 0,-138" fill="none" stroke="url(#lGoldMain)" strokeWidth={1.2} opacity={0.5} />
      <Path d="M-12,-125 Q-8,-132 0,-134" fill="none" stroke="url(#lGoldMain)" strokeWidth={1} opacity={0.35} />
      <Path d="M12,-125 Q8,-132 0,-134" fill="none" stroke="url(#lGoldMain)" strokeWidth={1} opacity={0.35} />

      {/* Acroteria */}
      <Circle cx={-138} cy={-108} r={5} fill="url(#lGoldMain)" opacity={0.5} />
      <Circle cx={138} cy={-108} r={5} fill="url(#lGoldMain)" opacity={0.5} />
      <Circle cx={0} cy={-160} r={6} fill="url(#lGoldLight)" opacity={0.6} />

      {/* Inner arch steps */}
      <Rect x={-70} y={100} width={140} height={6} rx={1} fill="url(#lGoldMain)" opacity={0.25} />
      <Rect x={-55} y={88} width={110} height={6} rx={1} fill="url(#lGoldMain)" opacity={0.15} />
    </G>
  </Svg>
);

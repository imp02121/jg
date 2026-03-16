<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldMain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e8d9b8" />
      <stop offset="50%" stop-color="#d4c5a9" />
      <stop offset="100%" stop-color="#8b7355" />
    </linearGradient>
    <linearGradient id="goldLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f0e6d0" />
      <stop offset="100%" stop-color="#c4b494" />
    </linearGradient>
    <linearGradient id="pillarL" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a89878" />
      <stop offset="25%" stop-color="#d4c5a9" />
      <stop offset="50%" stop-color="#e8d9b8" />
      <stop offset="75%" stop-color="#d4c5a9" />
      <stop offset="100%" stop-color="#a89878" />
    </linearGradient>
    <linearGradient id="pillarR" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#a89878" />
      <stop offset="25%" stop-color="#d4c5a9" />
      <stop offset="50%" stop-color="#e8d9b8" />
      <stop offset="75%" stop-color="#d4c5a9" />
      <stop offset="100%" stop-color="#a89878" />
    </linearGradient>
    <linearGradient id="archStroke" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f0e6d0" />
      <stop offset="50%" stop-color="#d4c5a9" />
      <stop offset="100%" stop-color="#8b7355" />
    </linearGradient>
    <linearGradient id="shadowInner" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b7355" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#8b7355" stop-opacity="0.05" />
    </linearGradient>
    <linearGradient id="pedimentFill" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#c4b494" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#e8d9b8" stop-opacity="0.1" />
    </linearGradient>
    <filter id="softGlow">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="dropShadow">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#1a1410" flood-opacity="0.3" />
    </filter>
  </defs>

  <g transform="translate(256, 275)" filter="url(#dropShadow)">

    <!-- ===== BASE PLATFORM ===== -->
    <!-- Bottom step -->
    <rect x="-155" y="148" width="310" height="14" rx="2" fill="url(#goldMain)" opacity="0.7" />
    <line x1="-155" y1="149" x2="155" y2="149" stroke="#f0e6d0" stroke-width="0.5" opacity="0.4" />
    <!-- Top step -->
    <rect x="-140" y="134" width="280" height="18" rx="2" fill="url(#goldMain)" opacity="0.8" />
    <line x1="-140" y1="135" x2="140" y2="135" stroke="#f0e6d0" stroke-width="0.5" opacity="0.5" />

    <!-- ===== LEFT PILLAR ===== -->
    <!-- Plinth -->
    <rect x="-122" y="118" width="52" height="20" rx="1.5" fill="url(#goldMain)" opacity="0.85" />
    <line x1="-122" y1="119" x2="-70" y2="119" stroke="#f0e6d0" stroke-width="0.5" opacity="0.4" />
    <!-- Shaft -->
    <rect x="-116" y="-58" width="40" height="176" fill="url(#pillarL)" opacity="0.8" />
    <!-- Fluting -->
    <line x1="-108" y1="-52" x2="-108" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <line x1="-100" y1="-52" x2="-100" y2="118" stroke="#f0e6d0" stroke-width="0.5" opacity="0.2" />
    <line x1="-96" y1="-52" x2="-96" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <line x1="-88" y1="-52" x2="-88" y2="118" stroke="#f0e6d0" stroke-width="0.5" opacity="0.2" />
    <line x1="-84" y1="-52" x2="-84" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <!-- Capital (top decoration) -->
    <rect x="-122" y="-72" width="52" height="8" rx="1" fill="url(#goldLight)" opacity="0.9" />
    <rect x="-119" y="-64" width="46" height="6" rx="1" fill="url(#goldMain)" opacity="0.85" />
    <!-- Small volute curls -->
    <circle cx="-118" cy="-72" r="4" fill="none" stroke="url(#goldMain)" stroke-width="1.5" opacity="0.5" />
    <circle cx="-74" cy="-72" r="4" fill="none" stroke="url(#goldMain)" stroke-width="1.5" opacity="0.5" />

    <!-- ===== RIGHT PILLAR ===== -->
    <!-- Plinth -->
    <rect x="70" y="118" width="52" height="20" rx="1.5" fill="url(#goldMain)" opacity="0.85" />
    <line x1="70" y1="119" x2="122" y2="119" stroke="#f0e6d0" stroke-width="0.5" opacity="0.4" />
    <!-- Shaft -->
    <rect x="76" y="-58" width="40" height="176" fill="url(#pillarR)" opacity="0.8" />
    <!-- Fluting -->
    <line x1="84" y1="-52" x2="84" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <line x1="92" y1="-52" x2="92" y2="118" stroke="#f0e6d0" stroke-width="0.5" opacity="0.2" />
    <line x1="96" y1="-52" x2="96" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <line x1="100" y1="-52" x2="100" y2="118" stroke="#f0e6d0" stroke-width="0.5" opacity="0.2" />
    <line x1="108" y1="-52" x2="108" y2="118" stroke="#a89878" stroke-width="1" opacity="0.35" />
    <!-- Capital -->
    <rect x="70" y="-72" width="52" height="8" rx="1" fill="url(#goldLight)" opacity="0.9" />
    <rect x="73" y="-64" width="46" height="6" rx="1" fill="url(#goldMain)" opacity="0.85" />
    <!-- Volute curls -->
    <circle cx="74" cy="-72" r="4" fill="none" stroke="url(#goldMain)" stroke-width="1.5" opacity="0.5" />
    <circle cx="118" cy="-72" r="4" fill="none" stroke="url(#goldMain)" stroke-width="1.5" opacity="0.5" />

    <!-- ===== ARCH ===== -->
    <!-- Inner arch shadow fill -->
    <path d="M-100,-52 A100,100 0 0,1 100,-52 L100,118 L-100,118 Z" fill="url(#shadowInner)" />
    <!-- Outer arch band -->
    <path d="M-116,-58 A116,116 0 0,1 116,-58" fill="none" stroke="url(#archStroke)" stroke-width="16" opacity="0.85" />
    <!-- Inner arch edge -->
    <path d="M-100,-52 A100,100 0 0,1 100,-52" fill="none" stroke="#a89878" stroke-width="1.5" opacity="0.4" />
    <!-- Outer arch edge highlight -->
    <path d="M-124,-58 A124,124 0 0,1 124,-58" fill="none" stroke="#f0e6d0" stroke-width="0.8" opacity="0.25" />

    <!-- ===== KEYSTONE ===== -->
    <polygon points="-14,-172 14,-172 18,-156 -18,-156" fill="url(#goldLight)" opacity="0.9" />
    <polygon points="-10,-168 10,-168 13,-158 -13,-158" fill="url(#goldMain)" opacity="0.7" />
    <!-- Keystone center line -->
    <line x1="0" y1="-170" x2="0" y2="-158" stroke="#a89878" stroke-width="0.8" opacity="0.4" />

    <!-- ===== ENTABLATURE (above columns) ===== -->
    <!-- Architrave -->
    <rect x="-130" y="-82" width="260" height="10" rx="1" fill="url(#goldMain)" opacity="0.8" />
    <line x1="-130" y1="-82" x2="130" y2="-82" stroke="#f0e6d0" stroke-width="0.5" opacity="0.4" />
    <!-- Frieze -->
    <rect x="-128" y="-100" width="256" height="18" rx="1" fill="url(#goldMain)" opacity="0.65" />
    <!-- Frieze decorative triglyphs -->
    <g opacity="0.4">
      <rect x="-100" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
      <rect x="-60" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
      <rect x="-20" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
      <rect x="16" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
      <rect x="52" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
      <rect x="92" y="-97" width="8" height="12" rx="0.5" fill="#a89878" />
    </g>
    <!-- Cornice -->
    <rect x="-134" y="-108" width="268" height="8" rx="1" fill="url(#goldLight)" opacity="0.75" />
    <line x1="-134" y1="-108" x2="134" y2="-108" stroke="#f0e6d0" stroke-width="0.5" opacity="0.5" />

    <!-- ===== PEDIMENT (triangle) ===== -->
    <polygon points="0,-160 -138,-108 138,-108" fill="url(#pedimentFill)" />
    <polygon points="0,-160 -138,-108 138,-108" fill="none" stroke="url(#archStroke)" stroke-width="3" opacity="0.7" />
    <!-- Inner pediment line -->
    <polygon points="0,-148 -125,-112 125,-112" fill="none" stroke="#a89878" stroke-width="0.8" opacity="0.3" />

    <!-- Pediment center ornament (small laurel/circle) -->
    <circle cx="0" cy="-128" r="10" fill="none" stroke="url(#goldMain)" stroke-width="1.5" opacity="0.6" />
    <circle cx="0" cy="-128" r="5" fill="url(#goldMain)" opacity="0.3" />
    <!-- Small laurel leaves -->
    <path d="M-14,-128 Q-10,-136 0,-138" fill="none" stroke="url(#goldMain)" stroke-width="1.2" opacity="0.5" />
    <path d="M14,-128 Q10,-136 0,-138" fill="none" stroke="url(#goldMain)" stroke-width="1.2" opacity="0.5" />
    <path d="M-12,-125 Q-8,-132 0,-134" fill="none" stroke="url(#goldMain)" stroke-width="1" opacity="0.35" />
    <path d="M12,-125 Q8,-132 0,-134" fill="none" stroke="url(#goldMain)" stroke-width="1" opacity="0.35" />

    <!-- ===== ACROTERIA (pediment corner ornaments) ===== -->
    <circle cx="-138" cy="-108" r="5" fill="url(#goldMain)" opacity="0.5" />
    <circle cx="138" cy="-108" r="5" fill="url(#goldMain)" opacity="0.5" />
    <circle cx="0" cy="-160" r="6" fill="url(#goldLight)" opacity="0.6" />

    <!-- ===== INNER ARCH DETAILS ===== -->
    <!-- Steps inside the arch -->
    <rect x="-70" y="100" width="140" height="6" rx="1" fill="url(#goldMain)" opacity="0.25" />
    <rect x="-55" y="88" width="110" height="6" rx="1" fill="url(#goldMain)" opacity="0.15" />

  </g>
</svg>
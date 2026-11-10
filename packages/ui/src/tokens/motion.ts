export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    // The chart, from its approved mockup
    chartDraw: 1400,
    chartFillDelay: 700,
    chartFillRise: 900,
    chartDotsDelay: 1200,
    chartDottedFade: 600,
    // One pulse of the current month's dot, out and back
    chartPulse: 2400,
    // The start-up splash ("Signature"), from its approved mockup
    splashRiseDelay: 150,
    splashRise: 600,
    splashNameDelay: 380,
    splashLineDelay: 240,
    splashLetter: 420,
    splashLetterStagger: 36,
    splashHandOver: 600,
    splashFadeOutDelay: 100,
    splashFadeOut: 300,
    splashPurpleFade: 200,
    splashEntranceDelay: 250,
    splashEntrance: 420,
    splashEntranceStagger: 90,
  },
  // Distances things travel while they come in, in points
  distance: {
    chartRise: 8,
    // A Toast rising into place as it fades in
    toastRise: 8,
  },
  easing: {
    standard: [0.2, 0.8, 0.2, 1],
    emphasized: [0.7, 0, 0.2, 1],
    // A soft spring: a little past the end, then back
    overshoot: [0.33, 1.73, 0.67, 1],
    // Starts fast, slows gently to a stop
    enter: [0.33, 1, 0.67, 1],
    // Starts slowly, speeds up, then slows to a stop
    glide: [0.65, 0, 0.35, 1],
  },
} as const;

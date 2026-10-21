/* Idea Pop scroll journey. No framework, clock, DOM, or rendering side effects.
 * Route coordinates are the approved live route, measured against DOM sections.
 */
(function (global) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const smoothstep = (a, b, n) => {
    if (a === b) return n < a ? 0 : 1;
    const t = clamp((n - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const ANCHOR = Object.freeze({ x: 738, y: 644 });
  const CONFIG = Object.freeze({
    designWidth: 1920, designHeight: 8988,
    approach: 0.45, aligned: 0.75, wingbeat: 0.4,
    exitFadeNative: 100, exitTravelNative: 120, exitWingsNative: 400,
    extraEntryScrollVh: 0.25, entryFadeVh: 0.08,
    paperApproachVh: 0.16, paperAirScale: 0.85, paperFinalScale: 0.60,
    sceneHoldVh: 0.75, sceneEntryFadeVh: 0.16, exitHeadingTopVh: 0.12,
    wingSpeedMultiplier: 0.25, footerAt: 8120, footerSlideMs: 1200
  });
  const route = Object.freeze([
    { at: 387, x: 1418, y: 387, scale: .369 },
    { at: 1450, x: 1780, y: 1450, scale: .17 },
    { at: 1990, x: 1680, y: 1990, scale: .2 },
    { at: 2450, x: 815, y: 2595, scale: .7 },
    { at: 2600, x: 815, y: 2595, scale: .7 },
    { at: 3000, x: 815, y: 2595, scale: .7 },
    { at: 3150, x: 350, y: 3140, scale: .3 },
    { at: 3360, x: 180, y: 3360, scale: .18 },
    { at: 3880, x: 160, y: 3880, scale: .17 },
    { at: 4400, x: 0, y: 0, scale: 0, mission: 'land' },
    { at: 4700, x: 0, y: 0, scale: 0, mission: 'leave' },
    { at: 5217, x: 1740, y: 5217, scale: .17 },
    { at: 5950, x: 1750, y: 5950, scale: .17 },
    { at: 6500, x: 1740, y: 6500, scale: .16 },
    { at: 7050, x: 1760, y: 7050, scale: .16 },
    { at: 7550, x: 1740, y: 7550, scale: .16 },
    { at: 7780, x: 1740, y: 7780, scale: .16 },
    { at: 8120, x: 210, y: 8120, scale: .17 }
  ].map(Object.freeze));
  const sectionAnchors = Object.freeze([
    [0, '[data-scroll-timeline="hero"]'],
    [1083, 'section[aria-label="what a year looks like"]'],
    [1674, 'section[aria-label="how it works"]'],
    [2217, 'section[aria-label="paint together"]'],
    [3237, 'section[aria-label="curriculum"]'],
    [4190, 'section[aria-label="try a mission"]'],
    [5220, 'section[aria-label="made by kids"]'],
    [5602, 'section[aria-label="experts"]'],
    [6007, 'section[aria-label="pricing"]'],
    [6750, 'section[aria-label="questions parents ask"]'],
    [7866, 'section[aria-label="start for free"]'],
    [8254, 'footer']
  ]);
  function piecewise(from, to, value) {
    let i = 0;
    while (i < from.length - 2 && value > from[i + 1]) i++;
    return mix(to[i], to[i + 1], (value - from[i]) / Math.max(1e-6, from[i + 1] - from[i]));
  }
  function missionTiming({ land, leave, nativeToDoc, docToNative, viewportHeight, delayViewports = CONFIG.extraEntryScrollVh }) {
    // Crucial: arrive and leave never depend on the opacity delay.
    const arrive = 3880 + CONFIG.aligned * (land - 3880);
    const arriveDoc = nativeToDoc(arrive);
    const latestStartDoc = nativeToDoc(leave) - .12 * viewportHeight;
    const enterDoc = Math.max(arriveDoc, Math.min(arriveDoc + delayViewports * viewportHeight, latestStartDoc));
    const enter = docToNative(enterDoc);
    const entered = Math.max(enter + 1, Math.min(docToNative(enterDoc + CONFIG.entryFadeVh * viewportHeight), leave - 1));
    return { land, leave, arrive, enter, entered };
  }
  function missionState(focus, mission, reducedMotion = false) {
    const sinceLeave = focus - mission.leave;
    const leaving = sinceLeave > 0;
    const span = mission.entered - mission.enter;
    // A short stagger avoids two opposite bird silhouettes being superimposed.
    // The flying bird disappears first; the exact paper artwork follows it.
    const reveal = leaving
      ? 1 - smoothstep(0, CONFIG.exitFadeNative * .55, sinceLeave)
      : smoothstep(mission.enter + span * .42, mission.entered, focus);
    const opacity = leaving
      ? smoothstep(CONFIG.exitFadeNative * .45, CONFIG.exitFadeNative, sinceLeave)
      : 1 - smoothstep(mission.enter, mission.enter + span * .55, focus);
    // Alignment changes are allowed only at the fully invisible endpoint.
    const hiddenAlignment = !reducedMotion && reveal >= 1;
    return {
      reveal, opacity, hiddenAlignment, sinceLeave, leaving,
      resting: leaving ? sinceLeave < CONFIG.exitFadeNative : focus >= mission.entered
    };
  }
  function sceneScrollTiming({ frameTop, frameHeight, viewportHeight, holdPixels, kidsHeadingTop }) {
    // Keep the paper visible even on a wide, short viewport.
    const pinTop = Math.min(72, Math.max(16, (viewportHeight - frameHeight) * .22), viewportHeight - frameHeight - 80);
    const pinStart = frameTop - pinTop;
    const pinEnd = pinStart + holdPixels;
    const enterScroll = pinStart + holdPixels * .15;
    const enteredScroll = enterScroll + CONFIG.sceneEntryFadeVh * viewportHeight;
    const exitHeadingTop = clamp(viewportHeight * CONFIG.exitHeadingTopVh, 72, 120);
    const leaveScroll = Math.max(enteredScroll + viewportHeight * .35, kidsHeadingTop - exitHeadingTop);
    return { frameTop, frameHeight, pinTop, pinStart, pinEnd, holdPixels, enterScroll, enteredScroll, leaveScroll, exitHeadingTop };
  }
  function pinOffset(scroll, scene) {
    return scene ? clamp(scroll - scene.pinStart, 0, scene.holdPixels) : 0;
  }
  function shoulderTrigger(measuredRoute, mission, frame) {
    const k = frame.width / 1670;
    // The shoulder landmark is on the photograph, not on the viewport.
    const shoulder = { X: frame.left + 650 * k, Y: frame.top + 535 * k };
    for (let focus = 3880; focus <= mission.arrive; focus += 1) {
      const pose = getPose(measuredRoute, focus, mission);
      const beakX = pose.X + (188 - ANCHOR.x) * pose.S;
      const beakY = pose.Y + (371 - ANCHOR.y) * pose.S;
      if (beakX >= shoulder.X && beakY >= shoulder.Y) return focus;
    }
    return mission.arrive;
  }
  function getPose(measuredRoute, focus, mission) {
    if (focus <= measuredRoute[0].at) return { ...measuredRoute[0] };
    if (focus >= measuredRoute.at(-1).at) return { ...measuredRoute.at(-1) };
    let i = 0;
    while (measuredRoute[i + 1].at < focus) i++;
    const a = measuredRoute[i], b = measuredRoute[i + 1];
    const t = smoothstep(a.at, b.at, focus);
    const verticalT = focus >= 3360 && b.at !== mission.arrive ? clamp((focus - a.at) / (b.at - a.at), 0, 1) : t;
    return { at: focus, X: mix(a.X, b.X, t), Y: mix(a.Y, b.Y, verticalT), S: mix(a.S, b.S, t) };
  }
  function dockPose(pose, focus, mission) {
    if (!mission.paper || focus <= mission.dockStart || focus > mission.leave) return { ...pose, docking: 0 };
    const dockEnd = mission.enter + (mission.entered - mission.enter) * .55;
    const t = smoothstep(mission.dockStart, dockEnd, focus);
    const from = mission.dockFrom || pose;
    return {
      ...pose,
      X: mix(from.X, mission.paper.X, t),
      Y: mix(from.Y, mission.paper.Y, t),
      S: mix(from.S, mission.paper.S, t),
      docking: t
    };
  }
  function fitMission(frame) {
    // Least-squares similarity fit of source beak, eye, and body to paper art.
    // The reflected source fit is only a measurement; it never rotates the rig.
    const source = [[188, 371], [532, 497], [738, 644]].map(([x, y]) => [x - ANCHOR.x, -(y - ANCHOR.y) * .8]);
    const target = [[905, 875], [1102, 887], [1205, 830]].map(([x, y]) => [frame.left + x / 1670 * frame.width, frame.top + y / 942 * frame.height]);
    const mean = points => [0, 1].map(axis => points.reduce((s, p) => s + p[axis], 0) / points.length);
    const a = mean(source), b = mean(target);
    let dot = 0, cross = 0, energy = 0;
    source.forEach((p, i) => {
      const x = p[0] - a[0], y = p[1] - a[1];
      const u = target[i][0] - b[0], v = target[i][1] - b[1];
      dot += x * u + y * v; cross += x * v - y * u; energy += x * x + y * y;
    });
    const angle = Math.atan2(cross, dot), S = Math.hypot(dot, cross) / energy;
    const c = Math.cos(angle), s = Math.sin(angle);
    return { X: b[0] - S * (c * a[0] - s * a[1]), Y: b[1] - S * (s * a[0] + c * a[1]), S, angle };
  }
  function girlReveal(focus) {
    if (focus <= 2350 || focus >= 3300) return 0;
    if (focus < 2500) return smoothstep(2350, 2500, focus);
    if (focus <= 3000) return 1;
    return 1 - smoothstep(3000, 3300, focus);
  }
  const api = { CONFIG, ANCHOR, route, sectionAnchors, clamp, mix, smoothstep, piecewise, missionTiming, missionState, sceneScrollTiming, pinOffset, shoulderTrigger, getPose, dockPose, fitMission, girlReveal };
  if (typeof module === 'object' && module.exports) module.exports = api;
  global.IdeaPopMotionCore = api;
})(typeof globalThis === 'object' ? globalThis : this);

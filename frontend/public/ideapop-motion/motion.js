/* Complete Idea Pop flight controller. Mount once, destroy on navigation.
 * This preserves the live site's DOM mapping and flight path, with paper entry
 * controlled independently from path geometry. See motion-core.js for constants.
 */
(function (global) {
  'use strict';
  const C = global.IdeaPopMotionCore;
  const { CONFIG: K, ANCHOR, clamp, mix, smoothstep } = C;
  function mount(host, options = {}) {
    if (!host) throw new Error('A flying bird host is required.');
    // Avoid duplicate controllers during React Strict Mode / hot reload.
    if (host.ideaPopController) host.ideaPopController.destroy();
    const doc = host.ownerDocument, win = doc.defaultView;
    const motionPreference = win.matchMedia('(prefers-reduced-motion: reduce)');
    const tail = host.querySelector('.tail');
    const wing = global.IdeaPopWingFlight ? new global.IdeaPopWingFlight(host) : null;
    const cleanup = [];
    let geometry, dirty = true, destroyed = false, raf = 0, lastTime = 0;
    let lastFocus = 387, amplitude = .65, hoverStart = null, reduced = motionPreference.matches;
    let latest = {}, playing = null, paused = false, frozenScroll = null;
    let pinnedScene = null;
    let lastWing, lastGirl = '', lastMission = '', sleeping = false;
    const on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); cleanup.push(() => target.removeEventListener(type, fn, opts)); };
    const nativeToDoc = n => C.piecewise(geometry.native, geometry.doc, n);
    const docToNative = n => C.piecewise(geometry.doc, geometry.native, n);
    const docBounds = element => {
      const b = element.getBoundingClientRect();
      return { left: b.left + win.scrollX, top: b.top + win.scrollY, width: b.width, height: b.height };
    };
    function preparePinnedScene(height) {
      const image = doc.querySelector('[data-bird-mission]');
      const frame = image?.closest('[data-zoom-frame]');
      const section = frame?.closest('section');
      if (!frame || !section) return null;
      if (!pinnedScene) {
        const sentinel = doc.createElement('span');
        sentinel.setAttribute('aria-hidden', 'true'); sentinel.dataset.missionFlowOrigin = '';
        sentinel.style.cssText = 'display:block;height:0;line-height:0;pointer-events:none';
        frame.before(sentinel);
        const wrapper = doc.createElement('div');
        wrapper.dataset.missionPinTrack = '';
        wrapper.style.position = 'relative';
        frame.before(wrapper); wrapper.appendChild(frame);
        const zoom = frame.querySelector('[data-scroll="zoom-out"]');
        const saved = [
          [section, 'padding-bottom'], [frame, 'position'], [frame, 'top'],
          ...(zoom ? [[zoom, 'transform']] : [])
        ].map(([element, property]) => [element, property, element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
        pinnedScene = { frame, section, sentinel, wrapper, zoom, saved, basePadding: parseFloat(win.getComputedStyle(section).paddingBottom) || 0 };
      }
      const width = frame.getBoundingClientRect().width;
      const frameHeight = width * 942 / 1670;
      const holdPixels = reduced ? 0 : clamp(height * K.sceneHoldVh, 360, 800);
      const naturalTop = docBounds(pinnedScene.sentinel).top;
      const kids = doc.querySelector('section[aria-label="made by kids"] h2');
      const pin = C.sceneScrollTiming({ frameTop: naturalTop, frameHeight, viewportHeight: height, holdPixels, kidsHeadingTop: 0 });
      section.style.setProperty('padding-bottom', `${pinnedScene.basePadding}px`);
      pinnedScene.wrapper.style.height = `${frameHeight + holdPixels}px`;
      frame.style.setProperty('position', 'sticky'); frame.style.setProperty('top', `${pin.pinTop}px`);
      // The existing reveal zoom would move the paper beneath a registered rig.
      pinnedScene.zoom?.style.setProperty('transform', 'none', 'important');
      const kidsHeadingTop = kids ? docBounds(kids).top : naturalTop + frameHeight + holdPixels + 35;
      return { ...C.sceneScrollTiming({ frameTop: naturalTop, frameHeight, viewportHeight: height, holdPixels, kidsHeadingTop }), width, left: docBounds(frame).left };
    }
    function measure() {
      const width = doc.documentElement.clientWidth, height = win.innerHeight, g = width / 1920;
      const scene = preparePinnedScene(height);
      const native = [], documentY = [];
      for (const [at, selector] of C.sectionAnchors) {
        const element = doc.querySelector(selector);
        if (!element) continue;
        const top = docBounds(element).top;
        if (documentY.length && top <= documentY.at(-1)) continue;
        native.push(at); documentY.push(top);
      }
      native.push(8988); documentY.push(Math.max(doc.documentElement.scrollHeight, (documentY.at(-1) || 0) + 1));
      if (native.length < 2) return false;
      geometry = {
        g, phone: width < 768, lead: width < 768 ? height * .3 : Math.min(height * .38, 300 * g),
        maxScroll: Math.max(0, doc.documentElement.scrollHeight - height), native, doc: documentY, scene
      };
      let heroPose = null;
      const hero = doc.querySelector('.hero-viewport');
      if (hero?.dataset.artS) {
        const b = docBounds(hero);
        if (hero.dataset.birdX) {
          heroPose = { X: b.left + Number(hero.dataset.birdX), Y: b.top + Number(hero.dataset.birdY), S: Number(hero.dataset.birdS) };
        } else {
          const s = Number(hero.dataset.artS);
          heroPose = { X: b.left + Number(hero.dataset.artHx) + 1418 / 1.1497 * s, Y: b.top + Number(hero.dataset.artHy) + (387 / 1.1497 + 40) * s, S: .369 / 1.1497 * s };
        }
      }
      let fit = null;
      const missionImage = doc.querySelector('[data-bird-mission]');
      if (missionImage) {
        const b = docBounds(missionImage.closest('[data-zoom-frame]') || missionImage);
        const frame = { ...b, top: scene ? scene.frameTop : b.top, height: b.width * 942 / 1670 };
        fit = C.fitMission(frame);
        const bodyDocY = frame.top + 830 / 942 * frame.height;
        const land = clamp(docToNative(bodyDocY - .6 * height + geometry.lead), 4180, 4900);
        const leave = scene ? docToNative(scene.leaveScroll + geometry.lead) : clamp(docToNative(bodyDocY - .25 * height + geometry.lead), land + 40, 5217 - K.exitTravelNative - 200);
        const timing = scene ? {
          land, leave, arrive: 3880 + K.aligned * (land - 3880),
          enter: docToNative(scene.enterScroll + geometry.lead), entered: docToNative(scene.enteredScroll + geometry.lead)
        } : C.missionTiming({ land, leave, nativeToDoc, docToNative, viewportHeight: height, delayViewports: options.extraEntryScrollVh ?? K.extraEntryScrollVh });
        const imageScale = frame.width / 1670;
        const paper = { X: frame.left + 1163 * imageScale, Y: frame.top + 857 * imageScale, S: fit.S * K.paperFinalScale };
        const air = { X: paper.X - 95 * imageScale, Y: paper.Y - 115 * imageScale, S: fit.S * K.paperAirScale };
        geometry.mission = {
          ...fit, ...timing, paper, air, frame,
          exitPose: scene ? {
            X: paper.X, Y: scene.leaveScroll + Math.max(scene.exitHeadingTop + 110, height * .25),
            S: Math.min(paper.S, .17 * g * (geometry.phone ? 1.8 : 1))
          } : air,
          dockStart: Math.max(timing.arrive, docToNative(nativeToDoc(timing.enter) - K.paperApproachVh * height))
        };
      } else {
        geometry.mission = { land: 4400, leave: 4700, arrive: 4270, enter: 4400, entered: 4480, angle: 0 };
      }
      let girlPose = null;
      const canvas = doc.querySelector('[data-bird-canvas]');
      if (canvas) {
        const b = docBounds(canvas), scale = Math.max(b.width / 1720, b.height / 914);
        const [px, py] = win.getComputedStyle(canvas).objectPosition.split(' ').map(v => v.endsWith('%') ? parseFloat(v) / 100 : .5);
        girlPose = {
          X: b.left + (b.width - 1720 * scale) * (px ?? .5) + 815 / 1.11628 * scale,
          Y: b.top + (b.height - 914 * scale) * (py ?? .5) + 338.6247178127352 * scale,
          S: .7 / 1.11628 * scale
        };
      }
      geometry.route = C.route.map(p => {
        if (p.at === 387 && heroPose) return { at: p.at, ...heroPose };
        if (p.at >= 2450 && p.at <= 3000 && girlPose) return { at: p.at, ...girlPose };
        if (p.mission && fit) return p.mission === 'land'
          ? { at: geometry.mission.arrive, ...geometry.mission.air, pinned: true }
          : { at: geometry.mission.leave + K.exitTravelNative, ...geometry.mission.exitPose };
        if (p.mission) return { at: p.at, X: 180 * g, Y: nativeToDoc(p.at), S: .17 * g };
        const at = p.at === 5217 && fit ? Math.max(p.at, geometry.mission.leave + K.exitTravelNative + 180) : p.at;
        return { at, X: p.x * g, Y: nativeToDoc(at === p.at ? p.y : at), S: p.scale * g * (geometry.phone ? 1.8 : 1) };
      });
      // A tall phone can carry the heading-based departure beyond a short
      // lower section. Skip only overtaken bridge points, keeping time ordered.
      geometry.route = geometry.route.reduce((ordered, point) => {
        if (!ordered.length || point.at > ordered[ordered.length - 1].at) ordered.push(point);
        return ordered;
      }, []);
      if (fit && scene) {
        const m = geometry.mission;
        m.dockStart = Math.min(m.enter - 1, C.shoulderTrigger(geometry.route, m, m.frame));
        m.dockFrom = C.getPose(geometry.route, m.dockStart, m);
        m.paper.S = Math.min(m.paper.S, m.dockFrom.S * .68);
      }
      const finalCTA = doc.querySelector('section[aria-label="start for free"] a');
      if (finalCTA) {
        const b = docBounds(finalCTA);
        geometry.arrivalY = clamp(b.top + b.height / 2, geometry.maxScroll + .2 * height, geometry.maxScroll + .8 * height);
        geometry.arrivalX = b.left + b.width + 250 * g;
        geometry.settleX = b.left + b.width + 180 * g;
      } else {
        geometry.arrivalY = nativeToDoc(8120); geometry.arrivalX = 210 * g; geometry.settleX = 140 * g;
      }
      // Idea Pop site (susan, 2026-11-01): the descent ends in the light area above the dark "Start free" band, so the
      // bird never enters the dark green; it stays there and keeps flapping (the hover loop is separate from the path).
      const closing = doc.querySelector('section[aria-label="start for free"]');
      if (closing) {
        const endScale = .17 * g * (geometry.phone ? 1.8 : 1);
        const lightBottom = docBounds(closing).top - (1348 - ANCHOR.y) * endScale - 16;
        geometry.arrivalY = Math.min(geometry.arrivalY, lightBottom);
      }
      geometry.route[geometry.route.length - 1] = { ...geometry.route.at(-1), X: geometry.arrivalX, Y: geometry.arrivalY };
      dirty = false;
      return true;
    }
    function focusForScroll(scroll) {
      const camera = docToNative(scroll + geometry.lead);
      const intro = Math.min(240, Math.max(80, .2 * win.innerHeight));
      const raw = mix(387, camera, smoothstep(0, intro, scroll));
      const finalCamera = docToNative(geometry.maxScroll + geometry.lead);
      const start = Math.max(geometry.maxScroll * .8, Math.min(geometry.maxScroll - 1, nativeToDoc(3300) - geometry.lead));
      const correction = geometry.maxScroll > 0 ? smoothstep(start, geometry.maxScroll, scroll) * Math.max(0, 8120 - finalCamera) : 0;
      return geometry.maxScroll > 0 && scroll >= geometry.maxScroll - 1 ? Math.max(8120, raw + correction) : raw + correction;
    }
    function render(now) {
      if (destroyed) return;
      if (dirty && !measure()) return;
      const dt = lastTime ? clamp((now - lastTime) / 1000, 0, .05) : 0;
      lastTime = now;
      if (playing) {
        const t = clamp((now - playing.started) / playing.duration, 0, 1);
        win.scrollTo({ top: mix(playing.from, playing.to ?? geometry.maxScroll, smoothstep(0, 1, t)), behavior: 'instant' });
        if (t >= 1) playing = null;
      }
      const scroll = frozenScroll ?? win.scrollY;
      const focus = focusForScroll(scroll);
      const pinDelta = C.pinOffset(scroll, geometry.scene);
      const currentRoute = pinDelta ? geometry.route.map(p => p.pinned ? { ...p, Y: p.Y + pinDelta } : p) : geometry.route;
      const visualMission = {
        ...geometry.mission,
        paper: geometry.mission.paper ? { ...geometry.mission.paper, Y: geometry.mission.paper.Y + pinDelta } : undefined,
        dockFrom: geometry.mission.dockFrom ? { ...geometry.mission.dockFrom, Y: geometry.mission.dockFrom.Y + pinDelta } : undefined
      };
      const basePose = C.getPose(currentRoute, focus, geometry.mission);
      const pose = C.dockPose(basePose, focus, visualMission);
      const mission = C.missionState(focus, geometry.mission, reduced);
      const girlHold = focus >= 2500 && focus <= 3000;
      const girl = C.girlReveal(focus);
      const heroIn = Math.max(Number(doc.querySelector('.hero-viewport')?.dataset.birdIn ?? 1), smoothstep(400, 900, focus));
      const girlFlight = girlHold ? 0 : (focus > 2350 && focus < 2500 || focus > 3000 && focus < 3300 ? 1 - girl : 1);
      const opacity = mission.opacity * girlFlight * heroIn;
      const terminal = focus >= 8120;
      if (terminal && hoverStart === null) hoverStart = now;
      if (!terminal) hoverStart = null;
      const hoverElapsed = terminal ? now - hoverStart : 0;
      const hoverSlide = terminal ? reduced ? 1 : smoothstep(0, K.footerSlideMs, hoverElapsed) : 0;
      const resting = reduced || paused || girlHold || mission.resting;
      const speed = dt && Math.abs(focus - lastFocus) < 650 ? Math.abs(focus - lastFocus) / dt : 0;
      const rate = (focus < 900 ? 7.2 : 7.8 + .8 * clamp(speed / 1800, 0, 1)) * K.wingSpeedMultiplier;
      let target = focus < 900 ? .65 : 1;
      if (focus > 2200 && focus < 2500) target *= 1 - smoothstep(2200, 2500, focus);
      if (focus > 3000 && focus < 3400) target *= smoothstep(3000, 3400, focus);
      const approach = clamp((focus - 3880) / (geometry.mission.land - 3880), 0, 1);
      if (!mission.leaving && approach > 0) target *= mix(1, K.wingbeat, smoothstep(K.approach, K.aligned, approach));
      if (mission.leaving && mission.sinceLeave < K.exitWingsNative) target *= smoothstep(K.exitFadeNative, K.exitWingsNative, mission.sinceLeave);
      if (focus > 7850) target *= mix(1, .85, smoothstep(7850, 8120, focus));
      amplitude = resting ? 0 : mix(amplitude, target, 1 - Math.exp(-dt / .13));
      const hoverBob = terminal ? Math.sin(hoverElapsed / 1000 * 1.65) * 8 * smoothstep(0, 600, hoverElapsed) : 0;
      const bob = resting ? 0 : (Math.sin(now / 1000 * 1.45) * 3 + Math.sin(now / 1000 * 2.13 + .8) + hoverBob) * amplitude * mix(1, .2, pose.docking);
      let x = terminal ? mix(geometry.arrivalX, geometry.settleX, hoverSlide) : pose.X;
      if (geometry.phone && !(focus > 3880 && mission.sinceLeave < K.exitTravelNative + 200)) {
        x = clamp(x, ANCHOR.x * pose.S + 4, win.innerWidth - (1659 - ANCHOR.x) * pose.S - 4);
      }
      const y = (terminal ? geometry.arrivalY : pose.Y) + bob * geometry.g;
      // The final paper artwork is a photograph layer. The flying rig always
      // stays upright; the exact drawn pose comes from the approved photo.
      // Idea Pop site (2026-11-07): no drawing at all while the bird is hidden; styles and the page-wide variables are
      // only written when they change.
      const hidden = opacity < .001;
      const vis = hidden ? 'hidden' : 'visible';
      if (host.style.visibility !== vis) host.style.visibility = vis;
      if (hidden && host.style.opacity !== '0') host.style.opacity = '0';
      let wingState = lastWing;
      if (!hidden) {
        host.style.transform = `translate3d(${(x - win.scrollX).toFixed(2)}px,${(y - win.scrollY).toFixed(2)}px,0) scale(${pose.S.toFixed(5)}) translate(${-ANCHOR.x}px,${-ANCHOR.y}px)`;
        const o = opacity.toFixed(4);
        if (host.style.opacity !== o) host.style.opacity = o;
        wingState = lastWing = wing?.update({ timeSeconds: now / 1000, amplitude, resting, pixelScale: pose.S, flapRateHz: rate });
        if (tail) tail.style.transform = `rotateZ(${(resting ? 0 : Math.sin((wingState?.phase ?? 0) * Math.PI * 2 - .65) * 3 * amplitude).toFixed(3)}deg)`;
      }
      const g4 = girl.toFixed(4), m4 = mission.reveal.toFixed(4);
      if (g4 !== lastGirl) { lastGirl = g4; doc.documentElement.style.setProperty('--painted-reveal', g4); }
      if (m4 !== lastMission) { lastMission = m4; doc.documentElement.style.setProperty('--mission-reveal', m4); }
      sleeping = hidden && heroIn >= 1 && focus === lastFocus && !playing;
      latest = {
        focus, scrollY: win.scrollY, maxScroll: geometry.maxScroll, pinDelta,
        scene: geometry.scene ? { ...geometry.scene, photoScreenTop: geometry.scene.frameTop + pinDelta - scroll } : null,
        x, y, scale: pose.S, opacity, girlReveal: girl, missionReveal: mission.reveal,
        mission: { ...geometry.mission }, hiddenAlignment: mission.hiddenAlignment, docking: pose.docking,
        visibleHeading: opacity > .001 ? 0 : null, resting, amplitude, flapRateHz: rate,
        wing: wingState, hovering: terminal, playing: !!playing, reducedMotion: reduced,
        stage: girlHold ? 'girl-paper' : mission.reveal >= 1 ? 'boy-paper' : focus >= 8120 ? 'footer' : focus > 3880 && focus < geometry.mission.enter ? 'boy-observation' : focus > geometry.mission.leave && focus < 5217 ? 'boy-departure' : focus < 900 ? 'hero' : 'flight'
      };
      if (host.dataset.motionState !== latest.stage) host.dataset.motionState = latest.stage;
      lastFocus = focus;
    }
    function tick(now) {
      raf = 0;
      if (destroyed || doc.hidden) return;
      render(now);
      if ((!reduced || playing) && !sleeping) raf = win.requestAnimationFrame(tick);
    }
    function request() { if (!raf && !destroyed) raf = win.requestAnimationFrame(tick); }
    function remeasure() { dirty = true; request(); }
    function stop() { playing = null; request(); }
    function jump(focus, behavior = 'smooth') {
      stop(); if (dirty) measure();
      win.scrollTo({ top: clamp(nativeToDoc(focus) - geometry.lead, 0, geometry.maxScroll), behavior: reduced ? 'instant' : behavior });
      request();
    }
    const api = {
      getState: () => ({ ...latest }),
      getRoute: () => geometry?.route.map(p => ({ ...p })) || [],
      getGeometry: () => geometry ? { ...geometry, route: api.getRoute() } : null,
      remeasure,
      jump,
      play() {
        paused = false; frozenScroll = null;
        if (dirty) measure();
        if (reduced) return;
        if (win.scrollY >= geometry.maxScroll - 2) win.scrollTo({ top: 0, behavior: 'instant' });
        playing = { from: win.scrollY, started: win.performance.now(), duration: Math.max(5000, 65000 * (1 - win.scrollY / geometry.maxScroll)) };
        request();
      },
      pause: stop,
      previewPaper() {
        stop(); if (dirty) measure();
        const from = clamp(nativeToDoc(geometry.mission.dockStart - 120) - geometry.lead, 0, geometry.maxScroll);
        const to = clamp(nativeToDoc(geometry.mission.leave + 170) - geometry.lead, 0, geometry.maxScroll);
        win.scrollTo({ top: from, behavior: 'instant' });
        playing = { from, to, started: win.performance.now(), duration: 14000 };
        request();
      },
      replay() { stop(); win.scrollTo({ top: 0, behavior: 'instant' }); win.setTimeout(api.play, 50); },
      destroy() {
        destroyed = true; win.cancelAnimationFrame(raf); cleanup.forEach(fn => fn()); observer.disconnect(); wing?.destroy();
        if (pinnedScene) {
          pinnedScene.saved.forEach(([element, property, value, priority]) => value ? element.style.setProperty(property, value, priority) : element.style.removeProperty(property));
          pinnedScene.wrapper.before(pinnedScene.frame); pinnedScene.wrapper.remove();
          pinnedScene.sentinel.remove(); pinnedScene = null;
        }
        if (host.ideaPopController === api) delete host.ideaPopController;
        if (global.ideaPopPreview === api) delete global.ideaPopPreview;
        doc.documentElement.style.removeProperty('--painted-reveal'); doc.documentElement.style.removeProperty('--mission-reveal');
      }
    };
    on(win, 'scroll', request, { passive: true });
    on(win, 'wheel', stop, { passive: true }); on(win, 'touchstart', stop, { passive: true });
    on(win, 'keydown', event => { if (/^(ArrowDown|ArrowUp|PageDown|PageUp|Home|End| )$/.test(event.key)) stop(); });
    on(win, 'resize', remeasure, { passive: true }); on(win, 'load', remeasure);
    on(doc, 'visibilitychange', () => { if (doc.hidden) { stop(); win.cancelAnimationFrame(raf); raf = 0; } else { lastTime = 0; request(); } });
    on(motionPreference, 'change', () => { reduced = motionPreference.matches; if (reduced) stop(); remeasure(); });
    const observer = new ResizeObserver(remeasure); observer.observe(doc.body);
    doc.fonts?.ready.then(() => { if (!destroyed) remeasure(); });
    host.ideaPopController = api; host.dataset.ready = '';
    global.ideaPopPreview = api;
    Promise.resolve(wing?.ready).catch(() => {}).finally(request);
    return api;
  }
  global.IdeaPopMotion = { mount };
})(typeof globalThis === 'object' ? globalThis : this);

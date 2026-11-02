"use client";

/* eslint-disable @next/next/no-img-element -- full-canvas artwork layers inside one camera-transformed world; their
   native 1670×942 placement is the point, so next/image's resizing does not apply */
import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

/* The accepted IDEA POP hero animation, reproduced from the designer's reference runtime (IDEA_POP_Engineering_Handoff,
   "approved shared camera distance revision 17", 2026-10-06): a 650ms hold on nature at normal viewport cover, then
   one 3.96s camera pull-back in which the near classroom plane and the far landscape share the same camera distance
   and quintic easing (their depths make the parallax), then the subjects fade in (deer → sketching boy → middle group →
   girl → bird → question → papers and graphite marks), 23.45s in all, played once. Every artwork layer is a full
   1670×942 canvas at (0,0) inside one `world`; the landscape is susan's Nature_Damavand_Hero_Safe_v5 (2065×1616,
   reference region at 320,256), drawn in the fixed aperture and behind the room with one far-plane projection.
   2026-10-13: the landscape is now the high-resolution Nature_Damavand_Photoreal_Wide (3323×2616 pixels, drawn at
   2705×2128 logical units) with its Camera_Framing.js registration: far base scale 0.61, a far-plane start solved so
   the classroom opening never shows an edge, and one fixed photo registration point (1241, 650) so Damavand ends up centred in the
   opening and the landscape moves only with the camera. Site tweaks kept from susan: smaller, lower question
   paper; bird and papers lower; the wall copy fades in with the girl; lossless people. */

const W = 1670;
const H = 942;
const HOLD_MS = 650;
const DURATION_MS = 22800;
const CAMERA_MS = 3960;
const AIM = { x: 1227, y: 496 };
// bump when the designer delivers corrected artwork, so no browser keeps an older cached copy
const REV = "hero-2026-10-14f";
const src = (name: string) => `/landing/hero-final/${name}.webp?v=${REV}`;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

// The landscape texture in logical drawing units (its PNG is 3323×2616; the extra pixels are detail, not geometry).
// One continuous move (susan, 2026-10-14): the opening frame is the whole nature view (the photo centred on its middle,
// at plain viewport cover), and the photo's registration point travels to the approved final framing (Damavand, sky and
// waterfall in the window) on the SAME eased progress as the camera, so the landscape never moves on its own schedule:
// no late slide, and no zoomed-in mountain step before the move.
const PHOTO = { w: 2705, h: 2128, startX: 1352.5, startY: 1064, endX: 1241, endY: 650 };
const photoCentreAt = (e: number) => ({
  x: PHOTO.startX + (PHOTO.endX - PHOTO.startX) * e,
  y: PHOTO.startY + (PHOTO.endY - PHOTO.startY) * e,
});
// The first frame's photo scale: plain cover of the hero box around the photo centre (hero.css draws the loading poster
// with the same formula, so the poster and the camera's first frame are identical).
const coverScale = (vw: number, vh: number) =>
  Math.max(vw / (2 * Math.min(PHOTO.startX, PHOTO.w - PHOTO.startX)), vh / (2 * Math.min(PHOTO.startY, PHOTO.h - PHOTO.startY)));

// The smallest far-plane start that keeps the photo 2px beyond the visible classroom opening for the whole pull-back
// (Camera_Framing.js chooseNatureStart): sampled progress plus the exact viewport crossings, then bisection.
const solveFarStart = (vw: number, vh: number, s: number, photoScale: number, nearStart: number, travel: number, dx: number, dy: number) => {
  const samples: number[] = [];
  for (let i = 0; i <= 1000; i++) samples.push(i / 1000);
  for (const [edge, half, d] of [
    [-447, -vw / 2, dx],
    [443, vw / 2, dx],
    [-386, -vh / 2, dy],
    [345, vh / 2, dy],
  ]) {
    const at = (nearStart * edge * s - half) / (half * (nearStart - 1) - nearStart * d);
    if (Number.isFinite(at) && at >= 0 && at <= 1) samples.push(at);
  }
  const covers = (fs: number) => {
    const depth = (fs * travel) / (fs - 1);
    for (const e of samples) {
      const nz = 1 / (1 / nearStart + travel * e);
      const fz = depth / (depth - travel + travel * e);
      const near = s * nz;
      const far = photoScale * s * fz;
      const nx = vw / 2 + dx * e * nz;
      const ny = vh / 2 + dy * e * nz;
      const fx = vw / 2 + dx * e * fz;
      const fy = vh / 2 + dy * e * fz;
      const c = photoCentreAt(e);
      const left = Math.max(0, nx - 447 * near);
      const top = Math.max(0, ny - 386 * near);
      const right = Math.min(vw, nx + 443 * near);
      const bottom = Math.min(vh, ny + 345 * near);
      if (right <= left || bottom <= top) continue;
      if (
        fx - c.x * far > left - 2 + 1e-7 ||
        fy - c.y * far > top - 2 + 1e-7 ||
        fx + (PHOTO.w - c.x) * far < right + 2 - 1e-7 ||
        fy + (PHOTO.h - c.y) * far < bottom + 2 - 1e-7
      )
        return false;
    }
    return true;
  };
  const cover = coverScale(vw, vh);
  let low = cover / (photoScale * s);
  // plain cover already keeps the opening covered: start exactly there, so nothing jumps from the loading poster
  if (covers(low * 1.0005)) return low * 1.0005;
  let high = nearStart;
  if (low >= high || !covers(high)) return Math.max(low, high) * 1.0005;
  for (let i = 0; i < 36; i++) {
    const mid = (low + high) / 2;
    if (covers(mid)) high = mid;
    else low = mid;
  }
  return Math.min(nearStart, high * 1.0005);
};

// Timed opacity fades, in ms after the hold (spec section 5).
const FADES: ReadonlyArray<readonly [id: string, start: number, end: number]> = [
  ["deer", 4136, 6336],
  ["boy", 5280, 7480],
  ["kids", 6424, 8800],
  ["girl", 9000, 11200],
  ["question", 14000, 15800],
  ["paper1", 16200, 18100],
  ["marks1", 17100, 19200],
  ["paper2", 18300, 20200],
  ["marks2", 18900, 21100],
  ["paper3", 20400, 22300],
  ["marks3", 20400, 22800],
];

// Phones (susan, 2026-10-20): a simpler portrait hero of its own, not the desktop scene shrunk. It keeps the landscape,
// the window and the room around it, the main girl and the flying bird; the sketching boy, the group of kids and the deer
// are never loaded, and the papers, graphite marks and question card stay off to keep it calm. The view is an 800-wide
// slice of the artwork around the window, its bottom on the table; the girl is moved into that slice (lower left).
// The entrance is short: close on the mountain, pull back to the window, then the girl, then the bird.
const MOBILE_QUERY = "(max-width: 767px)";
const MOBILE = {
  skip: new Set(["deer", "boy", "kids", "paper1", "paper2", "paper3", "marks1", "marks2", "marks3", "question"]),
  centreX: 1030,
  width: 800,
  bottom: 935,
  girl: "translate(400px, 30px)",
  // the flying bird's resting place in the hero box: fractions of its width and height, and its width as a share of the box
  bird: { x: 0.66, y: 0.36, w: 0.42 },
};
type Timing = {
  hold: number;
  duration: number;
  camera: number;
  fades: ReadonlyArray<readonly [string, number, number]>;
  bird: readonly [number, number];
  depth: readonly [number, number];
};
const DESKTOP_TIMING: Timing = { hold: HOLD_MS, duration: DURATION_MS, camera: CAMERA_MS, fades: FADES, bird: [11400, 13400], depth: [11200, 13400] };
const MOBILE_TIMING: Timing = { hold: 400, duration: 4000, camera: 2400, fades: [["girl", 2000, 3000]], bird: [2800, 3800], depth: [3000, 4000] };

// Depth (susan, 2026-11-02): once everything has loaded, a white veil fades in over all the layers behind the girl
// (FAR_WHITE, her picture C). The girl, papers, marks and question card sit above it, and so do the text and the flying
// bird, untouched. Her left-side and front groups (LEFT_WHITE, her picture A) are second copies of the same layers above
// the veil, masked to their part of the artwork in hero.css. The group is one flat picture, see-through by exactly the amount that
// leaves LEFT_WHITE of white; over its own originals it looks identical until the veil arrives, so only the veil animates.
const FAR_WHITE = 0.38;
const LEFT_WHITE = 0.18;
const MID_COPIES: ReadonlyArray<{ file: string; className: string }> = [
  { file: "classroom-plants", className: "hero-mid-left" },
  { file: "classroom-props", className: "hero-mid-left" },
  { file: "foreground-table", className: "hero-mid-front" },
];

// Back to front (spec section 3). `fade` layers start hidden; the rest arrive with the camera.
const LAYERS: ReadonlyArray<{ id: string; file: string; z: number; fade?: boolean; className?: string }> = [
  { id: "classroom", file: "classroom-structure", z: 2 },
  { id: "plants", file: "classroom-plants", z: 3 },
  { id: "props", file: "classroom-props", z: 3 },
  { id: "tree", file: "tree-canopy", z: 3 },
  { id: "bushes", file: "foreground-bushes", z: 4 },
  { id: "deer", file: "deer", z: 4, fade: true },
  { id: "boy", file: "sketching-boy", z: 4, fade: true },
  { id: "kids", file: "kids-group", z: 4, fade: true },
  { id: "table", file: "foreground-table", z: 5 },
  { id: "girl", file: "main-girl", z: 6, fade: true },
  { id: "paper1", file: "observation-paper-01", z: 7, fade: true, className: "hero-sky-art" },
  { id: "paper2", file: "observation-paper-02", z: 7, fade: true, className: "hero-sky-art" },
  { id: "paper3", file: "observation-paper-03", z: 7, fade: true, className: "hero-sky-art" },
  { id: "marks1", file: "motion-sketch-01", z: 9, fade: true, className: "hero-sky-art" },
  { id: "marks2", file: "motion-sketch-02", z: 9, fade: true, className: "hero-sky-art" },
  { id: "marks3", file: "motion-sketch-03", z: 9, fade: true, className: "hero-sky-art" },
  { id: "question", file: "question-text", z: 10, fade: true, className: "hero-question" },
];

export default function HeroScene() {
  // Chosen once on arrival (a rotated phone keeps its composition; the layout still follows the box).
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => setMobile(window.matchMedia(MOBILE_QUERY).matches), []);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const sceneryRef = useRef<HTMLImageElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const natureRef = useRef<HTMLImageElement>(null);
  const layerRefs = useRef<Record<string, HTMLImageElement | null>>({});
  const [state, setState] = useState<"preparing" | "ready" | "fallback">("preparing");
  // The landscape is the first thing on screen: fetch it first, and show it as a still poster while the rest loads.
  preload(src("nature-damavand"), { as: "image", fetchPriority: "high" });

  useEffect(() => {
    if (mobile === null) return;
    const T = mobile ? MOBILE_TIMING : DESKTOP_TIMING;
    const viewport = viewportRef.current;
    const world = worldRef.current;
    const scenery = sceneryRef.current;
    const floor = floorRef.current;
    const nature = natureRef.current;
    if (!viewport || !world || !scenery || !floor || !nature) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    // On wide screens the hero copy sits on the wall and fades in with the girl; narrower, it is above the picture.
    const copy = document.querySelector<HTMLElement>("[data-hero-copy]");
    const wide = window.matchMedia("(min-width: 1280px)");
    const showCopy = (opacity: number) => {
      if (!copy) return;
      copy.style.opacity = String(opacity);
      copy.style.visibility = opacity === 0 ? "hidden" : "visible";
    };
    // Wide screens: the nav bar and Sign up button come in once the camera has settled (susan, 2026-10-07).
    const nav = document.querySelector<HTMLElement>('[data-testid="marketing-nav"]');
    const showNav = (opacity: number) => {
      if (!nav) return;
      const o = String(opacity);
      if (nav.style.opacity !== o) nav.style.opacity = o;
      const v = opacity === 0 ? "hidden" : "visible";
      if (nav.style.visibility !== v) nav.style.visibility = v;
    };

    let clock = 0; // accumulated playback time after readiness, ms
    let last: number | null = null;
    let playing = true;
    let ready = false;
    let frame = 0;
    let cancelled = false;
    let lastQ: number | null = null;
    type Layout = {
      vw: number;
      vh: number;
      s: number;
      hx: number;
      hy: number;
      photoScale: number;
      nearStart: number;
      travel: number;
      farDepth: number;
    };
    let L: Layout | null = null;

    // Only write a style when it changes.
    const set = (el: HTMLElement, key: "transform" | "opacity" | "visibility" | "height", value: string) => {
      if (el.style[key] !== value) el.style[key] = value;
    };

    // Layout and camera constants for the hero box (spec section 4), recomputed only when the box resizes.
    const layout = () => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      if (!vw || !vh) return false;
      const narrow = vw / vh < W / H;
      const s = mobile ? vw / MOBILE.width : narrow ? vw / W : Math.min(vw / W, vh / H);
      const hx = mobile ? vw / 2 - MOBILE.centreX * s : (vw - W * s) / 2;
      const hy = mobile ? vh - MOBILE.bottom * s : narrow ? 0 : (vh - H * s) / 2;
      const photoScale = 0.61 + 2 / (PHOTO.h * s);
      const nearStart = Math.max(4, (2 * vw) / (886 * s), (2 * vh) / (690 * s));
      const travel = 1 - 1 / nearStart;
      const farStart = solveFarStart(vw, vh, s, photoScale, nearStart, travel, hx + AIM.x * s - vw / 2, hy + AIM.y * s - vh / 2);
      const farDepth = (farStart * travel) / (farStart - 1);
      L = { vw, vh, s, hx, hy, photoScale, nearStart, travel, farDepth };
      // The flying bird (FlyingBird.tsx) starts in the hero: it reads the finished artwork rectangle from here.
      viewport.dataset.artHx = String(hx);
      viewport.dataset.artHy = String(hy);
      viewport.dataset.artS = String(s);
      if (mobile) {
        viewport.dataset.birdX = String(vw * MOBILE.bird.x);
        viewport.dataset.birdY = String(Math.max(170, vh * MOBILE.bird.y));
        viewport.dataset.birdS = String((vw * MOBILE.bird.w) / 1659);
      }
      // the loading poster shows exactly the camera's first frame of the photo
      viewport.style.setProperty("--poster-k", `${photoScale * s * farStart}px`);
      viewport.dataset.poster = "";
      set(floor, "height", `${narrow && !mobile ? Math.max(103, vh / s - 839) : 103}px`);
      lastQ = null;
      return true;
    };

    // Draws every layer from one logical time t (ms after the hold).
    const draw = () => {
      if (!L) return;
      const t = Math.max(0, Math.min(clock - T.hold, T.duration));
      const q = clamp01(t / T.camera);
      if (q !== lastQ) {
        // One camera (spec section 5): the near classroom and the far landscape share its distance and easing.
        const e = ease(q);
        const cameraTravel = L.travel * e;
        const nearZoom = 1 / (1 / L.nearStart + cameraTravel);
        const farZoom = L.farDepth / (L.farDepth - L.travel + cameraTravel);
        const dx = L.hx + AIM.x * L.s - L.vw / 2;
        const dy = L.hy + AIM.y * L.s - L.vh / 2;
        const cx = L.vw / 2 + dx * e * nearZoom;
        const cy = L.vh / 2 + dy * e * nearZoom;
        const photoCx = L.vw / 2 + dx * e * farZoom;
        const photoCy = L.vh / 2 + dy * e * farZoom;
        const nearScale = L.s * nearZoom;
        set(world, "transform", `translate3d(${cx - AIM.x * nearScale}px, ${cy - AIM.y * nearScale}px, 0) scale(${nearScale})`);
        // The far plane: one landscape texture, drawn both inside the aperture and behind the room with the same
        // projection and the same (late-panning) photo centre, so the scenery around the opening matches.
        const centre = photoCentreAt(e);
        const textureScale = (L.photoScale * L.s * farZoom) / nearScale;
        const textureLeft = AIM.x + (photoCx - cx) / nearScale - centre.x * textureScale;
        const textureTop = AIM.y + (photoCy - cy) / nearScale - centre.y * textureScale;
        set(scenery, "transform", `translate3d(${textureLeft - 780}px, ${textureTop - 110}px, 0) scale(${textureScale})`);
        set(nature, "transform", `translate3d(${textureLeft}px, ${textureTop}px, 0) scale(${textureScale})`);
        lastQ = q;
      }
      for (const [id, start, end] of T.fades) {
        const el = layerRefs.current[id];
        if (!el) continue;
        const opacity = ease(clamp01((t - start) / (end - start)));
        set(el, "opacity", String(opacity));
        set(el, "visibility", opacity === 0 ? "hidden" : "visible");
      }
      if (veilRef.current) {
        const back = ease(clamp01((t - T.depth[0]) / (T.depth[1] - T.depth[0])));
        set(veilRef.current, "opacity", (FAR_WHITE * back).toFixed(4));
      }
      showCopy(wide.matches ? ease(clamp01((t - 9000) / 2200)) : 1);
      showNav(wide.matches ? ease(clamp01((t - T.camera) / 600)) : 1);
      // The bird is no longer a hero layer: the one flying rig (FlyingBird.tsx) appears on the old bird schedule.
      viewport.dataset.birdIn = ease(clamp01((t - T.bird[0]) / (T.bird[1] - T.bird[0]))).toFixed(4);
    };

    const finish = () => {
      clock = T.hold + T.duration;
      playing = false;
      draw();
    };

    // One requestAnimationFrame clock that adds the real time between frames; it pauses while the page is hidden.
    const schedule = () => {
      if (ready && playing && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      last = null;
    };
    const tick = (now: number) => {
      frame = 0;
      if (!ready || !playing || document.hidden) {
        last = null;
        return;
      }
      if (last !== null) {
        clock += now - last;
        if (clock >= T.hold + T.duration) {
          clock = T.hold + T.duration;
          playing = false;
        }
      }
      last = now;
      draw();
      if (playing) schedule();
      else last = null;
    };

    // Resizing or rotating keeps the current time, recomputes the layout and redraws; it never restarts the entrance.
    const resize = new ResizeObserver(() => {
      last = null;
      if (layout()) draw();
    });
    resize.observe(viewport);
    const onVisibility = () => {
      stop();
      schedule();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onReducedChange = (ev: MediaQueryListEvent) => {
      if (ev.matches && ready) {
        stop();
        finish();
      }
    };
    reduced.addEventListener("change", onReducedChange);

    // Load every layer, then decode it; a decode that never settles gives up after 1.2s (the loaded image is valid).
    const prepare = (img: HTMLImageElement) =>
      (img.complete
        ? img.naturalWidth
          ? Promise.resolve()
          : Promise.reject(new Error(`Image failed: ${img.src}`))
        : new Promise<void>((resolve, reject) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", reject, { once: true });
          })
      ).then(
        () =>
          new Promise<void>((resolve) => {
            const deadline = setTimeout(resolve, 1200);
            const done = () => {
              clearTimeout(deadline);
              resolve();
            };
            img.decode().then(done, done);
          }),
      );
    layout();
    Promise.all([...world.querySelectorAll("img")].map(prepare))
      .then(() => {
        if (cancelled) return;
        ready = true;
        setState("ready");
        layout();
        if (reduced.matches) finish();
        else {
          draw();
          schedule();
        }
      })
      .catch(() => {
        // An essential layer failed: show the completed Master Hero instead; the copy stays usable.
        if (cancelled) return;
        setState("fallback");
        viewport.dataset.birdIn = "1";
        showCopy(1);
        showNav(1);
      });

    return () => {
      cancelled = true;
      stop();
      showNav(1);
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onReducedChange);
    };
  }, [mobile]);

  const layers = mobile === null ? [] : LAYERS.filter((l) => !(mobile && MOBILE.skip.has(l.id)));
  // fetch every layer of this composition up front (with the landscape), so the scene can decode and appear together
  for (const l of layers) preload(src(l.file), { as: "image" });
  return (
    <div ref={viewportRef} aria-hidden="true" className="hero-viewport" data-state={state}>
      {/* the opening frame (the reference photo region at normal centred cover) until every layer is ready */}
      <div className="hero-poster" style={{ backgroundImage: `url(${src("nature-damavand")})` }} />
      <div ref={worldRef} className="hero-world">
        <img ref={natureRef} className="hero-nature" style={{ zIndex: 0 }} src={src("nature-damavand")} alt="" />
        {/* the fixed rear-opening aperture; the far-plane photograph moves inside it */}
        <div className="hero-scenery">
          <img ref={sceneryRef} className="hero-scenery-image" src={src("nature-damavand")} alt="" />
        </div>
        {layers.slice(0, 1).map((l) => (
          <img key={l.id} className="hero-layer" style={{ zIndex: l.z }} src={src(l.file)} alt="" />
        ))}
        <div ref={floorRef} className="hero-floor" style={{ backgroundImage: `linear-gradient(165deg, #ead9bc44, #ad956666), url(/landing/hero-final/floor-texture.png?v=${REV})` }} />
        {layers.slice(1).map((l) => (
          <img
            key={l.id}
            ref={(el) => {
              layerRefs.current[l.id] = el;
            }}
            className={`hero-layer ${l.className ?? ""}`}
            style={{
              zIndex: l.z,
              ...(l.fade ? { opacity: 0, visibility: "hidden" } : null),
              ...(mobile && l.id === "girl" ? { transform: MOBILE.girl } : null),
            }}
            src={src(l.file)}
            alt=""
          />
        ))}
        {mobile !== null && (
          <>
            <div ref={veilRef} className="hero-veil" style={{ zIndex: 5, opacity: 0 }} />
            <div className="hero-mid" style={{ zIndex: 5, opacity: 1 - LEFT_WHITE / FAR_WHITE }}>
              {MID_COPIES.map((m) => (
                <img key={m.file} className={`hero-layer ${m.className}`} src={src(m.file)} alt="" />
              ))}
            </div>
          </>
        )}
      </div>
      {/* the finished hero; on phones the landscape alone, since the master artwork has the boy, the kids and the deer */}
      {state === "fallback" && <img className="hero-fallback" src={src(mobile ? "nature-damavand" : "master-hero")} alt="" />}
    </div>
  );
}

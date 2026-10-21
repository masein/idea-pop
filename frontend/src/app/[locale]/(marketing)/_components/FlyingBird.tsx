"use client";

/* eslint-disable @next/next/no-img-element -- the four registered 1659×1348 bird parts share one origin; the wing
   renderer textures them straight from these elements */
import { useEffect, useRef } from "react";

/* The one flying bird of the landing page. Since 2026-10-21 its motion is susan's complete bird animation package
   ("idea-pop-complete-animation", public/ideapop-motion): wing-flight.js (the articulated wings, unchanged),
   motion-core.js (route, timing and paper-handoff math) and motion.js (the page controller). The controller measures
   this page itself: the hero artwork ([data-art-*], or the phone hero's [data-bird-*]), the girl's painting
   ([data-bird-canvas], --painted-reveal), and the boy's paper ([data-bird-mission], --mission-reveal), which it holds
   briefly on screen while the bird shrinks and dissolves into the drawing. This component only renders the bird rig,
   loads the three scripts in order and mounts / destroys the controller. */

const BASE = "/ideapop-motion/";
const BIRD = "/landing/bird/";
const REV = "motion-2026-10-21";
const SCRIPTS = ["wing-flight.js", "motion-core.js", "motion.js"];

type Controller = { destroy: () => void };
declare global {
  interface Window {
    IdeaPopMotion?: { mount: (host: HTMLElement) => Controller };
  }
}

// Each script once per page load, in order (motion.js needs motion-core.js; wing-flight.js must exist at mount).
const loaded = new Map<string, Promise<void>>();
function loadScript(name: string) {
  let p = loaded.get(name);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `${BASE}${name}?v=${REV}`;
      s.async = false;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`${name} did not load`));
      document.head.appendChild(s);
    });
    loaded.set(name, p);
  }
  return p;
}

export default function FlyingBird() {
  const birdRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bird = birdRef.current;
    if (!bird) return;
    let controller: Controller | null = null;
    let cancelled = false;
    // without the wing renderer the controller still flies the bird, unflapped
    SCRIPTS.reduce(
      (chain, name) => chain.then(() => (name === "wing-flight.js" ? loadScript(name).catch(() => {}) : loadScript(name))),
      Promise.resolve(),
    )
      .then(() => {
        if (!cancelled && window.IdeaPopMotion) controller = window.IdeaPopMotion.mount(bird);
      })
      .catch(() => {
        // without the controller the bird simply stays hidden; the page works as before
      });
    return () => {
      cancelled = true;
      controller?.destroy();
    };
  }, []);

  const part = (cls: string, file: string) => (
    <img className={`part ${cls}`} src={`${BIRD}${file}.webp?v=bird-2026-10-15c`} width={1659} height={1348} alt="" />
  );
  return (
    <div ref={birdRef} className="flying-bird" aria-hidden="true">
      {part("far-wing", "bird-wing-far")}
      {part("tail", "bird-tail")}
      {part("body", "bird-body")}
      {part("near-wing", "bird-wing-near")}
    </div>
  );
}

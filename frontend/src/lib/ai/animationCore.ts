/**
 * Pure state logic for the on-device Animation Studio (no canvas, camera, or
 * GIF-encoder imports — unit-testable in a plain Node environment).
 *
 * The studio UI lives in `components/ai/AnimationStudio.tsx`; everything here
 * is plain data: the ordered list of frames and the timing maths that turns a
 * frames-per-second choice into playback / GIF delays.
 */

export const MIN_FRAMES = 2; // minimum to look like motion
export const FPS_MIN = 2;
export const FPS_MAX = 15;
export const FPS_DEFAULT = 6;

/** Canvas size every frame is normalised to (kept modest so GIFs stay small). */
export const FRAME_WIDTH = 480;
export const FRAME_HEIGHT = 360;

export interface Frame {
  /** Stable id for reorder/delete (never shown to kids). */
  id: string;
  /** PNG data-URL snapshot of the frame at FRAME_WIDTH×FRAME_HEIGHT. */
  dataUrl: string;
}

let nextId = 0;
/** Test-only hook so ids are deterministic per test run. */
export function resetIdsForTest() {
  nextId = 0;
}

function newId(): string {
  nextId += 1;
  return `frame-${nextId}`;
}

/** Append a captured frame to the end of the strip. */
export function addFrame(frames: Frame[], dataUrl: string): Frame[] {
  return [...frames, { id: newId(), dataUrl }];
}

/** Delete a frame by id (no-op for an unknown id). */
export function removeFrame(frames: Frame[], id: string): Frame[] {
  return frames.filter((f) => f.id !== id);
}

/**
 * Move a frame one slot earlier (-1) or later (+1) in the strip.
 * No-op (same reference) at the ends or for an unknown id.
 */
export function moveFrame(frames: Frame[], id: string, direction: -1 | 1): Frame[] {
  const from = frames.findIndex((f) => f.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= frames.length) return frames;
  const next = [...frames];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** The strip plays once there are at least MIN_FRAMES frames. */
export function readyToPlay(frames: Frame[]): boolean {
  return frames.length >= MIN_FRAMES;
}

/** Clamp any slider/keyboard value into the supported fps range. */
export function clampFps(fps: number): number {
  return Math.min(FPS_MAX, Math.max(FPS_MIN, Math.round(fps)));
}

/** Per-frame duration for playback timers, in milliseconds. */
export function frameDurationMs(fps: number): number {
  return Math.round(1000 / clampFps(fps));
}

/** Per-frame delay for the GIF encoder (GIF89a counts in centiseconds→ms). */
export function gifDelayMs(fps: number): number {
  // GIF delays are stored in 1/100s units; keep the value a multiple of 10ms
  // so every browser honours it instead of clamping oddly.
  return Math.round(100 / clampFps(fps)) * 10;
}

/** The frame index that follows `index`, wrapping for looped playback. */
export function nextFrameIndex(index: number, frameCount: number): number {
  if (frameCount <= 0) return 0;
  return (index + 1) % frameCount;
}

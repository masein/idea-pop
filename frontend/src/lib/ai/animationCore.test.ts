import { describe, it, expect, beforeEach } from 'vitest';
import {
  addFrame,
  clampFps,
  FPS_DEFAULT,
  FPS_MAX,
  FPS_MIN,
  frameDurationMs,
  gifDelayMs,
  MIN_FRAMES,
  moveFrame,
  nextFrameIndex,
  readyToPlay,
  removeFrame,
  resetIdsForTest,
  type Frame,
} from './animationCore';

beforeEach(() => resetIdsForTest());

function strip(n: number): Frame[] {
  let frames: Frame[] = [];
  for (let i = 0; i < n; i++) frames = addFrame(frames, `data:${i}`);
  return frames;
}

describe('frame strip', () => {
  it('appends frames in order with unique ids', () => {
    const frames = strip(3);
    expect(frames.map((f) => f.dataUrl)).toEqual(['data:0', 'data:1', 'data:2']);
    expect(new Set(frames.map((f) => f.id)).size).toBe(3);
  });

  it('deletes a frame by id and ignores unknown ids', () => {
    const frames = strip(3);
    const without = removeFrame(frames, frames[1].id);
    expect(without.map((f) => f.dataUrl)).toEqual(['data:0', 'data:2']);
    expect(removeFrame(frames, 'nope')).toHaveLength(3);
  });

  it('moves a frame left/right and no-ops at the edges', () => {
    const frames = strip(3);
    const later = moveFrame(frames, frames[0].id, 1);
    expect(later.map((f) => f.dataUrl)).toEqual(['data:1', 'data:0', 'data:2']);
    const earlier = moveFrame(later, later[1].id, -1);
    expect(earlier.map((f) => f.dataUrl)).toEqual(['data:0', 'data:1', 'data:2']);
    // edges + unknown id are true no-ops (same reference)
    expect(moveFrame(frames, frames[0].id, -1)).toBe(frames);
    expect(moveFrame(frames, frames[2].id, 1)).toBe(frames);
    expect(moveFrame(frames, 'nope', 1)).toBe(frames);
  });

  it('is ready to play from MIN_FRAMES onward', () => {
    expect(readyToPlay(strip(MIN_FRAMES - 1))).toBe(false);
    expect(readyToPlay(strip(MIN_FRAMES))).toBe(true);
  });
});

describe('timing', () => {
  it('clamps fps into the supported range', () => {
    expect(clampFps(0)).toBe(FPS_MIN);
    expect(clampFps(99)).toBe(FPS_MAX);
    expect(clampFps(FPS_DEFAULT)).toBe(FPS_DEFAULT);
    expect(clampFps(7.6)).toBe(8); // rounds slider float values
  });

  it('converts fps to a per-frame playback duration', () => {
    expect(frameDurationMs(10)).toBe(100);
    expect(frameDurationMs(2)).toBe(500);
    expect(frameDurationMs(999)).toBe(Math.round(1000 / FPS_MAX)); // clamped
  });

  it('converts fps to a browser-safe GIF delay (multiple of 10ms)', () => {
    expect(gifDelayMs(10)).toBe(100);
    expect(gifDelayMs(6)).toBe(170); // round(100/6)=17cs → 170ms
    expect(gifDelayMs(2)).toBe(500);
    expect(gifDelayMs(15) % 10).toBe(0);
  });

  it('wraps the frame index for looped playback', () => {
    expect(nextFrameIndex(0, 3)).toBe(1);
    expect(nextFrameIndex(2, 3)).toBe(0);
    expect(nextFrameIndex(5, 0)).toBe(0); // empty strip stays put
  });
});

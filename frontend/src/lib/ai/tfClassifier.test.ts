import { describe, it, expect, vi, beforeEach } from 'vitest';

// Spies for the underlying TF.js resources the engine creates.
const baseDispose = vi.fn();
const extractorDispose = vi.fn();
const knnDispose = vi.fn();
// The real bug: MobileNet layers are shared between `base` and `extractor`,
// so freeing them twice throws "Layer 'conv1' is already disposed." Model
// this by having base.dispose() throw if it's already been disposed.
let baseDisposed = false;

vi.mock('@tensorflow/tfjs', () => {
  const base = {
    inputs: ['input'],
    getLayer: () => ({ output: 'bottleneck' }),
    dispose: () => {
      if (baseDisposed) throw new Error("Layer 'conv1' is already disposed.");
      baseDisposed = true;
      baseDispose();
    },
  };
  const extractor = {
    predict: () => ({ flatten: () => ({ dispose: vi.fn() }) }),
    dispose: extractorDispose,
  };
  return {
    ready: vi.fn().mockResolvedValue(undefined),
    loadLayersModel: vi.fn().mockResolvedValue(base),
    model: vi.fn().mockReturnValue(extractor),
    tidy: (fn: () => unknown) => fn(),
    browser: { fromPixels: vi.fn() },
  };
});

vi.mock('@tensorflow-models/knn-classifier', () => ({
  create: () => ({
    addExample: vi.fn(),
    predictClass: vi.fn(),
    getNumClasses: () => 0,
    clearAllClasses: vi.fn(),
    dispose: knnDispose,
  }),
}));

import { loadEngine } from './tfClassifier';

describe('tfClassifier engine disposal', () => {
  beforeEach(() => {
    baseDisposed = false;
    baseDispose.mockClear();
    extractorDispose.mockClear();
    knnDispose.mockClear();
  });

  it('disposes each created resource at most once and never double-frees the model', async () => {
    const engine = await loadEngine();

    // Two dispose() calls model accordion-collapse THEN step-unmount.
    expect(() => {
      engine.dispose();
      engine.dispose();
    }).not.toThrow();

    // KNN + base each freed exactly once…
    expect(knnDispose).toHaveBeenCalledTimes(1);
    expect(baseDispose).toHaveBeenCalledTimes(1);
    // …and `extractor` is NEVER disposed: it re-uses base's layers, so
    // disposing it would free the shared layers a second time.
    expect(extractorDispose).not.toHaveBeenCalled();
  });

  it('is idempotent: a second dispose() is a no-op, not a re-free', async () => {
    const engine = await loadEngine();
    engine.dispose();
    baseDispose.mockClear();
    knnDispose.mockClear();

    engine.dispose();

    expect(baseDispose).not.toHaveBeenCalled();
    expect(knnDispose).not.toHaveBeenCalled();
  });

  it('swallows an already-disposed model error as a backstop', async () => {
    const engine = await loadEngine();
    // Pretend the model was freed elsewhere (the exact live crash condition).
    baseDisposed = true;

    expect(() => engine.dispose()).not.toThrow();
    // KNN still gets cleaned up despite the model throwing.
    expect(knnDispose).toHaveBeenCalledTimes(1);
  });
});

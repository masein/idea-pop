/**
 * On-device image classifier: MobileNet feature extractor + KNN, via
 * TensorFlow.js transfer learning.
 *
 * PRIVACY (COPPA): everything runs in the browser AND the model itself is
 * SELF-HOSTED under /public/models — powering up the trainer makes zero
 * third-party requests. (The previous tfhub/kaggle-hosted weights hung on
 * school/filtered networks and broke the trainer entirely.)
 *
 * The extractor is the classic Teachable-Machine recipe: the vendored
 * MobileNet v1 (α=0.25, 224px) layers model truncated at its
 * `conv_pw_13_relu` bottleneck; the KNN classifies those embeddings.
 *
 * TF packages load via dynamic import() inside loadEngine(), so nothing
 * ships in the main/SSR bundle until a kid actually powers up the trainer.
 */

export type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

/** Same-origin — served from our own /public, never a third party. */
const MODEL_URL = "/models/mobilenet-v1-025/model.json";
const EMBEDDING_LAYER = "conv_pw_13_relu";
const INPUT_SIZE = 224;

export interface Prediction {
  /** The winning class id (matches ClassInfo.id). */
  classId: string;
  /** 0–1 confidence per class id. */
  confidences: Record<string, number>;
}

export interface ClassifierEngine {
  /** Learn one example image for a class. */
  addExample(source: ImageSource, classId: string): void;
  /** Guess which class an image belongs to (null until examples exist). */
  predict(source: ImageSource): Promise<Prediction | null>;
  /** Forget everything the machine learned. */
  clearAll(): void;
  dispose(): void;
}

export async function loadEngine(): Promise<ClassifierEngine> {
  const [tf, knnModule] = await Promise.all([
    import("@tensorflow/tfjs"),
    import("@tensorflow-models/knn-classifier"),
  ]);

  await tf.ready();
  const base = await tf.loadLayersModel(MODEL_URL);
  // Truncate at the bottleneck: activations there are compact, general
  // image features — ideal for a KNN over 2-3 kid-defined classes.
  const bottleneck = base.getLayer(EMBEDDING_LAYER);
  // `extractor` is a functional VIEW over `base`: it REUSES base's layer
  // instances (conv1 … conv_pw_13_relu), it does not copy them. So its
  // weights are owned by `base` and must be freed exactly once — see dispose().
  const extractor = tf.model({ inputs: base.inputs, outputs: bottleneck.output });
  const knn = knnModule.create();

  // Cleanup fires on BOTH accordion-collapse and step-unmount, so dispose must
  // be idempotent — otherwise the second call hits already-freed layers.
  let disposed = false;

  /** Image → normalized [-1, 1] tensor → flattened bottleneck embedding. */
  function embed(source: ImageSource) {
    return tf.tidy(() => {
      const pixels = tf.browser
        .fromPixels(source)
        .resizeBilinear([INPUT_SIZE, INPUT_SIZE])
        .toFloat()
        .div(127.5)
        .sub(1)
        .expandDims(0);
      const activation = extractor.predict(pixels) as import("@tensorflow/tfjs").Tensor;
      return activation.flatten();
    });
  }

  return {
    addExample(source, classId) {
      const activation = embed(source);
      knn.addExample(activation, classId);
      activation.dispose();
    },

    async predict(source) {
      if (knn.getNumClasses() === 0) return null;
      const activation = embed(source);
      try {
        const result = await knn.predictClass(activation, 5);
        return { classId: result.label, confidences: result.confidences };
      } finally {
        activation.dispose();
      }
    },

    clearAll() {
      knn.clearAllClasses();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      // Free the per-session KNN's own tensors.
      try {
        knn.dispose();
      } catch {
        /* already gone — ignore */
      }
      // Free the MobileNet ONCE via `base`, which owns every layer (including
      // the ones `extractor` re-uses). Disposing `extractor` too would free
      // those shared layers a second time → "Layer 'conv1' is already
      // disposed" and a white-screen. So we never dispose `extractor`.
      try {
        base.dispose();
      } catch {
        /* already gone — ignore */
      }
    },
  };
}

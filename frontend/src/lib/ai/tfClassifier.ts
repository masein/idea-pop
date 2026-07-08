/**
 * On-device image classifier: MobileNet feature extractor + KNN, via
 * TensorFlow.js transfer learning.
 *
 * PRIVACY (COPPA): everything runs in the browser. Images and webcam frames
 * are turned into feature tensors locally and NEVER leave the device — the
 * only network request is the one-time model weights download.
 *
 * All three TF packages are loaded with dynamic import() inside loadEngine(),
 * so they stay out of the main/SSR bundle and only download when a kid
 * actually powers up the trainer.
 */

export type ImageSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;

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
  const [tf, mobilenetModule, knnModule] = await Promise.all([
    import('@tensorflow/tfjs'),
    import('@tensorflow-models/mobilenet'),
    import('@tensorflow-models/knn-classifier'),
  ]);

  await tf.ready();
  // Small variant: fastest download for classroom devices; plenty for 2–3 classes.
  const net = await mobilenetModule.load({ version: 2, alpha: 0.5 });
  const knn = knnModule.create();

  return {
    addExample(source, classId) {
      const activation = net.infer(source, true);
      knn.addExample(activation, classId);
      activation.dispose();
    },

    async predict(source) {
      if (knn.getNumClasses() === 0) return null;
      const activation = net.infer(source, true);
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
      knn.dispose();
    },
  };
}

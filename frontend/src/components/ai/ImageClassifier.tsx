'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  accuracyPercent,
  addClass,
  addExamples,
  clearExamples,
  EMPTY_STATS,
  initialClasses,
  MAX_CLASSES,
  MIN_CLASSES,
  readyToPredict,
  recordTest,
  removeClass,
  renameClass,
  type ClassInfo,
  type TestStats,
} from '@/lib/ai/classifierCore';
import type { ClassifierEngine, Prediction } from '@/lib/ai/tfClassifier';

type EngineState = 'idle' | 'loading' | 'ready' | 'error';
type CameraState = 'off' | 'on' | 'error';

const CLASS_TINTS = ['bg-tint-lime', 'bg-tint-blue', 'bg-tint-blush'];

/** Decode an uploaded file into an image element (all in-memory, on-device). */
async function fileToImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = document.createElement('img');
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // decode() keeps the bitmap; the object URL can be released right away.
    URL.revokeObjectURL(url);
  }
}

/** Grab the current webcam frame onto a canvas (never leaves the browser). */
function snapshot(video: HTMLVideoElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 224;
  canvas.height = video.videoHeight || 224;
  canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

interface ImageClassifierProps {
  /** Hide the internal title/subtitle when the host page already renders one. */
  hideIntro?: boolean;
}

export default function ImageClassifier({ hideIntro = false }: ImageClassifierProps) {
  const t = useTranslations('classifier');

  const [engineState, setEngineState] = useState<EngineState>('idle');
  const engineRef = useRef<ClassifierEngine | null>(null);

  const [classes, setClasses] = useState<ClassInfo[]>(() => initialClasses('', ''));
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [awaitingTruth, setAwaitingTruth] = useState(false);
  const [stats, setStats] = useState<TestStats>(EMPTY_STATS);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const exampleInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const testInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraState('off');
  }, []);

  // Release hardware + model memory when the kid navigates away.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      engineRef.current?.dispose();
      engineRef.current = null;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function powerUp() {
    setEngineState('loading');
    try {
      const { loadEngine } = await import('@/lib/ai/tfClassifier');
      engineRef.current = await loadEngine();
      setEngineState('ready');
    } catch {
      setEngineState('error');
    }
  }

  async function toggleCamera() {
    if (cameraState === 'on') {
      stopCamera();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState('on');
      // The video element renders on the next tick.
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraState('error');
    }
  }

  function showPreview(source: HTMLCanvasElement | File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (source instanceof File) {
      setPreviewUrl(URL.createObjectURL(source));
    } else {
      setPreviewUrl(source.toDataURL('image/jpeg', 0.8));
    }
  }

  async function trainWithFiles(classId: string, files: FileList | null) {
    const engine = engineRef.current;
    if (!engine || !files?.length) return;
    setWorking(true);
    try {
      let added = 0;
      for (const file of Array.from(files)) {
        try {
          const img = await fileToImage(file);
          engine.addExample(img, classId);
          added += 1;
        } catch {
          // skip unreadable files, keep the rest
        }
      }
      if (added > 0) setClasses((prev) => addExamples(prev, classId, added));
    } finally {
      setWorking(false);
    }
  }

  function trainWithSnapshot(classId: string) {
    const engine = engineRef.current;
    const video = videoRef.current;
    if (!engine || !video) return;
    engine.addExample(snapshot(video), classId);
    setClasses((prev) => addExamples(prev, classId));
  }

  async function runPrediction(source: HTMLImageElement | HTMLCanvasElement) {
    const engine = engineRef.current;
    if (!engine) return;
    setWorking(true);
    try {
      const result = await engine.predict(source);
      if (result) {
        setPrediction(result);
        setAwaitingTruth(true);
      }
    } finally {
      setWorking(false);
    }
  }

  async function quizWithFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const img = await fileToImage(file);
      showPreview(file);
      await runPrediction(img);
    } catch {
      /* unreadable file — ignore */
    }
  }

  async function quizWithSnapshot() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = snapshot(video);
    showPreview(canvas);
    await runPrediction(canvas);
  }

  function gradeTruth(actualId: string) {
    if (!prediction) return;
    setStats((prev) => recordTest(prev, prediction.classId, actualId));
    setAwaitingTruth(false);
  }

  function resetAll() {
    engineRef.current?.clearAll();
    setClasses((prev) => clearExamples(prev));
    setStats(EMPTY_STATS);
    setPrediction(null);
    setAwaitingTruth(false);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  const nameOf = (id: string) => {
    const idx = classes.findIndex((c) => c.id === id);
    return classes[idx]?.name.trim() || t('class_name_label', { number: idx + 1 });
  };
  const trained = readyToPredict(classes);
  const accuracy = accuracyPercent(stats);

  // ── Idle / loading / error gate ──────────────────────────────────────────────
  if (engineState !== 'ready') {
    return (
      <div data-testid="image-classifier" className="flex flex-col gap-4 rounded-card bg-white p-5">
        {!hideIntro && (
          <div>
            <h2 className="font-display text-2xl text-challenge">{t('title')}</h2>
            <p className="mt-1 font-body text-sm text-ink/70">{t('subtitle')}</p>
          </div>
        )}
        <p
          data-testid="classifier-privacy-note"
          className="rounded-card bg-tint-lavender px-4 py-3 font-body text-sm font-semibold text-ink"
        >
          {t('privacy')}
        </p>

        {engineState === 'idle' && (
          <button
            type="button"
            data-testid="classifier-power-up"
            onClick={powerUp}
            className="self-start rounded-pill bg-challenge px-6 py-3 font-display text-base font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            {t('power_up')}
          </button>
        )}
        {engineState === 'loading' && (
          <p
            data-testid="classifier-loading"
            role="status"
            className="flex items-center gap-2 font-body text-sm text-ink/70"
          >
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-challenge border-t-transparent"
            />
            {t('loading')}
          </p>
        )}
        {engineState === 'error' && (
          <div data-testid="classifier-load-error" className="flex flex-col items-start gap-2">
            <p className="font-body text-sm text-ink/70">{t('load_error')}</p>
            <button
              type="button"
              data-testid="classifier-retry"
              onClick={powerUp}
              className="rounded-pill border-2 border-challenge px-5 py-2 font-display text-sm font-bold text-challenge hover:bg-tint-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {t('retry')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Trainer ──────────────────────────────────────────────────────────────────
  return (
    <div data-testid="image-classifier" className="flex flex-col gap-5 rounded-card bg-white p-5">
      <div>
        {!hideIntro && <h2 className="font-display text-2xl text-challenge">{t('title')}</h2>}
        <p
          data-testid="classifier-privacy-note"
          className="mt-2 rounded-card bg-tint-lavender px-4 py-2 font-body text-sm font-semibold text-ink"
        >
          {t('privacy')}
        </p>
      </div>

      {/* 1 · Classes */}
      <section aria-label={t('classes_heading')} className="flex flex-col gap-3">
        <h3 className="font-display text-lg text-ink">{t('classes_heading')}</h3>
        <p className="font-body text-sm text-ink/60">{t('examples_hint')}</p>
        <div className="flex flex-col gap-3">
          {classes.map((cls, i) => (
            <div key={cls.id} className={`flex flex-col gap-2 rounded-card p-3 ${CLASS_TINTS[i]}`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cls.name}
                  onChange={(e) => setClasses((prev) => renameClass(prev, cls.id, e.target.value))}
                  placeholder={t('class_name_label', { number: i + 1 })}
                  aria-label={t('class_name_label', { number: i + 1 })}
                  data-testid={`class-name-input-${i}`}
                  className="w-40 rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
                />
                <span data-testid={`class-count-${i}`} className="font-body text-xs text-ink/60">
                  {t('example_count', { count: cls.exampleCount })}
                </span>
                {classes.length > MIN_CLASSES && (
                  <button
                    type="button"
                    data-testid={`class-remove-${i}`}
                    onClick={() => setClasses((prev) => removeClass(prev, cls.id))}
                    aria-label={t('remove_class', { name: nameOf(cls.id) })}
                    className="ltr:ml-auto rtl:mr-auto rounded-full p-1.5 text-ink/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                  >
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid={`class-upload-${i}`}
                  disabled={working}
                  onClick={() => exampleInputs.current[cls.id]?.click()}
                  className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge disabled:opacity-50"
                >
                  📁 {t('upload_examples', { name: nameOf(cls.id) })}
                </button>
                <input
                  ref={(el) => {
                    exampleInputs.current[cls.id] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  tabIndex={-1}
                  aria-hidden="true"
                  className="hidden"
                  onChange={(e) => {
                    void trainWithFiles(cls.id, e.target.files);
                    e.target.value = '';
                  }}
                />
                {cameraState === 'on' && (
                  <button
                    type="button"
                    data-testid={`class-snap-${i}`}
                    disabled={working}
                    onClick={() => trainWithSnapshot(cls.id)}
                    className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge disabled:opacity-50"
                  >
                    {t('snap_example', { name: nameOf(cls.id) })}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        {classes.length < MAX_CLASSES && (
          <button
            type="button"
            data-testid="class-add"
            onClick={() => setClasses((prev) => addClass(prev, ''))}
            className="self-start font-body text-sm font-semibold text-challenge hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
          >
            {t('add_class')}
          </button>
        )}
      </section>

      {/* Camera (always optional) */}
      <section aria-label={t('camera_heading')} className="flex flex-col gap-2">
        <h3 className="font-display text-lg text-ink">{t('camera_heading')}</h3>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="camera-toggle"
            onClick={toggleCamera}
            className="rounded-pill border-2 border-challenge px-4 py-2 font-display text-sm font-bold text-challenge transition-colors hover:bg-tint-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            {cameraState === 'on' ? t('camera_off') : t('camera_on')}
          </button>
          {cameraState === 'error' && (
            <p data-testid="camera-error" className="font-body text-sm text-ink/70">
              {t('camera_error')}
            </p>
          )}
        </div>
        {cameraState === 'on' && (
          <video
            ref={videoRef}
            data-testid="camera-preview"
            aria-label={t('video_label')}
            playsInline
            muted
            className="h-48 w-64 rounded-card bg-ink/10 object-cover"
          />
        )}
      </section>

      {/* 3 · Quiz */}
      <section aria-label={t('test_heading')} className="flex flex-col gap-3 rounded-card bg-tint-blue p-4">
        <h3 className="font-display text-lg text-ink">{t('test_heading')}</h3>
        <p className="font-body text-sm text-ink/60">{t('test_hint')}</p>
        {!trained && (
          <p data-testid="need-examples-note" className="font-body text-sm font-semibold text-ink/70">
            {t('need_examples')}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="test-upload"
            disabled={!trained || working}
            onClick={() => testInputRef.current?.click()}
            className="rounded-pill bg-challenge px-4 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
          >
            📁 {t('test_upload')}
          </button>
          <input
            ref={testInputRef}
            type="file"
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(e) => {
              void quizWithFile(e.target.files);
              e.target.value = '';
            }}
          />
          {cameraState === 'on' && (
            <button
              type="button"
              data-testid="test-snap"
              disabled={!trained || working}
              onClick={() => void quizWithSnapshot()}
              className="rounded-pill bg-challenge px-4 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
            >
              {t('test_snap')}
            </button>
          )}
        </div>
        {working && (
          <p role="status" className="font-body text-sm text-ink/60">
            {t('working')}
          </p>
        )}

        {prediction && (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- local blob/data URL, never remote
                <img
                  src={previewUrl}
                  alt={t('preview_alt')}
                  data-testid="test-preview"
                  className="h-20 w-20 rounded-card object-cover"
                />
              )}
              <div className="flex-1">
                <p data-testid="prediction-label" className="font-display text-base font-bold text-ink">
                  {t('prediction', { name: nameOf(prediction.classId) })}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5" role="list">
                  {classes.map((cls, i) => {
                    const pct = Math.round((prediction.confidences[cls.id] ?? 0) * 100);
                    return (
                      <li key={cls.id} className="flex items-center gap-2">
                        <span className="w-28 truncate font-body text-xs text-ink/70">
                          {t('confidence', { name: nameOf(cls.id), percent: pct })}
                        </span>
                        <span
                          className="h-3 flex-1 overflow-hidden rounded-pill bg-white"
                          aria-hidden="true"
                        >
                          <span
                            data-testid={`confidence-bar-${i}`}
                            className="block h-full rounded-pill bg-challenge transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {awaitingTruth && (
              <div>
                <p className="font-body text-sm font-semibold text-ink">{t('truth_prompt')}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {classes.map((cls, i) => (
                    <button
                      key={cls.id}
                      type="button"
                      data-testid={`truth-pill-${i}`}
                      onClick={() => gradeTruth(cls.id)}
                      className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-challenge hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
                    >
                      {t('truth_pick', { name: nameOf(cls.id) })}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p data-testid="accuracy-readout" className="font-body text-sm font-semibold text-ink">
          {accuracy === null
            ? t('score_empty')
            : t('score', { correct: stats.correct, total: stats.total, percent: accuracy })}
        </p>
      </section>

      <button
        type="button"
        data-testid="classifier-reset"
        onClick={resetAll}
        className="self-start rounded-pill border-2 border-ink/20 px-5 py-2 font-display text-sm font-bold text-ink/70 transition-colors hover:border-ink/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
      >
        {t('reset')}
      </button>
    </div>
  );
}

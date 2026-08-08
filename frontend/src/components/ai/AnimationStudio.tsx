'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  addFrame,
  clampFps,
  FPS_DEFAULT,
  FPS_MAX,
  FPS_MIN,
  FRAME_HEIGHT,
  FRAME_WIDTH,
  frameDurationMs,
  gifDelayMs,
  moveFrame,
  nextFrameIndex,
  readyToPlay,
  removeFrame,
  type Frame,
} from '@/lib/ai/animationCore';

/**
 * Frame-by-frame Animation Studio. Runs ENTIRELY on-device: frames are canvas
 * snapshots kept in memory, the GIF is encoded in the browser (gifenc, lazy-
 * loaded), and nothing is ever uploaded.
 */

type CaptureMode = 'draw' | 'camera';
type CameraState = 'off' | 'on' | 'error';

const PEN_COLORS = ['#3b3b3b', '#cc3a3a', '#1a6fa6', '#1e7a44'] as const;

/** Draw `img` onto a fresh white frame-sized canvas, letterboxed (contain). */
function normalizeToFrame(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  const scale = Math.min(FRAME_WIDTH / img.width, FRAME_HEIGHT / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (FRAME_WIDTH - w) / 2, (FRAME_HEIGHT - h) / 2, w, h);
  return canvas.toDataURL('image/png');
}

function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

/** Centre-crop (cover) the live video onto a frame-sized canvas. */
function snapshotVideo(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext('2d')!;
  const vw = video.videoWidth || FRAME_WIDTH;
  const vh = video.videoHeight || FRAME_HEIGHT;
  const scale = Math.max(FRAME_WIDTH / vw, FRAME_HEIGHT / vh);
  const sw = FRAME_WIDTH / scale;
  const sh = FRAME_HEIGHT / scale;
  ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
  return canvas.toDataURL('image/png');
}

export interface AnimationStudioProps {
  /** Hide the built-in title block (the standalone page renders its own). */
  hideIntro?: boolean;
}

export default function AnimationStudio({ hideIntro = false }: AnimationStudioProps) {
  const t = useTranslations('animator');

  const [open, setOpen] = useState(false);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [mode, setMode] = useState<CaptureMode>('draw');
  const [onionSkin, setOnionSkin] = useState(true);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0]);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [cameraState, setCameraState] = useState<CameraState>('off');
  const [playing, setPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const [fps, setFps] = useState(FPS_DEFAULT);
  const [exporting, setExporting] = useState(false);

  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const ready = readyToPlay(frames);
  const lastFrame = frames.length > 0 ? frames[frames.length - 1] : null;

  // ── Camera lifecycle ─────────────────────────────────────────────────────────

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraState('off');
  }, []);

  useEffect(() => stopCamera, [stopCamera]); // release on unmount

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setCameraState('on');
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

  function switchMode(next: CaptureMode) {
    setMode(next);
    if (next === 'camera' && cameraState === 'off') void startCamera();
    if (next === 'draw') stopCamera();
  }

  // ── Drawing ──────────────────────────────────────────────────────────────────

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * FRAME_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * FRAME_HEIGHT,
    };
  }

  function penDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    drawingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const { x, y } = canvasPoint(e);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    // a dot for single taps
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setHasStrokes(true);
  }

  function penMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = canvasPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function penUp() {
    drawingRef.current = false;
  }

  function clearDrawing() {
    const canvas = drawCanvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    setHasStrokes(false);
  }

  function addDrawingFrame() {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const out = document.createElement('canvas');
    out.width = FRAME_WIDTH;
    out.height = FRAME_HEIGHT;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    ctx.drawImage(canvas, 0, 0);
    setFrames((prev) => addFrame(prev, out.toDataURL('image/png')));
    clearDrawing(); // onion skin now shows the frame just added
  }

  function snapCameraFrame() {
    const video = videoRef.current;
    if (!video) return;
    setFrames((prev) => addFrame(prev, snapshotVideo(video)));
  }

  async function addUploadedFrames(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const img = await fileToImage(file);
        setFrames((prev) => addFrame(prev, normalizeToFrame(img)));
      } catch {
        // skip unreadable files, keep the rest
      }
    }
  }

  // ── Playback ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!playing) return;
    if (!readyToPlay(frames)) {
      setPlaying(false);
      return;
    }
    const timer = setInterval(() => {
      setPlayIndex((i) => nextFrameIndex(i, frames.length));
    }, frameDurationMs(fps));
    return () => clearInterval(timer);
  }, [playing, fps, frames]);

  const stageFrame = playing ? (frames[playIndex] ?? lastFrame) : lastFrame;

  // ── GIF export (gifenc is lazy-loaded so it stays out of the main bundle) ────

  async function exportGif() {
    if (!ready || exporting) return;
    setExporting(true);
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const gif = GIFEncoder();
      const scratch = document.createElement('canvas');
      scratch.width = FRAME_WIDTH;
      scratch.height = FRAME_HEIGHT;
      const ctx = scratch.getContext('2d', { willReadFrequently: true })!;
      const delay = gifDelayMs(fps);
      for (const frame of frames) {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('bad frame'));
          img.src = frame.dataUrl;
        });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        ctx.drawImage(img, 0, 0);
        const { data } = ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        const palette = quantize(data, 256);
        const indexed = applyPalette(data, palette);
        gif.writeFrame(indexed, FRAME_WIDTH, FRAME_HEIGHT, { palette, delay });
      }
      gif.finish();
      const blob = new Blob([gif.bytes()], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-animation.gif';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  // ── Idle gate: privacy promise + one prominent start button ─────────────────

  if (!open) {
    return (
      <div
        data-testid="animation-studio"
        className="flex flex-col items-start gap-4 rounded-card bg-white p-4"
      >
        <p
          data-testid="animator-privacy-note"
          className="rounded-card bg-tint-lavender px-3 py-2 font-body text-sm font-semibold text-ink/80"
        >
          🔒 {t('privacy')}
        </p>
        <button
          type="button"
          data-testid="animator-start"
          onClick={() => setOpen(true)}
          className="rounded-pill bg-challenge px-6 py-3 font-display text-lg font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          {t('start')}
        </button>
      </div>
    );
  }

  return (
    <div data-testid="animation-studio" className="flex flex-col gap-4">
      {!hideIntro && (
        <p
          data-testid="animator-privacy-note"
          className="rounded-card bg-tint-lavender px-3 py-2 font-body text-sm font-semibold text-ink/80"
        >
          🔒 {t('privacy')}
        </p>
      )}

      {/* 1 · Make frames */}
      <section
        aria-label={t('make_heading')}
        className="flex flex-col gap-3 rounded-card bg-white p-4"
      >
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg text-ink ltr:mr-auto rtl:ml-auto">
            {t('make_heading')}
          </h3>
          <button
            type="button"
            data-testid="animator-mode-draw"
            onClick={() => switchMode('draw')}
            aria-pressed={mode === 'draw'}
            className={`rounded-pill px-4 py-1.5 font-body text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
              mode === 'draw' ? 'bg-challenge text-white' : 'bg-tint-blue text-ink'
            }`}
          >
            ✏️ {t('mode_draw')}
          </button>
          <button
            type="button"
            data-testid="animator-mode-camera"
            onClick={() => switchMode('camera')}
            aria-pressed={mode === 'camera'}
            className={`rounded-pill px-4 py-1.5 font-body text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
              mode === 'camera' ? 'bg-challenge text-white' : 'bg-tint-blue text-ink'
            }`}
          >
            📷 {t('mode_camera')}
          </button>
          <button
            type="button"
            data-testid="animator-upload"
            onClick={() => uploadRef.current?.click()}
            className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
          >
            📁 {t('upload')}
          </button>
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            className="hidden"
            onChange={(e) => {
              void addUploadedFrames(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        <label className="flex w-fit items-center gap-2 font-body text-sm text-ink/70">
          <input
            type="checkbox"
            data-testid="animator-onion"
            checked={onionSkin}
            onChange={(e) => setOnionSkin(e.target.checked)}
            className="h-4 w-4 accent-challenge"
          />
          {t('onion_label')}
        </label>

        {mode === 'draw' && (
          <div className="flex flex-col gap-2">
            <div
              className="relative w-full max-w-md overflow-hidden rounded-card border border-ink/20 bg-white"
              style={{ aspectRatio: `${FRAME_WIDTH} / ${FRAME_HEIGHT}` }}
            >
              {onionSkin && lastFrame && (
                // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL
                <img
                  src={lastFrame.dataUrl}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
                />
              )}
              <canvas
                ref={drawCanvasRef}
                data-testid="animator-canvas"
                width={FRAME_WIDTH}
                height={FRAME_HEIGHT}
                onPointerDown={penDown}
                onPointerMove={penMove}
                onPointerUp={penUp}
                onPointerLeave={penUp}
                className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                aria-label={t('canvas_label')}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPenColor(color)}
                  aria-label={t('pen_color', { color })}
                  aria-pressed={penColor === color}
                  className={`h-7 w-7 rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 ${
                    penColor === color ? 'scale-110 ring-2 ring-ink/40 ring-offset-1' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                type="button"
                data-testid="animator-clear"
                onClick={clearDrawing}
                className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-sm text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
              >
                {t('clear_drawing')}
              </button>
              <button
                type="button"
                data-testid="animator-add-drawing"
                onClick={addDrawingFrame}
                disabled={!hasStrokes}
                className="rounded-pill bg-challenge px-4 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
              >
                {t('add_drawing')}
              </button>
            </div>
          </div>
        )}

        {mode === 'camera' && (
          <div className="flex flex-col gap-2">
            {cameraState === 'error' ? (
              <p
                data-testid="animator-camera-error"
                className="rounded-card bg-tint-blush px-3 py-2 font-body text-sm font-semibold text-ink/80"
              >
                {t('camera_error')}
              </p>
            ) : (
              <>
                <div
                  className="relative w-full max-w-md overflow-hidden rounded-card border border-ink/20 bg-ink/90"
                  style={{ aspectRatio: `${FRAME_WIDTH} / ${FRAME_HEIGHT}` }}
                >
                  <video
                    ref={videoRef}
                    data-testid="animator-video"
                    playsInline
                    muted
                    aria-label={t('video_label')}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {onionSkin && lastFrame && (
                    // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL
                    <img
                      src={lastFrame.dataUrl}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
                    />
                  )}
                </div>
                <button
                  type="button"
                  data-testid="animator-snap"
                  onClick={snapCameraFrame}
                  disabled={cameraState !== 'on'}
                  className="w-fit rounded-pill bg-challenge px-4 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
                >
                  📸 {t('snap')}
                </button>
              </>
            )}
          </div>
        )}
      </section>

      {/* 2 · Filmstrip */}
      <section
        aria-label={t('frames_heading')}
        className="flex flex-col gap-3 rounded-card bg-tint-cream p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg text-ink">{t('frames_heading')}</h3>
          <span data-testid="animator-count" className="font-body text-sm font-bold text-ink/70">
            {t('frames_count', { count: frames.length })}
          </span>
        </div>
        {frames.length === 0 ? (
          <p className="font-body text-sm text-ink/60">{t('frames_empty')}</p>
        ) : (
          <ul className="flex gap-3 overflow-x-auto pb-1" role="list">
            {frames.map((frame, i) => (
              <li key={frame.id} className="flex shrink-0 flex-col items-center gap-1">
                <span className="relative block overflow-hidden rounded-lg border border-ink/15 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element -- in-memory data URL */}
                  <img
                    src={frame.dataUrl}
                    data-testid={`frame-${i}`}
                    alt={t('frame_label', { number: i + 1 })}
                    className="h-16 w-[85px] object-cover"
                  />
                  <span className="absolute left-0.5 top-0.5 rounded-pill bg-ink/70 px-1.5 font-body text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    data-testid={`frame-left-${i}`}
                    onClick={() => setFrames((prev) => moveFrame(prev, frame.id, -1))}
                    disabled={i === 0}
                    aria-label={t('move_earlier', { number: i + 1 })}
                    className="rounded-full p-1 text-ink/60 hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-30 rtl:-scale-x-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-testid={`frame-right-${i}`}
                    onClick={() => setFrames((prev) => moveFrame(prev, frame.id, 1))}
                    disabled={i === frames.length - 1}
                    aria-label={t('move_later', { number: i + 1 })}
                    className="rounded-full p-1 text-ink/60 hover:bg-ink/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-30 rtl:-scale-x-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-testid={`frame-delete-${i}`}
                    onClick={() => setFrames((prev) => removeFrame(prev, frame.id))}
                    aria-label={t('delete_frame', { number: i + 1 })}
                    className="rounded-full p-1 text-ink/60 hover:bg-coral/10 hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                  >
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3 · Watch it move */}
      <section
        aria-label={t('play_heading')}
        className="flex flex-col gap-3 rounded-card bg-tint-blue p-4"
      >
        <h3 className="font-display text-lg text-ink">{t('play_heading')}</h3>
        {ready ? (
          <p
            data-testid="animator-ready"
            role="status"
            className="rounded-card bg-explore/15 px-4 py-2 text-center font-display text-base font-bold text-explore"
          >
            {t('ready_status')}
          </p>
        ) : (
          <p data-testid="animator-need-frames" className="font-body text-sm font-semibold text-ink/70">
            {t('need_frames')}
          </p>
        )}

        <div
          className="relative w-full max-w-md overflow-hidden rounded-card border border-ink/20 bg-white"
          style={{ aspectRatio: `${FRAME_WIDTH} / ${FRAME_HEIGHT}` }}
        >
          {stageFrame ? (
            // eslint-disable-next-line @next/next/no-img-element -- in-memory data URL
            <img
              src={stageFrame.dataUrl}
              data-testid="animator-stage"
              alt={t('stage_alt')}
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <p className="absolute inset-0 flex items-center justify-center font-body text-sm text-ink/40">
              {t('stage_empty')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="animator-play"
            onClick={() => {
              setPlayIndex(0);
              setPlaying((p) => !p);
            }}
            disabled={!ready}
            aria-pressed={playing}
            className="rounded-pill bg-challenge px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
          >
            {playing ? `⏸ ${t('pause')}` : `▶ ${t('play')}`}
          </button>
          <label className="flex items-center gap-2 font-body text-sm font-semibold text-ink/70">
            {t('fps_label', { fps })}
            <input
              type="range"
              data-testid="animator-fps"
              min={FPS_MIN}
              max={FPS_MAX}
              step={1}
              value={fps}
              onChange={(e) => setFps(clampFps(Number(e.target.value)))}
              className="w-36 accent-challenge"
            />
          </label>
          <button
            type="button"
            data-testid="animator-export"
            onClick={() => void exportGif()}
            disabled={!ready || exporting}
            className="rounded-card border border-ink/20 bg-white px-4 py-2 font-body text-sm font-bold text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge disabled:opacity-50"
          >
            {exporting ? t('exporting') : `💾 ${t('export')}`}
          </button>
        </div>
      </section>
    </div>
  );
}

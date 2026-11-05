import { uploadProjectPhoto } from '@/lib/api/client';

/** How long an upload may take before the kid is told and can try again. */
export const PHOTO_WAIT_MS = 30_000;

/** Uploads a project photo. False when it failed or timed out: the caller must tell the kid. */
export async function uploadPhotoSafely(projectId: string, photo: File): Promise<boolean> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), PHOTO_WAIT_MS);
  try {
    await uploadProjectPhoto(projectId, photo, stop.signal);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

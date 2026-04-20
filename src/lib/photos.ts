import { supabase } from "@/lib/supabase";
import { SESSION_PHOTOS_BUCKET } from "@/lib/types";

const MAX_DIMENSION = 1600;
const TARGET_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type PreparedImage = {
  blob: Blob;
  ext: "webp" | "jpg";
  mime: "image/webp" | "image/jpeg";
};

/**
 * Client-side downscale + re-encode. Keeps uploads small so the free tier goes
 * further. Prefers WebP; falls back to JPEG when the browser can't encode WebP
 * (very old Safari, for example).
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File is not an image");
  }

  const bitmap = await loadBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION);

    const canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement("canvas"), { width, height });
    const ctx = (canvas as HTMLCanvasElement | OffscreenCanvas).getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    // drawImage works with both ImageBitmap and HTMLImageElement.
    (ctx as CanvasRenderingContext2D).drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", TARGET_QUALITY);
    let ext: PreparedImage["ext"] = "webp";
    let mime: PreparedImage["mime"] = "image/webp";

    // Some engines silently return a PNG when WebP isn't supported.
    if (!blob || blob.size === 0 || blob.type === "image/png") {
      blob = await canvasToBlob(canvas, "image/jpeg", TARGET_QUALITY);
      ext = "jpg";
      mime = "image/jpeg";
    }
    if (!blob) throw new Error("Failed to encode image");

    if (blob.size > MAX_UPLOAD_BYTES) {
      throw new Error(
        `Image is still ${(blob.size / 1024 / 1024).toFixed(1)} MB after compression (max 5 MB)`
      );
    }
    return { blob, ext, mime };
  } finally {
    if ("close" in bitmap) (bitmap as ImageBitmap).close?.();
  }
}

async function loadBitmap(
  file: File
): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // HEIC and some formats fall through to the <img> path below.
    }
  }
  return await loadHtmlImage(file);
}

function loadHtmlImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return {
    width: Math.round(w * ratio),
    height: Math.round(h * ratio),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number
): Promise<Blob | null> {
  if ("convertToBlob" in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({ type, quality });
  }
  return new Promise((resolve) =>
    (canvas as HTMLCanvasElement).toBlob((b) => resolve(b), type, quality)
  );
}

/**
 * Upload a prepared image to the storage bucket and insert the row.
 * Returns the new photo row, or throws.
 */
export async function uploadSessionPhoto(params: {
  sessionId: string;
  playerId: string;
  file: File;
  caption?: string | null;
}) {
  const { sessionId, playerId, file, caption } = params;

  const prepared = await prepareImageForUpload(file);

  // Pre-flight the limit so we don't upload bytes we're about to reject.
  const { count } = await supabase
    .from("session_photos")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("player_id", playerId);
  if ((count ?? 0) >= 2) {
    throw new Error("This player already has 2 photos in this session");
  }

  const photoId = crypto.randomUUID();
  const storagePath = `${sessionId}/${playerId}/${photoId}.${prepared.ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(SESSION_PHOTOS_BUCKET)
    .upload(storagePath, prepared.blob, {
      cacheControl: "31536000",
      contentType: prepared.mime,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data, error: insertErr } = await supabase
    .from("session_photos")
    .insert({
      id: photoId,
      session_id: sessionId,
      player_id: playerId,
      storage_path: storagePath,
      caption: caption?.trim() ? caption.trim() : null,
    })
    .select()
    .single();

  if (insertErr) {
    // Roll back the upload if the DB rejected it (e.g. trigger fired after a
    // race with another upload).
    await supabase.storage.from(SESSION_PHOTOS_BUCKET).remove([storagePath]);
    if (insertErr.message?.includes("PHOTO_LIMIT_REACHED")) {
      throw new Error("This player already has 2 photos in this session");
    }
    throw insertErr;
  }

  return data;
}

export async function deleteSessionPhoto(photo: {
  id: string;
  storage_path: string;
}) {
  const { error: delErr } = await supabase
    .from("session_photos")
    .delete()
    .eq("id", photo.id);
  if (delErr) throw delErr;

  await supabase.storage
    .from(SESSION_PHOTOS_BUCKET)
    .remove([photo.storage_path]);
}

export function getPhotoPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from(SESSION_PHOTOS_BUCKET)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

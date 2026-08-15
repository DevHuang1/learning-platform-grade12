import { hasSupabase, supabase } from "./supabase";

export const EXAM_ANSWERS_BUCKET = "exam-answers";
export const QUESTION_IMAGES_BUCKET = "question-images";

export async function ensureBuckets() {
  if (!hasSupabase()) return { error: "Supabase not configured" };
  for (const bucket of [EXAM_ANSWERS_BUCKET, QUESTION_IMAGES_BUCKET]) {
    const { error } = await supabase.storage.createBucket(bucket, {
      public: true,
    });
    if (error && !error.message.includes("already exists")) {
      console.warn("createBucket", error.message);
    }
  }
  return { error: null };
}

export function getPublicUrl(bucket: string, path: string) {
  if (!hasSupabase()) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload a file to a Supabase bucket. The caller stores the returned path as the
 * durable reference and can use the public URL for the existing display flows.
 */
export async function uploadAnswerFile(
  bucket: string,
  folder: string,
  file: File,
): Promise<
  | {
      path: string;
      publicUrl: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      error: null;
    }
  | { error: string }
> {
  if (!hasSupabase()) return { error: "Supabase is not configured" };
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = file.name.replace(/[^a-z0-9._-]+/gi, "-").slice(-80);
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName || `answer.${ext}`}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) return { error: error.message };
  return {
    path: name,
    publicUrl: getPublicUrl(bucket, name),
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    error: null,
  };
}

/**
 * Backward-compatible image upload helper for question and section assets.
 */
export async function uploadImage(
  bucket: string,
  folder: string,
  file: File,
): Promise<{ path: string; publicUrl: string; error: null } | { error: string }> {
  const result = await uploadAnswerFile(bucket, folder, file);
  if (!("path" in result)) return result;
  return { path: result.path, publicUrl: result.publicUrl, error: null };
}

export async function removeImage(bucket: string, path: string | null) {
  if (!path || !hasSupabase()) return;
  await supabase.storage.from(bucket).remove([path]);
}

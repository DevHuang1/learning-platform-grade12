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
      console.warn("createBucket", bucket, error.message);
    }
  }
  return { error: null };
}

export function getPublicUrl(bucket: string, path: string) {
  if (!hasSupabase()) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/**
 * Upload an image to a Supabase bucket. Returns { path, publicUrl } or { error }.
 */
export async function uploadImage(
  bucket: string,
  folder: string,
  file: File,
): Promise<{ path: string; publicUrl: string; error: null } | { error: string }> {
  if (!hasSupabase()) return { error: "Supabase is not configured" };
  const ext = file.name.split(".").pop() || "jpg";
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(name, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return { error: error.message };
  return { path: name, publicUrl: getPublicUrl(bucket, name), error: null };
}

export async function removeImage(bucket: string, path: string | null) {
  if (!path || !hasSupabase()) return;
  await supabase.storage.from(bucket).remove([path]);
}
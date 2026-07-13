import { supabase } from "./supabase";

export const CHAT_UPLOADS_BUCKET = "chat-uploads";
const MAX_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
}

async function uploadFileToBucket(file: File, ownerFolder: string): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error("Fichier trop volumineux (max 5 Mo)");
  }

  const folder = ownerFolder.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || "guest";
  const path = `${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { data, error } = await supabase.storage
    .from(CHAT_UPLOADS_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data: publicData } = supabase.storage.from(CHAT_UPLOADS_BUCKET).getPublicUrl(data.path);
  return publicData.publicUrl;
}

async function dataUrlToFile(dataUrl: string, fallbackName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const ext = blob.type.split("/")[1] || "bin";
  return new File([blob], `${fallbackName}.${ext}`, { type: blob.type || "application/octet-stream" });
}

/**
 * Upload direct d'un File vers Supabase Storage.
 */
export async function uploadChatFile(file: File, ownerFolder: string): Promise<string> {
  try {
    return await uploadFileToBucket(file, ownerFolder);
  } catch (error) {
    console.error("Upload fichier échoué:", error);
    throw error;
  }
}

/**
 * Upload une image/fichier vers Supabase Storage.
 * - data: URLs → converties puis uploadées
 * - http(s) URLs → retournées telles quelles
 * - Échec → retourne l'URL d'origine (fallback base64 pour invités)
 */
export async function uploadChatMedia(
  source: string | null | undefined,
  ownerFolder: string,
): Promise<string | null> {
  if (!source?.trim()) return null;
  if (source.startsWith("http://") || source.startsWith("https://")) return source;
  if (!source.startsWith("data:")) return source;

  try {
    const file = await dataUrlToFile(source, `upload-${Date.now()}`);
    return await uploadFileToBucket(file, ownerFolder);
  } catch (error) {
    console.error("Upload Storage échoué, fallback data URL:", error);
    return source;
  }
}

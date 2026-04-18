import { supabase } from "./supabase";

export async function uploadImage(file: File, bucket: string): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { console.error(`[Storage] Erro upload em '${bucket}':`, error); return null; }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

import { supabase } from "./supabase";

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.8;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size <= 500_000) {
        resolve(file);
        return;
      }

      if (width > height) {
        if (width > MAX_DIMENSION) { height = Math.round(height * MAX_DIMENSION / width); width = MAX_DIMENSION; }
      } else {
        if (height > MAX_DIMENSION) { width = Math.round(width * MAX_DIMENSION / height); height = MAX_DIMENSION; }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Falha ao comprimir imagem")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Falha ao carregar imagem")); };
    img.src = url;
  });
}

export async function uploadImage(file: File, bucket: string, skipCompression: boolean = false): Promise<string | null> {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    console.error("[Storage] Erro de autenticação:", authError);
    // Propagar erro específico para que o componente possa tratar (ex: sugerir logout)
    if (authError?.message?.includes("Refresh Token Not Found")) {
      throw new Error("Sua sessão expirou e o token de atualização não foi encontrado. Por favor, faça logout e login novamente.");
    }
    return null;
  }

  const compressed = skipCompression ? file : await compressImage(file);
  const ext = compressed.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    upsert: true,
    contentType: compressed.type,
    cacheControl: '3600'
  });

  if (error) { 
    console.error(`[Storage] Erro upload em '${bucket}':`, error); 
    return null; 
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  let publicUrl = data.publicUrl;
  if (import.meta.env.DEV && publicUrl.includes("/supabase/storage/")) {
    const realSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://zwfvrmqffxcqurxpfewi.supabase.co";
    publicUrl = publicUrl.replace(`${window.location.origin}/supabase`, realSupabaseUrl);
  }
  console.log(`[Storage] Imagem disponível em: ${publicUrl}`);
  return publicUrl;
}

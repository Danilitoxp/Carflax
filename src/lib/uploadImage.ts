import { supabase } from "./supabase";

export async function uploadImage(file: File, bucket: string): Promise<string | null> {
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  
  if (authError || !session) {
    console.error("[Storage] Erro de autenticação:", authError);
    // Propagar erro específico para que o componente possa tratar (ex: sugerir logout)
    if (authError?.message?.includes("Refresh Token Not Found")) {
      throw new Error("Sua sessão expirou e o token de atualização não foi encontrado. Por favor, faça logout e login novamente.");
    }
    return null;
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  
  const { error } = await supabase.storage.from(bucket).upload(path, file, { 
    upsert: true,
    contentType: file.type,
    cacheControl: '3600'
  });

  if (error) { 
    console.error(`[Storage] Erro upload em '${bucket}':`, error); 
    return null; 
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  console.log(`[Storage] Imagem disponível em: ${data.publicUrl}`);
  return data.publicUrl;
}

import { Plus, ThumbsUp, Edit2, Share2, Image as ImageIcon, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { TinyDropdown } from "@/components/ui/TinyDropdown";
import { useNotification } from "@/components/ui/NotificationProvider";

const categories = ["Todos", "Empresa", "Social", "Eventos", "Avisos"];

export interface CommunicationPost {
  id: number | string;
  dbId: string | number;
  title: string;
  content: string;
  category: string;
  author: string;
  authorAvatar: string;
  date: string;
  image: string;
  likes: number;
  likedBy: string[];
}

export function CommunicationCard({ data, onEdit, userProfile }: { data: CommunicationPost; onEdit: (d: CommunicationPost) => void, userProfile?: any }) {
  const currentUserId = userProfile?.id;
  const isLiked = currentUserId ? data.likedBy.includes(currentUserId) : false;
  const [likes, setLikes] = useState(data.likes);
  const [interaction, setInteraction] = useState<"like" | null>(isLiked ? "like" : null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [likersAvatars, setLikersAvatars] = useState<string[]>([]);

  const userAvatar = userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'User'}`;

  // Sincronizar estado local se os dados externos mudarem
  useEffect(() => {
    setLikes(data.likes);
    setInteraction(currentUserId && data.likedBy.includes(currentUserId) ? "like" : null);
  }, [data.likes, data.likedBy, currentUserId]);

  useEffect(() => {
    const fetchAvatars = async () => {
      if (!data.likedBy || data.likedBy.length === 0) {
        setLikersAvatars([]);
        return;
      }
      
      // 1. Pegar os IDs mais recentes
      const sortedIds = [...data.likedBy].reverse().slice(0, 5);
      
      const { data: users } = await supabase
        .from('usuarios')
        .select('id, avatar, name')
        .in('id', sortedIds);
      
      let finalAvatars: string[] = [];

      if (users) {
        finalAvatars = sortedIds
          .map(id => users.find(u => String(u.id) === String(id)))
          .filter(Boolean)
          .map(u => u!.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u!.name}`);
      }

      // 2. SEGURANÇA: Se eu curti e minha foto não apareceu na query por algum motivo (delay/cache)
      // eu forço ela na primeira posição se eu estiver na lista de likes
      if (currentUserId && data.likedBy.includes(currentUserId)) {
        const alreadyIn = finalAvatars.includes(userAvatar);
        if (!alreadyIn) {
          finalAvatars = [userAvatar, ...finalAvatars].slice(0, 5);
        }
      }
          
      setLikersAvatars(finalAvatars);
    };
    fetchAvatars();
  }, [data.likedBy, currentUserId, userAvatar]);

  const handleLike = async () => {
    if (!currentUserId) return;
    
    const isLiking = interaction !== "like";
    const newLikesCount = isLiking ? likes + 1 : Math.max(0, likes - 1);
    
    // UI OTIMISTA: Atualização Instantânea na Tela
    setLikes(newLikesCount);
    setInteraction(isLiking ? "like" : null);

    if (isLiking) {
      setLikersAvatars(prev => [userAvatar, ...prev.filter(a => a !== userAvatar)].slice(0, 5));
    } else {
      setLikersAvatars(prev => prev.filter(a => a !== userAvatar));
    }

    // Processamento em Background no Supabase
    try {
      // 1. Buscar estado atual para sincronização de array
      const { data: currentPost } = await supabase
        .from("comunicados")
        .select("liked_by")
        .eq("id", data.dbId)
        .maybeSingle();

      let newLikedBy = currentPost?.liked_by || [];
      
      if (isLiking) {
        if (!newLikedBy.includes(currentUserId)) {
          newLikedBy.push(currentUserId);
        }
      } else {
        newLikedBy = newLikedBy.filter(id => id !== currentUserId);
      }
      
      // 2. Persistir no banco
      await supabase
        .from("comunicados")
        .update({ 
          likes: newLikesCount, 
          liked_by: newLikedBy 
        })
        .eq("id", data.dbId);
    } catch (error) {
      console.error("Erro ao sincronizar curtida:", error);
    }
  };

  const handleShare = () => {
    const text = `*${data.title}*\n\n${data.content}\n\n_Enviado via Carflax Digital_`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-300 hover:shadow-lg h-auto sm:min-h-[220px] group">
      <div className="w-full sm:w-64 bg-slate-100 shrink-0 border-b sm:border-b-0 sm:border-r border-border overflow-hidden relative min-h-[160px]">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-400 rounded-full animate-spin" />
          </div>
        )}
        
        <img
          key={data.image}
          src={data.image}
          alt={data.title}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          className={cn(
            "w-full h-full object-cover",
            "group-hover:scale-110 transition-transform duration-500"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="flex-1 p-6 flex flex-col min-w-0">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex items-center gap-3">
             <span className="text-[11px] font-black px-3 py-1 rounded-lg bg-blue-50 text-blue-600 uppercase tracking-widest">{data.category}</span>
             <span className="text-xs text-slate-400 font-bold">{data.date}</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <button onClick={handleShare} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Compartilhar">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(data)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors uppercase">{data.title}</h3>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4 font-medium">{data.content}</p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-6">
             <button
               onClick={handleLike}
               className={cn(
                 "flex items-center gap-2 text-xs font-black transition-all transform active:scale-95 px-3 py-1.5 rounded-xl", 
                 interaction === "like" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
               )}
             >
               <ThumbsUp className={cn("w-4 h-4", interaction === "like" && "fill-white")} />
               {likes}
             </button>
              <div className="flex items-center -space-x-2">
                {likersAvatars.map((url, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-slate-100 ring-1 ring-slate-100 shadow-sm transition-transform hover:scale-110 hover:z-10">
                    <img src={url} className="w-full h-full object-cover" alt="liker" />
                  </div>
                ))}
              </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
             <img src={data.authorAvatar} className="w-7 h-7 rounded-full shadow-sm object-cover" alt={data.author} />
             <div className="flex flex-col leading-none text-left">
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate max-w-[80px]">{data.author}</span>
               <span className="text-[9px] font-bold text-slate-400 uppercase">Autor</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunicationSection({ userProfile, loading: externalLoading }: { userProfile?: any, loading?: boolean }) {
  const { showNotification } = useNotification();
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [comms, setComms] = useState<CommunicationPost[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const loading = externalLoading !== undefined ? externalLoading : internalLoading;
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | string | null>(null);

  const fetchComunicados = useCallback(async (silent = false) => {
    if (!silent) setInternalLoading(true);
    // Buscamos o comunicado e os dados do autor (usuários) em uma única tacada
    const { data, error } = await supabase
      .from("comunicados")
      .select(`
        *,
        usuarios (
          name,
          avatar
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComms(data.map((c: any) => ({
        id: String(c.id),
        dbId: String(c.id),
        title: c.titulo,
        content: c.descricao || "",
        category: c.filtro || "Empresa",
        author: c.usuarios?.name || c.tag || "Carflax",
        authorAvatar: c.usuarios?.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${c.tag || 'carflax'}`,
        date: new Date(c.created_at).toLocaleDateString("pt-BR"),
        image: (c.image_url || c.image || "").trim() || `https://api.dicebear.com/7.x/shapes/svg?seed=${c.id}`,
        likes: c.likes || 0,
        likedBy: c.liked_by || [],
      })));
    }
    setInternalLoading(false);
  }, []);

  useEffect(() => {
    fetchComunicados();
  }, [fetchComunicados]);

  const [newPost, setNewPost] = useState<{title: string, content: string, category: string, image: string, _imageFile?: File}>(() => ({
    title: "", content: "", category: "Empresa", image: ""
  }));

  const handleAddPost = async () => {
    if (!newPost.title || !newPost.content) return;
    setSaving(true);
    try {
      let finalImageUrl = newPost.image || "";
      if (newPost._imageFile) {
        const uploadedUrl = await uploadImage(newPost._imageFile, "Comunicados");
        if (uploadedUrl) finalImageUrl = uploadedUrl;
      }

      const payload = {
        titulo: newPost.title.toUpperCase(),
        descricao: newPost.content,
        filtro: newPost.category,
        image_url: finalImageUrl,
        tag: userProfile?.name || "Danilo",
        user_id: userProfile?.id
      };

      if (editingId) {
        const { error } = await supabase.from("comunicados").update(payload).eq("id", editingId);
        if (error) throw error;
        showNotification("success", "Comunicado Atualizado", "As alterações foram salvas com sucesso!");
      } else {
        const { error } = await supabase.from("comunicados").insert([{ ...payload, likes: 0, liked_by: [] }]);
        if (error) throw error;
        showNotification("success", "Publicado!", "O novo comunicado já está disponível no feed.");
      }

      await fetchComunicados(true);
      setIsModalOpen(false);
      setEditingId(null);
      setNewPost({ title: "", content: "", category: "Empresa", image: "" });
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao Salvar", "Ocorreu um problema ao sincronizar com o banco.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingId) return;
    if (!confirm("Tem certeza que deseja excluir este comunicado permanentemente?")) return;

    setSaving(true);
    try {
      const { error } = await supabase.from("comunicados").delete().eq("id", editingId);
      if (error) throw error;
      
      showNotification("success", "Comunicado Removido", "O post foi excluído permanentemente do feed.");
      await fetchComunicados(true);
      setIsModalOpen(false);
      setEditingId(null);
    } catch (err) {
      console.error(err);
      showNotification("error", "Erro ao Excluir", "Não foi possível remover o comunicado.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (data: CommunicationPost) => {
    setNewPost({ title: data.title, content: data.content, category: data.category, image: data.image });
    setEditingId(data.dbId);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPost(p => ({ ...p, image: URL.createObjectURL(file), _imageFile: file }));
  };

  const filtered = activeCategory === "Todos" ? comms : comms.filter(c => c.category === activeCategory);

  return (
    <div className="flex flex-col relative">
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/10">
          <div className="fixed inset-0" onClick={() => !saving && setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
               <div className="w-40 h-40 md:w-56 md:h-56 rounded-2xl border-4 border-white shadow-xl overflow-hidden mb-6 group relative bg-white flex items-center justify-center">
                  <img src={newPost.image || "https://api.dicebear.com/7.x/shapes/svg?seed=placeholder"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Preview" />
                  <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-[2px]">
                    <ImageIcon className="w-8 h-8 text-white mb-2" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar Imagem</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
               </div>
               <Button variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()} disabled={saving} className="font-bold text-xs h-10 px-6 rounded-xl">SELECIONAR FOTO</Button>
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{editingId ? "EDITAR COMUNICADO" : "NOVO COMUNICADO"}</h2>
                {!saving && <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">✕</button>}
              </div>
              <div className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto do Post</label>
                    <input type="text" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500" placeholder="Título impactante..." disabled={saving} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria de Filtro</label>
                    <TinyDropdown value={newPost.category} options={categories.filter(c => c !== "Todos")} onChange={(val) => setNewPost({ ...newPost, category: val })} icon={Tag} variant="blue" className="w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo do Comunicado</label>
                  <textarea value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} rows={6} className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 outline-none focus:ring-1 focus:ring-blue-500 resize-none" placeholder="O que você quer contar para a equipe?" disabled={saving} />
                </div>
              </div>
              <div className="p-8 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  {editingId && (
                    <Button 
                      variant="ghost" 
                      onClick={handleDelete} 
                      disabled={saving} 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 font-black text-xs h-11 px-6 rounded-xl"
                    >
                      EXCLUIR
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={saving} className="font-bold text-xs h-11 px-6">CANCELAR</Button>
                </div>
                
                <Button onClick={handleAddPost} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-10 rounded-xl h-11 shadow-lg shadow-blue-600/20">
                  {saving ? "PROCESSANDO..." : editingId ? "SALVAR ALTERAÇÕES" : "PUBLICAR AGORA"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="pb-3 border-b border-border mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-7 w-16 bg-slate-100 rounded-md animate-pulse" />
            ))
          ) : (
            categories.map((cat) => (
              <button key={cat} onClick={() => setActiveCategory(cat)} className={cn("px-4 py-1.5 text-xs font-bold rounded-md transition-all", activeCategory === cat ? "bg-slate-100 text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50")}>{cat}</button>
            ))
          )}
        </div>
        {loading ? (
          <div className="h-9 w-40 bg-slate-100 rounded-md animate-pulse shadow-sm" />
        ) : (
          <Button onClick={() => { setEditingId(null); setNewPost({ title: "", content: "", category: "Empresa", image: "" }); setIsModalOpen(true); }} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 px-4 text-[11px] font-bold shadow-sm group">
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" /> NOVO COMUNICADO
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden flex flex-col sm:flex-row h-auto sm:min-h-[220px] animate-pulse">
            <div className="w-full sm:w-64 bg-slate-200 shrink-0" />
            <div className="flex-1 p-8 space-y-4">
              <div className="flex gap-3">
                <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                <div className="h-6 w-24 bg-slate-100 rounded-lg" />
              </div>
              <div className="h-8 w-3/4 bg-slate-200 rounded-xl" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-slate-100 rounded-md" />
                <div className="h-4 w-full bg-slate-100 rounded-md" />
                <div className="h-4 w-2/3 bg-slate-100 rounded-md" />
              </div>
              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <div className="h-8 w-24 bg-slate-100 rounded-xl" />
                <div className="h-10 w-32 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && <p className="text-center text-slate-400 text-sm py-8 font-bold text-slate-300">NADA POR ENQUANTO.</p>}
        {!loading && filtered.map((item) => (
          <CommunicationCard key={item.id} data={item} onEdit={handleEdit} userProfile={userProfile} />
        ))}
      </div>
    </div>
  );
}

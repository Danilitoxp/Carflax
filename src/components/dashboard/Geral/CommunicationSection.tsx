import { Plus, ThumbsUp, Edit2, Share2, X, Send, Image as ImageIcon, Type, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/uploadImage";
import { Button } from "@/components/ui/button";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

const categories = ["Todos", "Empresa", "Social", "Eventos", "Avisos"];

const initialCommunications: CommunicationPost[] = [];

export interface CommunicationPost {
  id: number;
  title: string;
  content: string;
  category: string;
  author: string;
  authorAvatar: string;
  date: string;
  image: string;
  likes: number;
  dislikes: number;
}

export function CommunicationCard({ data, onEdit }: { data: CommunicationPost; onEdit: (d: CommunicationPost) => void }) {
  const [interaction, setInteraction] = useState<"like" | "dislike" | null>(null);

  const handleLike = () => {
    setInteraction(interaction === "like" ? null : "like");
  };

  const handleShare = () => {
    const text = `*${data.title}*\n\n${data.content}\n\n_Enviado via Carflax Digital_`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-all duration-300 hover:shadow-lg h-auto sm:min-h-[220px] group">
      {/* Visual Side - Larger */}
      <div className="w-full sm:w-64 bg-slate-50 flex items-center justify-center p-6 shrink-0 border-b sm:border-b-0 sm:border-r border-border overflow-hidden bg-gradient-to-br from-slate-50 to-white">
        <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-md overflow-hidden transition-transform duration-700 group-hover:rotate-3 group-hover:scale-110">
          <img
            src={data.image}
            alt={data.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Content Side - More Spacious */}
      <div className="flex-1 p-6 flex flex-col min-w-0">
        <div className="flex justify-between items-start gap-4 mb-2">
          <div className="flex items-center gap-3">
             <span className="text-[11px] font-black px-3 py-1 rounded-lg bg-blue-50 text-blue-600 uppercase tracking-widest">{data.category}</span>
             <span className="text-xs text-slate-400 font-bold">{data.date}</span>
          </div>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
            <button
              onClick={handleShare}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(data)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-black text-slate-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
          {data.title}
        </h3>

        <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 mb-4 font-medium">
          {data.content}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
          <div className="flex items-center gap-6">
             <button
               onClick={handleLike}
               className={cn(
                 "flex items-center gap-2 text-xs font-black transition-all transform active:scale-95",
                 interaction === "like" ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
               )}
             >
               <ThumbsUp className={cn("w-4 h-4", interaction === "like" && "fill-blue-600")} />
               {interaction === "like" ? data.likes + 1 : data.likes}
             </button>
             
             <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + data.likes}`} 
                    className="w-7 h-7 rounded-lg border-2 border-white shadow-sm"
                    alt="user"
                  />
                ))}
                <div className="w-7 h-7 rounded-lg bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                  +12
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
             <img src={data.authorAvatar} className="w-6 h-6 rounded-lg shadow-sm" alt={data.author} />
             <div className="flex flex-col leading-none">
               <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter">{data.author}</span>
               <span className="text-[9px] font-bold text-slate-400 uppercase">Autor</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export function CommunicationSection() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [comms, setComms] = useState<CommunicationPost[]>(initialCommunications);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchComunicados() {
      const { data, error } = await supabase
        .from("comunicados")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setComms(data.map((c, i) => ({
          id: i + 1,
          title: c.titulo,
          content: c.descricao || "",
          category: c.filtro || c.tag || "Empresa",
          author: c.tag || "Carflax",
          authorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${c.firebase_id}`,
          date: new Date(c.created_at).toLocaleDateString("pt-BR"),
          image: c.image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.firebase_id}`,
          likes: c.likes || 0,
          dislikes: c.dislikes || 0,
        })));
      }
      setLoading(false);
    }
    fetchComunicados();
  }, []);

  // Form states
  const [newPost, setNewPost] = useState(() => ({
    title: "",
    content: "",
    category: "Empresa",
    image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
  }));

  const handleAddPost = () => {
    if (!newPost.title || !newPost.content) return;

    if (editingId) {
      // Edit existing
      setComms(comms.map(c =>
        c.id === editingId
          ? { ...c, ...newPost, date: "editado agora" }
          : c
      ));
    } else {
      // Create new
      const post = {
        id: comms.length + 1,
        ...newPost,
        author: "Danilo (Você)",
        authorAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo",
        date: "agora mesmo",
        likes: 0,
        dislikes: 0
      };
      setComms([post, ...comms]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setNewPost({
      title: "",
      content: "",
      category: "Empresa",
      image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`
    });
  };

  const handleEdit = (data: CommunicationPost) => {
    setNewPost({
      title: data.title,
      content: data.content,
      category: data.category,
      image: data.image
    });
    setEditingId(data.id);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview local
    const url = URL.createObjectURL(file);
    setNewPost(p => ({ ...p, image: url, _imageFile: file } as any));
  };

  const filtered = activeCategory === "Todos"
    ? comms
    : comms.filter(c => c.category === activeCategory);

  return (
    <div className="flex flex-col relative">
      {/* MODAL: NEW / EDIT COMMUNICATION (Definitivo) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-sm bg-slate-900/10">
          <div
            className="fixed inset-0"
            onClick={() => {
              setIsModalOpen(false);
              setEditingId(null);
            }}
          />
          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            
            {/* LEFT SIDE: PREVIEW (Leve e funcional) */}
            <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
               <div className="w-40 h-40 md:w-56 md:h-56 rounded-2xl border-4 border-white shadow-xl overflow-hidden mb-6 group relative bg-white flex items-center justify-center">
                  <img
                    src={newPost.image || "https://api.dicebear.com/7.x/shapes/svg?seed=placeholder"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    alt="Preview"
                  />
                  <label className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer backdrop-blur-[2px]">
                    <ImageIcon className="w-8 h-8 text-white mb-2" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Alterar</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
               </div>
               <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Imagem do Comunicado</p>
                  <Button 
                    variant="outline" 
                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                    className="h-9 px-6 rounded-xl border-slate-200 text-slate-600 font-bold text-xs hover:bg-white hover:text-primary hover:border-primary transition-all"
                  >
                    ALTERAR FOTO
                  </Button>
               </div>
            </div>

            {/* RIGHT SIDE: FORM (Limpo e profissional) */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">
                    {editingId ? "Editar Comunicado" : "Novo Comunicado"}
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">Preencha os dados abaixo</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto</label>
                    <div className="relative">
                      <Type className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={newPost.title}
                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none"
                        placeholder="Ex: Reunião de Alinhamento"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</label>
                    <div className="relative">
                      <TinyDropdown 
                        value={newPost.category} 
                        options={categories.filter(c => c !== "Todos")} 
                        onChange={(val) => setNewPost({ ...newPost, category: val })} 
                        icon={Tag} 
                        variant="blue"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Conteúdo</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    rows={6}
                    className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 focus:ring-1 focus:ring-primary focus:border-primary transition-all shadow-sm outline-none resize-none"
                    placeholder="Escreva aqui o conteúdo do seu comunicado..."
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-end gap-3 shrink-0">
                <Button
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="font-bold text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-200 px-6 rounded-xl h-11"
                >
                  CANCELAR
                </Button>
                <Button
                  onClick={handleAddPost}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs px-8 rounded-xl h-11 shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {editingId ? "SALVAR ALTERAÇÕES" : "PUBLICAR COMUNICADO"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED TOP PART: Filters */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeCategory === cat
                    ? "bg-slate-100 text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <Button
            onClick={() => {
              setEditingId(null);
              setNewPost({ title: "", content: "", category: "Empresa", image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}` });
              setIsModalOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md h-9 px-4 text-[11px] font-bold transition-all shadow-sm group"
          >
            <Plus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform" />
            NOVO COMUNICADO
          </Button>
        </div>
      </div>

      {/* BOTTOM PART: Cards - No longer scrollable here, parent handles it */}
      <div className="flex flex-col gap-4">
        {loading && (
          <p className="text-center text-slate-400 text-sm py-8">Carregando comunicados...</p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-8">Nenhum comunicado encontrado.</p>
        )}
        {filtered.map((item) => (
          <CommunicationCard key={item.id} data={item} onEdit={handleEdit} />
        ))}
      </div>
    </div>
  );
}

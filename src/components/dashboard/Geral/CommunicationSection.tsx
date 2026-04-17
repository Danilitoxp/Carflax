import { Plus, Clock, ThumbsUp, ThumbsDown, Edit2, Share2, X, Send, Image as ImageIcon, Type, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HeroBanner } from "./HeroBanner";
import { AvatarStack } from "@/components/ui/AvatarStack";
const categories = ["Todos", "Empresa", "Social", "Eventos", "Avisos"];

const initialCommunications = [
  {
    id: 1,
    title: "🎉 Feliz Aniversário, Mateus Ronald! 🎂",
    content: "Hoje celebramos a vida do(a) nosso(a) colega Mateus Ronald! A família Carflax se alegra em compartilhar esse momento especial ao seu lado, reconhecendo toda a dedicação, profissionalismo e energia que você contribui no dia a dia. Desejamos que este novo ciclo venha acompanhado de muita saúde, conquistas e momentos inesquecíveis.",
    category: "Social",
    author: "RH Corporate",
    authorAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=RH",
    date: "há 7 dias",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mateus",
    likes: 7,
    dislikes: 0
  },
  {
    id: 2,
    title: "Atualização da Política de Home Office 2026",
    content: "Estamos atualizando nossas diretrizes para permitir maior flexibilidade aos colaboradores. Confira os novos modelos de trabalho híbrido disponíveis a partir do próximo mês no portal do RH.",
    category: "Empresa",
    author: "Diretoria",
    authorAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Diretoria",
    date: "há 2 horas",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Office",
    likes: 12,
    dislikes: 0
  },
  {
    id: 3,
    title: "Novos Benefícios: Plano de Saúde Ampliado",
    content: "A partir do próximo trimestre, todos os colaboradores terão acesso ao novo plano de saúde Platinum. Fiquem atentos aos seus e-mails para o formulário de atualização de dependentes.",
    category: "Avisos",
    author: "Benefícios",
    authorAvatar: "https://api.dicebear.com/7.x/identicon/svg?seed=Saude",
    date: "há 1 dia",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Health",
    likes: 24,
    dislikes: 0
  }
];

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

  const handleDislike = () => {
    setInteraction(interaction === "dislike" ? null : "dislike");
  };

  const currentLikes = interaction === "like" ? data.likes + 1 : data.likes;

  const handleShare = () => {
    const text = `*${data.title}*\n\n${data.content}\n\n_Enviado via Carflax Digital_`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-card border border-border/50 rounded-3xl overflow-hidden flex flex-col group transition-all duration-500 hover:border-primary/30 shadow-lg dark:shadow-2xl dark:shadow-black/20 flex-1">
      <div className="flex flex-col md:flex-row md:min-h-[320px] h-full">
        {/* Visual Side (Image) */}
        <div className="w-full md:w-[30%] md:min-w-[30%] md:max-w-[30%] bg-gradient-to-br from-[#032D9C] to-[#0053FC] flex items-center justify-center p-6 md:p-8 relative overflow-hidden shrink-0 h-48 md:h-auto">
          <div className="w-32 h-32 md:w-full md:max-w-[160px] aspect-square rounded-full border-4 border-white/20 p-1.5 relative z-10 transition-transform duration-700 group-hover:scale-110 shadow-2xl shadow-black/20">
            <img
              src={data.image}
              alt={data.title}
              className="w-full h-full rounded-full object-cover bg-white/10"
            />
          </div>
          {/* Decorative pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          </div>
        </div>

        {/* Content Side */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col relative bg-card transition-colors duration-300 min-w-0">
          <div className="flex justify-between items-start mb-3 md:mb-4 gap-3 md:gap-4">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground flex-1 tracking-tight line-clamp-2">
              {data.title}
            </h3>
            <div className="flex items-center gap-1 shrink-0 bg-secondary/30 rounded-xl p-1">
              <button
                onClick={handleShare}
                className="text-muted-foreground/60 hover:text-primary transition-all p-1.5 md:p-2 hover:bg-card rounded-lg hover:scale-105 active:scale-95"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => onEdit(data)}
                className="text-muted-foreground/60 hover:text-primary transition-all p-1.5 md:p-2 hover:bg-card rounded-lg hover:scale-105 active:scale-95"
              >
                <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          <div className="mb-6 md:mb-8 flex-1">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed font-medium line-clamp-4 md:line-clamp-none">
              {data.content}
            </p>
          </div>

          {/* Footer info */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mt-auto gap-5 pt-5 border-t border-border/10">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={handleLike}
                  className={cn(
                    "flex items-center gap-2 md:gap-3 px-3 sm:px-4 md:px-6 py-1.5 md:py-2.5 rounded-full group/like cursor-pointer transition-all shadow-sm hover:scale-105 active:scale-95",
                    interaction === "like"
                      ? "bg-[#0053FC] text-white border-transparent"
                      : "bg-secondary/50 dark:bg-secondary/20 border border-border/50 text-muted-foreground hover:bg-[#0053FC] hover:text-white"
                  )}
                >
                  <ThumbsUp
                    className={cn(
                      "w-3.5 h-3.5 md:w-5 md:h-5 transition-all group-hover/like:-rotate-12",
                      interaction === "like" ? "fill-white text-white" : "text-muted-foreground/70"
                    )}
                  />
                  <span className="text-[10px] sm:text-xs md:text-sm font-bold transition-colors">{currentLikes}</span>
                </button>
                <button
                  onClick={handleDislike}
                  className={cn(
                    "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 border border-border/50 rounded-full group/dislike cursor-pointer transition-all shadow-sm hover:scale-105 active:scale-95",
                    interaction === "dislike"
                      ? "bg-destructive text-white border-transparent"
                      : "bg-secondary/50 dark:bg-secondary/20 text-muted-foreground hover:bg-destructive hover:text-white"
                  )}
                >
                  <ThumbsDown
                    className={cn(
                      "w-3.5 h-3.5 md:w-5 md:h-5 transition-all group-hover/dislike:rotate-12",
                      interaction === "dislike" ? "fill-white text-white" : "text-muted-foreground/70"
                    )}
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1 overflow-hidden shrink-0">
                <AvatarStack count={data.likes} />
              </div>
            </div>

            <div className="flex items-center gap-2 text-muted-foreground/40 font-medium whitespace-nowrap py-1">
              <Clock className="w-3 h-3" />
              <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest">{data.date}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}


export function CommunicationSection() {
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [comms, setComms] = useState(initialCommunications);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost({ ...newPost, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filtered = activeCategory === "Todos"
    ? comms
    : comms.filter(c => c.category === activeCategory);

  return (
    <div className="flex flex-col h-screen overflow-hidden relative">
      {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              onClick={() => {
                setIsModalOpen(false);
                setEditingId(null);
                setNewPost({ title: "", content: "", category: "Empresa", image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}` });
              }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <div
              className="relative w-full max-w-4xl bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-auto"
            >
              {/* Modal Sidebar (Preview) */}
              <div className="w-full md:w-[42%] bg-gradient-to-br from-[#032D9C] to-[#0053FC] p-8 md:p-12 flex flex-col items-center justify-center text-white relative">
                <div className="relative z-10 text-center w-full">
                  <div className="w-40 h-40 md:w-60 md:h-60 rounded-full border-8 border-white/20 p-2 mx-auto mb-8 bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative group">
                    <img src={newPost.image} className="w-full h-full rounded-full object-cover shadow-inner" alt="Preview" />
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition-all duration-300 backdrop-blur-[2px]">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-10 h-10 text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Trocar</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                  <h4 className="font-black text-3xl uppercase tracking-tighter mb-2">{editingId ? 'EDITANDO' : 'PREVIEW'}</h4>
                  <p className="text-white/50 text-xs font-bold uppercase tracking-[0.3em] mb-10">Imagem do Comunicado</p>

                  <button
                    onClick={() => document.getElementById('modal-file-upload')?.click()}
                    className="px-10 py-4 bg-white/10 hover:bg-white text-white hover:text-primary rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/20 shadow-xl"
                  >
                    ALTERAR FOTO
                  </button>
                  <input id="modal-file-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                {/* Abstract Shapes */}
                <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-white/5 rounded-full blur-3xl opacity-50" />
              </div>

              {/* Form Side */}
              <div className="flex-1 p-6 md:p-10 flex flex-col bg-card">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-foreground tracking-tight">{editingId ? 'Editar Comunicado' : 'Novo Comunicado'}</h3>
                  <button onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }} className="p-2 hover:bg-secondary rounded-full transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Assunto</label>
                    <div className="relative">
                      <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <input
                        type="text"
                        placeholder="Título do comunicado..."
                        value={newPost.title}
                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/30 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Categoria</label>
                    <div className="relative">
                      <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                      <select
                        value={newPost.category}
                        onChange={(e) => setNewPost({ ...newPost, category: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/30 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm font-semibold appearance-none cursor-pointer"
                      >
                        {categories.filter(c => c !== "Todos").map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-primary uppercase tracking-[0.2em] ml-1">Conteúdo</label>
                    <textarea
                      placeholder="Escreva sua mensagem aqui..."
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      rows={4}
                      className="w-full p-4 rounded-2xl bg-secondary/30 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none text-sm font-semibold resize-none"
                    />
                  </div>
                </div>

                <div className="mt-10 flex gap-3">
                  <Button variant="outline" onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }} className="flex-1 py-6 rounded-2xl font-bold border-border hover:bg-secondary">
                    Cancelar
                  </Button>
                  <Button onClick={handleAddPost} className="flex-1 py-6 bg-[#0053FC] hover:bg-[#0053FC]/90 text-white rounded-2xl font-bold shadow-lg shadow-primary/20 gap-2">
                    <Send className="w-4 h-4" />
                    {editingId ? 'Salvar Alterações' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* FIXED TOP PART: Banner + Filters */}
      <div className="p-4 md:px-6 md:pt-6 md:pb-2 space-y-4 shrink-0 bg-background/50 backdrop-blur-md z-20">
        <HeroBanner />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center p-1 bg-secondary/50 rounded-2xl border border-border w-full sm:w-fit overflow-x-auto scrollbar-hide">
            <div className="flex items-center min-w-max">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300",
                    activeCategory === cat
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={() => {
              setEditingId(null);
              setNewPost({ title: "", content: "", category: "Empresa", image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}` });
              setIsModalOpen(true);
            }}
            className="gap-2 bg-[#0053FC] hover:bg-[#0053FC]/90 text-white rounded-xl py-6 px-8 font-bold transition-all border-none shadow-md active:scale-95 w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            <span className="tracking-tight">Novo Comunicado</span>
          </Button>
        </div>
      </div>

      {/* SCROLLABLE BOTTOM PART: Cards */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-6 scrollbar-hide">
        <div className="flex flex-col gap-4 min-h-full pt-0">
          {filtered.map((item) => (
            <CommunicationCard key={item.id} data={item} onEdit={handleEdit} />
          ))}
        </div>
      </div>
    </div>
  );
}


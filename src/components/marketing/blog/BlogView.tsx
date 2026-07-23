import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Tag,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Code,
  Check,
  Copy,
  Upload,
  ArrowUpRight,
  Layers,
  LayoutGrid
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/uploadImage";
import { CircularTestimonials } from "@/components/ui/circular-testimonials";
import { cn } from "@/lib/utils";

export interface BlogCard {
  id: string;
  title: string;
  designation: string;
  quote: string;
  src: string;
  tags: string[];
  active: boolean;
  order_index: number;
  created_at?: string;
}

export function BlogView() {
  const [cards, setCards] = useState<BlogCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [editingCard, setEditingCard] = useState<BlogCard | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesignation, setFormDesignation] = useState("");
  const [formQuote, setFormQuote] = useState("");
  const [formSrc, setFormSrc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formOrderIndex, setFormOrderIndex] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCards();
  }, []);

  async function fetchCards() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("marketing_blog_cards")
        .select("*")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar blog cards:", error);
      } else {
        setCards(data || []);
      }
    } catch (err) {
      console.error("Erro na busca de cards:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingCard(null);
    setFormTitle("");
    setFormDesignation("");
    setFormQuote("");
    setFormSrc("https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?q=80&w=1368&auto=format&fit=crop");
    setFormTags("Destaque, Blog");
    setFormActive(true);
    setFormOrderIndex(cards.length + 1);
    setModalOpen(true);
  }

  function handleOpenEdit(card: BlogCard) {
    setEditingCard(card);
    setFormTitle(card.title || "");
    setFormDesignation(card.designation || "");
    setFormQuote(card.quote || "");
    setFormSrc(card.src || "");
    setFormTags((card.tags || []).join(", "));
    setFormActive(card.active ?? true);
    setFormOrderIndex(card.order_index ?? 1);
    setModalOpen(true);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const publicUrl = await uploadImage(file, "blog-cards");
      if (publicUrl) {
        setFormSrc(publicUrl);
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
      alert("Falha ao enviar imagem. Verifique o arquivo e tente novamente.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formQuote.trim() || !formSrc.trim()) {
      alert("Por favor, preencha o Título, o Conteúdo/Descrição e a URL da Imagem.");
      return;
    }

    try {
      setSaving(true);
      const tagsArray = formTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: formTitle.trim(),
        designation: formDesignation.trim(),
        quote: formQuote.trim(),
        src: formSrc.trim(),
        tags: tagsArray,
        active: formActive,
        order_index: Number(formOrderIndex) || 1,
      };

      if (editingCard) {
        const { error } = await supabase
          .from("marketing_blog_cards")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingCard.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_blog_cards")
          .insert([payload]);

        if (error) throw error;
      }

      setModalOpen(false);
      fetchCards();
    } catch (err: unknown) {
      console.error("Erro ao salvar card:", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erro ao salvar card: " + msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(card: BlogCard) {
    try {
      const { error } = await supabase
        .from("marketing_blog_cards")
        .update({ active: !card.active, updated_at: new Date().toISOString() })
        .eq("id", card.id);

      if (error) throw error;
      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, active: !c.active } : c))
      );
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  async function handleDeleteCard(id: string) {
    if (!confirm("Tem certeza que deseja excluir este card do Blog?")) return;

    try {
      const { error } = await supabase
        .from("marketing_blog_cards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Erro ao excluir card:", err);
      alert("Erro ao excluir card.");
    }
  }

  // Active cards format for live CircularTestimonials preview
  const activeTestimonialsFormatted = cards
    .filter((c) => c.active)
    .map((c) => ({
      name: c.title,
      designation: c.designation || "Blog Card",
      quote: c.quote,
      src: c.src,
    }));

  const embedCodeScript = `<script>
  // Integração com o HUB Carflax (Busca cards do Marketing em tempo real)
  fetch('https://mlyjggtggawxngayzvhx.supabase.co/rest/v1/marketing_blog_cards?active=eq.true&select=*&order=order_index.asc')
    .then(res => res.json())
    .then(data => {
      const testimonials = data.map(item => ({
        name: item.title,
        designation: item.designation,
        quote: item.quote,
        src: item.src
      }));
      // Inicializa o carrossel do site com os dados recebidos
      if (typeof CircularTestimonials !== 'undefined') {
        new CircularTestimonials(document.getElementById('circular-testimonials'), {
          testimonials: testimonials,
          autoplay: true
        });
      }
    });
</script>`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
              Blog & Cards do Site
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gerencie o conteúdo, fotos, títulos, descrições e tags exibidos no carrossel interativo do seu site.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCodeModalOpen(true)}
            className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold rounded-xl border border-border flex items-center gap-2 transition-all"
          >
            <Code className="w-4 h-4 text-blue-500" />
            <span>Código do Site</span>
          </button>

          <button
            onClick={fetchCards}
            disabled={loading}
            className="p-2 bg-secondary hover:bg-secondary/80 text-muted-foreground rounded-xl transition-all"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Card</span>
          </button>
        </div>
      </div>

      {/* Live Preview Section */}
      {activeTestimonialsFormatted.length > 0 && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 md:p-10 rounded-3xl text-white shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                Pré-visualização em Tempo Real (Live no Site)
              </span>
            </div>
            <span className="text-xs bg-blue-500/20 text-blue-300 font-bold px-3 py-1 rounded-full border border-blue-500/30">
              {activeTestimonialsFormatted.length} Cards Ativos
            </span>
          </div>

          <div className="w-full flex justify-center overflow-hidden">
            <CircularTestimonials
              testimonials={activeTestimonialsFormatted}
              autoplay={true}
              colors={{
                name: "#ffffff",
                designation: "#94a3b8",
                testimony: "#e2e8f0",
                arrowBackground: "#1e293b",
                arrowForeground: "#ffffff",
                arrowHoverBackground: "#2563eb",
              }}
              fontSizes={{
                name: "24px",
                designation: "16px",
                quote: "16px",
              }}
            />
          </div>
        </div>
      )}

      {/* List / Table of Cards */}
      <div className="space-y-4">
        <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-blue-500" />
          <span>Gerenciar Posts e Depoimentos ({cards.length})</span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-card border border-border rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center space-y-3">
            <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-foreground">Nenhum card cadastrado</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Clique em "Novo Card" para adicionar a primeira imagem, título, descrição e tags para o seu site.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              Criar Primeiro Card
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {cards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-md group relative overflow-hidden",
                  card.active ? "border-border" : "border-border/50 opacity-60 bg-secondary/30"
                )}
              >
                <div className="space-y-4">
                  {/* Top bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
                      <img
                        src={card.src}
                        alt={card.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleActive(card)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors flex items-center gap-1",
                          card.active
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                        )}
                        title={card.active ? "Clique para ocultar no site" : "Clique para exibir no site"}
                      >
                        {card.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{card.active ? "Ativo" : "Oculto"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(card)}
                        className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-secondary rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-secondary rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div>
                    <h3 className="text-base font-bold text-foreground line-clamp-1">{card.title}</h3>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 line-clamp-1">
                      {card.designation || "Sem cargo/subtítulo"}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic">
                    "{card.quote}"
                  </p>

                  {/* Tags */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {card.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-md border border-border/50 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground font-bold">
                  <span>Ordem: #{card.order_index}</span>
                  {card.created_at && (
                    <span>{new Date(card.created_at).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar / Editar Card */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-black uppercase text-foreground">
                {editingCard ? "Editar Card do Blog" : "Novo Card do Blog"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider">
                  Título / Autor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Tamar Mendelson ou Título do Post"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Designation */}
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider">
                  Subtítulo / Cargo / Categoria
                </label>
                <input
                  type="text"
                  value={formDesignation}
                  onChange={(e) => setFormDesignation(e.target.value)}
                  placeholder="Ex: Crítica Gastronômica ou Depoimento"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Description / Quote */}
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider">
                  Descrição / Conteúdo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formQuote}
                  onChange={(e) => setFormQuote(e.target.value)}
                  placeholder="Escreva a descrição ou depoimento do card que aparecerá no site..."
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Image URL & Upload */}
              <div className="space-y-2">
                <label className="font-bold text-foreground uppercase tracking-wider">
                  Imagem <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={formSrc}
                    onChange={(e) => setFormSrc(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500"
                  />
                  <label className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingImage ? "Enviando..." : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {formSrc && (
                  <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-border bg-secondary">
                    <img src={formSrc} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="font-bold text-foreground uppercase tracking-wider">
                  Tags (Separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Destaque, Recomendado, Gastronomia"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Active & Order */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="font-bold text-foreground uppercase tracking-wider">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formOrderIndex}
                    onChange={(e) => setFormOrderIndex(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-foreground py-2">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="w-4 h-4 accent-blue-600 rounded"
                    />
                    <span>Exibir no Site</span>
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-secondary text-foreground font-bold rounded-xl hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Código de Incorporação no Site */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-500" />
                <h3 className="text-base font-black uppercase text-foreground">
                  Como Conectar o Card no seu Site
                </h3>
              </div>
              <button
                onClick={() => setCodeModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Cole o trecho de código abaixo no seu site ou utilize o arquivo <code className="bg-secondary px-1.5 py-0.5 rounded text-blue-500">cards.html</code>. O carrossel irá buscar os dados dinamicamente desta seção de Marketing do HUB!
            </p>

            <div className="relative bg-slate-950 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800">
              <pre>{embedCodeScript}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(embedCodeScript);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute top-3 right-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar Código"}</span>
              </button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
              <ArrowUpRight className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold text-foreground">Sincronização em Tempo Real</p>
                <p className="text-muted-foreground">
                  Sempre que você criar, editar ou ocultar um card nesta tela do HUB, o seu site atualizará automaticamente sem que você precise alterar o código fonte da página!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCodeModalOpen(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

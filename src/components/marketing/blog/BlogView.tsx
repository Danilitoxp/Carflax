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
  Layers,
  LayoutGrid,
  ShoppingBag,
  ExternalLink,
  FileText,
  ImageIcon,
  X,
  Globe,
  Sliders,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/uploadImage";
import { cn } from "@/lib/utils";
import { ComposerInput } from "@/components/ui/composer-input";

export interface BlogCard {
  id: string;
  title: string;
  designation: string;
  quote: string;
  src: string;
  tags: string[];
  product_name?: string;
  product_url?: string;
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
  const [formQuote, setFormQuote] = useState("");
  const [formSrc, setFormSrc] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formProductName, setFormProductName] = useState("");
  const [formProductUrl, setFormProductUrl] = useState("");
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
    setFormQuote("");
    setFormSrc("");
    setFormTags("Destaque, Blog, Carflax");
    setFormProductName("");
    setFormProductUrl("");
    setFormActive(true);
    setFormOrderIndex(cards.length + 1);
    setModalOpen(true);
  }

  function handleOpenEdit(card: BlogCard) {
    setEditingCard(card);
    setFormTitle(card.title || "");
    setFormQuote(card.quote || "");
    setFormSrc(card.src || "");
    setFormTags((card.tags || []).join(", "));
    setFormProductName(card.product_name || "");
    setFormProductUrl(card.product_url || "");
    setFormActive(card.active ?? true);
    setFormOrderIndex(card.order_index ?? 1);
    setModalOpen(true);
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.target;
    const file = inputEl.files?.[0];
    if (!file) return;

    // Preview instantâneo sem delay de rede
    const instantPreviewUrl = URL.createObjectURL(file);
    setFormSrc(instantPreviewUrl);

    try {
      setUploadingImage(true);
      const publicUrl = await uploadImage(file, "campanhas", true, true);
      if (publicUrl) {
        setFormSrc(publicUrl);
      }
    } catch (err) {
      console.error("Erro ao enviar imagem:", err);
    } finally {
      setUploadingImage(false);
      inputEl.value = "";
    }
  }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault();

    if (!formTitle.trim() || !formQuote.trim()) {
      alert("Por favor, preencha o Título e o Conteúdo do artigo.");
      return;
    }

    if (!formSrc.trim()) {
      alert("Por favor, faça o upload da Imagem de Capa.");
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

  // Helper para preview limpo sem marcadores
  function cleanSnippet(text: string) {
    if (!text) return "";
    return text.replace(/<[^>]*>?/gm, '').replace(/\*\*/g, '').replace(/\*/g, '');
  }


  const embedCodeScript = `<script>
  // Integração com o HUB Carflax (Busca cards do Marketing em tempo real do Supabase)
  const SUPABASE_URL = 'https://zwfvrmqffxcqurxpfewi.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3ZnZybXFmZnhjcXVyeHBmZXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0NDMwMzksImV4cCI6MjA5MjAxOTAzOX0.6Q02L0XYE7xWtn0AcCwN2KDTvRaYQgGwoTPLblR-VgE';

  fetch(SUPABASE_URL + '/rest/v1/marketing_blog_cards?active=eq.true&select=*&order=order_index.asc', {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        const testimonials = data.map(item => ({
          name: item.title,
          designation: item.designation || '',
          quote: item.quote,
          src: item.src,
          tags: item.tags || [],
          product_name: item.product_name || '',
          product_url: item.product_url || ''
        }));
        if (typeof CircularTestimonials !== 'undefined') {
          new CircularTestimonials(document.getElementById('circular-testimonials'), {
            testimonials: testimonials,
            autoplay: true
          });
        }
      }
    });
</script>`;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-background min-h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-card via-card to-secondary/30 border border-border/80 p-6 md:p-8 rounded-3xl shadow-sm relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
              Blog & Publicações do Site
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Gerencie os artigos, fotos de capa, descrições detalhadas, tags SEO e produtos vinculados que aparecem no seu site.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={() => setCodeModalOpen(true)}
            className="px-4 py-2.5 bg-secondary/80 hover:bg-secondary text-foreground text-xs font-bold rounded-2xl border border-border flex items-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Code className="w-4 h-4 text-blue-500" />
            <span>Código do Site</span>
          </button>

          <button
            onClick={fetchCards}
            disabled={loading}
            className="p-2.5 bg-secondary/80 hover:bg-secondary text-muted-foreground rounded-2xl border border-border transition-all shadow-sm active:scale-95"
            title="Atualizar"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-600/25 flex items-center gap-2 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Novo Post</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-blue-500" />
            <span>Posts Publicados ({cards.length})</span>
          </h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="bg-card border border-dashed border-border/80 rounded-3xl p-14 text-center space-y-4">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-3xl flex items-center justify-center mx-auto">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">Nenhum artigo publicado ainda</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Clique no botão abaixo para cadastrar seu primeiro post com upload de imagem de capa, texto formatado, tags SEO e link de produto.
              </p>
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-2xl shadow-lg shadow-blue-500/25"
            >
              Criar Primeiro Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className={cn(
                  "bg-card border rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group relative overflow-hidden",
                  card.active
                    ? "border-border hover:border-blue-500/30"
                    : "border-border/50 opacity-60 bg-secondary/20"
                )}
              >
                <div className="space-y-4">
                  {/* Banner Preview */}
                  <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-secondary border border-border/60">
                    <img
                      src={card.src}
                      alt={card.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(card)}
                        className={cn(
                          "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md transition-all flex items-center gap-1.5",
                          card.active
                            ? "bg-emerald-500/90 text-white"
                            : "bg-amber-500/90 text-white"
                        )}
                      >
                        {card.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{card.active ? "Ativo" : "Oculto"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Header info */}
                  <div className="space-y-1">
                    <h3 className="text-base font-extrabold text-foreground line-clamp-1 group-hover:text-blue-500 transition-colors">
                      {card.title}
                    </h3>
                  </div>

                  {/* Body quote snippet */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 italic">
                    "{cleanSnippet(card.quote)}"
                  </p>

                  {/* Produto Vinculado */}
                  {card.product_name && (
                    <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 p-3 rounded-2xl border border-blue-500/20">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ShoppingBag className="w-4 h-4 shrink-0 text-blue-500" />
                        <span className="line-clamp-1">{card.product_name}</span>
                      </div>
                      {card.product_url && (
                        <a
                          href={card.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-blue-500/20 rounded-lg shrink-0"
                          title="Abrir Produto"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Tags SEO */}
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {card.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded-lg border border-border/50 flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5 text-blue-500" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground font-bold">
                    <span>Ordem: #{card.order_index}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(card)}
                      className="px-3 py-1.5 bg-secondary hover:bg-blue-500/10 hover:text-blue-500 text-muted-foreground text-xs font-bold rounded-xl border border-border/60 transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL ULTRA-PREMIUM (CRIAR / EDITAR POST COM COMPOSER INPUT INTEGRADO) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-blue-950 p-6 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600/30 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400">
                  {editingCard ? <Edit2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    {editingCard ? "Editar Publicação do Blog" : "Criar Nova Publicação do Blog"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Insira as informações do post com upload de imagem e composer interativo.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body Container */}
            <form onSubmit={handleSaveCard} className="p-6 md:p-8 space-y-6 text-xs overflow-y-auto flex-1">
              {/* Section 1: Informações Principais */}
              <div className="bg-secondary/30 border border-border/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <Globe className="w-4 h-4 text-blue-500" />
                  <span className="font-extrabold uppercase tracking-wider text-foreground text-xs">
                    1. Informações da Publicação
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground uppercase tracking-wider">
                    Título do Post / Artigo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ex: Como proteger seus eletrônicos de raios"
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500 text-xs transition-colors"
                  />
                </div>
              </div>

              {/* Section 2: Capa & Mídia */}
              <div className="bg-secondary/30 border border-border/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    <span className="font-extrabold uppercase tracking-wider text-foreground text-xs">
                      2. Upload da Imagem de Capa <span className="text-rose-500">*</span>
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG, WEBP</span>
                </div>

                {formSrc ? (
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-background p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm">
                    <div className="w-full md:w-36 h-28 rounded-xl overflow-hidden bg-secondary shrink-0 border border-border">
                      <img src={formSrc} alt="Capa da Publicação" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 text-center md:text-left min-w-0">
                      <div className="flex items-center gap-1.5 justify-center md:justify-start text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                        <Check className="w-4 h-4" />
                        <span>Foto Carregada com Sucesso</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-500/20 active:scale-95 transition-all">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{uploadingImage ? "Enviando..." : "Trocar Foto"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setFormSrc("")}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Remover Foto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-border hover:border-blue-500/60 bg-background/50 hover:bg-blue-500/5 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all space-y-3 group">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-foreground text-xs">
                        {uploadingImage ? "Enviando foto para o servidor..." : "Clique para selecionar uma foto do seu computador"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        A imagem será salva e vinculada automaticamente a esta publicação.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Section 3: Conteúdo Completo do Artigo (ComposerInput Component) */}
              <div className="bg-secondary/30 border border-border/80 p-5 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-extrabold uppercase tracking-wider text-foreground text-xs">
                      3. Conteúdo Completo do Artigo
                    </span>
                  </div>
                </div>

                <ComposerInput
                  value={formQuote}
                  onChange={(val) => setFormQuote(val)}
                  placeholder="Digite o texto completo do seu artigo..."
                />
              </div>

              {/* Section 4: Vincular Produto */}
              <div className="bg-secondary/30 border border-border/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                  <span className="font-extrabold uppercase tracking-wider text-foreground text-xs">
                    4. Vincular Produto Recomendado (Opcional)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wider">
                      Nome do Produto
                    </label>
                    <input
                      type="text"
                      value={formProductName}
                      onChange={(e) => setFormProductName(e.target.value)}
                      placeholder="Ex: Dispositivo de Proteção contra Surto (DPS)"
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wider">
                      Link do Produto no Site (URL)
                    </label>
                    <input
                      type="url"
                      value={formProductUrl}
                      onChange={(e) => setFormProductUrl(e.target.value)}
                      placeholder="https://meusite.com/produto/dps-150"
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 5: Tags SEO & Exibição */}
              <div className="bg-secondary/30 border border-border/80 p-5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                  <Sliders className="w-4 h-4 text-blue-500" />
                  <span className="font-extrabold uppercase tracking-wider text-foreground text-xs">
                    5. Palavras-chave SEO & Exibição
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wider">
                      Tags / Palavras-chave (SEO)
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={(e) => setFormTags(e.target.value)}
                      placeholder="Ex: Raios, Surto Elétrico, Proteção Eletrônica"
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl font-medium focus:outline-none focus:border-blue-500 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground italic">
                      Separadas por vírgula. As palavras-chave ajudam o Google a ranquear a página do seu site.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground uppercase tracking-wider">
                      Ordem no Carrossel
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formOrderIndex}
                      onChange={(e) => setFormOrderIndex(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl font-medium focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/40">
                  <div>
                    <span className="font-bold text-foreground uppercase tracking-wider block">Status no Site</span>
                    <span className="text-[11px] text-muted-foreground">Exibe ou oculta o post no carrossel do seu site</span>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-2 font-extrabold text-xs text-foreground">
                      {formActive ? "Visível" : "Oculto"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Submit Action Bar */}
              <div className="flex justify-end items-center gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-bold rounded-2xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/25 disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <span>{saving ? "Salvando..." : editingCard ? "Salvar Alterações" : "Publicar Post"}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Código de Incorporação */}
      {codeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-border/80 rounded-3xl w-full max-w-2xl shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Code className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black uppercase text-foreground">
                  Como Conectar os Posts no seu Site
                </h3>
              </div>
              <button
                onClick={() => setCodeModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Cole o trecho de código abaixo na sua página HTML ou utilize o arquivo <code className="bg-secondary px-2 py-0.5 rounded-md text-blue-500 font-mono">cards.html</code>. Todos os posts cadastrados nesta tela serão carregados dinamicamente!
            </p>

            <div className="relative bg-slate-950 text-slate-100 p-4 md:p-5 rounded-2xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
              <pre>{embedCodeScript}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(embedCodeScript);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="absolute top-4 right-4 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copiado!" : "Copiar Código"}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCodeModalOpen(false)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md"
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

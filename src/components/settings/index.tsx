import { useState } from "react";
import {
  User,
  Smartphone,
  Mail,
  Camera,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Bell,
  Monitor,
  Sun,
  Moon,
  Check,
  MessageSquare,
  Briefcase,
  ShieldAlert,
  Palette,
  Image as ImageIcon,
  Sparkles,
  Plus,
  FileBadge,
  Trash2,
  Send,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface UserProfile {
  id?: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  department?: string;
  phone?: string;
  whatsapp?: string;
  permissions?: string[];
  is_admin?: boolean;
  is_leader?: boolean;
}

interface SettingsSectionProps {
  externalTab?: string;
  userProfile?: UserProfile | null;
}

/* ─────────────────────────────────────────────
   BANNERS
   Gestão de imagens de topo e avisos
   ───────────────────────────────────────────── */
function BannersTab({ userProfile }: { userProfile?: UserProfile | null }) {
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [banners] = useState([
    { id: 1, title: "Banner Promoção Abril", url: "https://images.unsplash.com/photo-1549416805-0e6d62635928?q=80&w=1200", dims: "1800 x 600px" },
    { id: 2, title: "Aviso Nova Filial", url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200", dims: "1800 x 600px" },
  ]);
  const canManage = userProfile?.is_leader || userProfile?.role === "admin";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-50 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
              <ImageIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">Banners da Home</h4>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Altere as imagens e efeitos de transição</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 px-4 py-3 rounded-xl border border-slate-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className={cn("w-4 h-4", transitionEnabled ? "text-blue-600 dark:text-blue-400" : "text-slate-300 dark:text-slate-700")} />
              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">Efeito Transição</span>
            </div>
            <Toggle checked={transitionEnabled} onChange={setTransitionEnabled} disabled={!canManage} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div key={b.id} className="group relative bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300">
              <div className="aspect-[3/1] bg-slate-200 dark:bg-slate-800 relative overflow-hidden">
                <img src={b.url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {canManage && (
                    <Button className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest border-none">
                      SUBSTITUIR IMAGEM
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{b.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Dimensões: {b.dims}</p>
                </div>
                {canManage && (
                  <Button className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 p-0 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-100 transition-all">
                    <ImageIcon className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* ADD NEW CARD */}
          {canManage && (
            <button className="aspect-[3/1] md:aspect-auto flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-50/50 dark:bg-white/[0.02] hover:bg-blue-50/30 dark:hover:bg-blue-500/5 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 group-hover:text-blue-600 uppercase tracking-widest">Adicionar Banner</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-provider";

interface SettingsSectionProps {
  externalTab?: string;
}

/* ─────────────────────────────────────────────
   TINY TOGGLE
   Standardizado para o sistema Carflax
───────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out",
        checked ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "bg-slate-200 dark:bg-slate-800",
        disabled && "opacity-30 cursor-not-allowed shadow-none"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-300 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────
   TINY INPUT
   Estilo unificado de alta densidade
───────────────────────────────────────────── */
function SettingsInput({
  label,
  value,
  onChange,
  icon: Icon,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: LucideIcon;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5 px-0.5">
      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1 opacity-80">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-blue-500 transition-colors" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   TINY PASSWORD FIELD
───────────────────────────────────────────── */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  strength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  strength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 dark:text-slate-600 group-focus-within:text-blue-500 transition-colors" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-sm"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {strength !== undefined && value.length > 0 && (
        <div className="flex items-center gap-1.5 px-1 mt-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                n <= strength
                  ? strength <= 1 ? "bg-rose-500" : strength === 2 ? "bg-amber-500" : strength === 3 ? "bg-blue-500" : "bg-emerald-500"
                  : "bg-slate-100"
              )}
            />
          ))}
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 tracking-tighter ml-1 uppercase">
            {strength <= 1 ? "Fraca" : strength === 2 ? "Média" : strength === 3 ? "Boa" : "Forte"}
          </span>
        </div>
      )}
    </div>
  );
}

function getStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

/* ─────────────────────────────────────────────
   MEU PERFIL
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   MEU PERFIL - REDESIGN ESTRUTURADO
   Foco em cards, hierarquia e organização
───────────────────────────────────────────── */
function formatPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 10) {
    digits = digits.slice(2);
  }
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

function ProfileTab({ userProfile }: { userProfile?: UserProfile | null }) {
  const [form, setForm] = useState(() => ({
    nome: userProfile?.name || "",
    email: userProfile?.email || "",
    telefone: formatPhone(userProfile?.phone || userProfile?.whatsapp || ""),
    cargo: userProfile?.role || "",
    avatar: userProfile?.avatar || "",
  }));
  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Sincroniza quando o perfil muda (ex: após update ou recarregamento)
  useEffect(() => {
    if (!userProfile?.id) return;
    setForm({
      nome: userProfile.name || "",
      email: userProfile.email || "",
      telefone: formatPhone(userProfile.phone || userProfile.whatsapp || ""),
      cargo: userProfile.role || "",
      avatar: userProfile.avatar || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.id, userProfile?.avatar]);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.id) return;

    setIsUploading(true);
    try {
      const { uploadImage } = await import("@/lib/uploadImage");
      const url = await uploadImage(file, "avatares");

      if (url) {
        const { error } = await supabase
          .from("usuarios")
          .update({ avatar: url })
          .eq("id", userProfile.id);

        if (error) throw error;

        setForm(prev => ({ ...prev, avatar: url }));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        
        // Disparar evento para atualizar o perfil globalmente sem refresh
        window.dispatchEvent(new CustomEvent("carflax-profile-updated"));
      }
    } catch (err: unknown) {
      console.error("[Settings] Erro ao trocar foto:", err);
      const error = err as Error;
      if (error.message?.includes("Refresh Token Not Found")) {
        alert("Sua sessão expirou. Por favor, saia e entre novamente para continuar.");
      } else {
        alert("Erro ao enviar imagem. Verifique sua conexão ou tente novamente.");
      }
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSave() {
    if (!userProfile?.id) return;
    try {
      // 1. Salvar campos de texto no banco de dados
      const { error: dbError } = await supabase
        .from("usuarios")
        .update({
          name: form.nome,
          email: form.email,
          role: form.cargo,
        })
        .eq("id", userProfile.id);

      if (dbError) throw dbError;

      // 2. Salvar telefone/whatsapp no user_metadata do Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          phone: form.telefone,
          whatsapp: form.telefone,
        }
      });

      if (authError) throw authError;

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);

      // Disparar evento para atualizar o perfil globalmente sem refresh
      window.dispatchEvent(new CustomEvent("carflax-profile-updated"));
    } catch (err: unknown) {
      console.error("[Settings] Erro ao salvar dados do perfil:", err);
      const error = err as Error;
      alert(`Erro ao salvar dados do perfil: ${error.message || String(error)}`);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* SEÇÃO 1: PERFIL (HEADER) */}
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-[#E5E7EB] dark:border-white/10 rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar e Ação de Foto */}
          <div className="relative group shrink-0">
            <div className={cn(
              "w-28 h-28 rounded-2xl border-2 border-slate-100 dark:border-white/10 shadow-sm overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center transition-all group-hover:shadow-md relative",
              isUploading && "animate-pulse"
            )}>
              {isUploading && (
                <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <img
                src={form.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.name || 'User'}&backgroundColor=0053FC`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                alt="Avatar"
              />
            </div>
            {/* Badge de Verificado */}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg border-2 border-white dark:border-slate-900">
              <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
                {form.nome || "Usuário Carflax"}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center">
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {form.cargo}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-white/10" />
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  SÃO PAULO - MATRIZ
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Identificador interno verificado. Seu acesso de Administrador permite gerenciar todos os módulos do sistema Carflax com total autonomia.
            </p>
            
            <div className="flex justify-center md:justify-start pt-1">
              <label className={cn(
                "inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95",
                isUploading && "opacity-50 cursor-wait"
              )}>
                <Camera className="w-3.5 h-3.5" />
                {isUploading ? "ENVIANDO..." : "ALTERAR FOTO"}
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: DADOS PESSOAIS */}
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-[#E5E7EB] dark:border-white/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
        {/* Card Header com Título */}
        <div className="px-6 py-5 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20">
            <User className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">Informações pessoais</h4>
        </div>

        {/* Card Content (Grid de Inputs) */}
        <div className="p-6 md:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <SettingsInput 
              label="NOME COMPLETO" 
              value={form.nome} 
              onChange={(v) => setForm({ ...form, nome: v })} 
              icon={User} 
            />
            <SettingsInput 
              label="E-MAIL CORPORATIVO" 
              value={form.email} 
              onChange={(v) => setForm({ ...form, email: v })} 
              icon={Mail} 
              type="email" 
            />
            <SettingsInput 
              label="WHATSAPP / CELULAR" 
              value={form.telefone} 
              onChange={(v) => setForm({ ...form, telefone: formatPhone(v) })} 
              icon={Smartphone} 
              type="tel" 
            />
            <SettingsInput 
              label="CARGO / FUNÇÃO" 
              value={form.cargo} 
              onChange={(v) => setForm({ ...form, cargo: v })} 
              icon={Briefcase} 
            />
          </div>

          {/* Action Footer dentro do card */}
          <div className="pt-8 border-t border-slate-50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 max-w-[300px] text-center md:text-left">
              Mantenha seus dados atualizados para facilitar a comunicação interna.
            </p>
            <Button
              onClick={handleSave}
              className={cn(
                "h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 w-full md:w-auto",
                isSaved
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-[#2563EB] hover:bg-blue-700 text-white shadow-blue-600/20"
              )}
            >
              {isSaved ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> 
                  ALTERAÇÕES SALVAS
                </span>
              ) : (
                "SALVAR ALTERAÇÕES"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   NOTIFICAÇÕES
───────────────────────────────────────────── */
const notifSections = [
  {
    key: "alertas",
    icon: Bell,
    title: "Alertas Críticos",
    desc: "Notificações urgentes do sistema",
    color: "rose",
    items: [
      { key: "updates", label: "Atualizações de Segurança" },
      { key: "maintenance", label: "Manutenção do Servidor" },
      { key: "stalePedidos", label: "Pedido parado (Balcão 2 / Entrega)" },
    ],
  },
  {
    key: "crm",
    icon: MessageSquare,
    title: "Vendas & Comercial",
    desc: "Atividades comerciais e leads",
    color: "blue",
    items: [
      { key: "newLead", label: "Novos Orçamentos Criados" },
      { key: "dealClosed", label: "Negociações Finalizadas" },
      { key: "mentions", label: "Comentários em Chat" },
    ],
  },
  {
    key: "equipe",
    icon: Smartphone,
    title: "Comunicação Interna",
    desc: "Comunicados e avisos da equipe",
    color: "amber",
    items: [
      { key: "broadcast", label: "Novos Comunicados no Geral" },
      { key: "events", label: "Eventos do Calendário" },
    ],
  },
];

function NotificationsTab({ userProfile }: { userProfile?: UserProfile | null }) {
  const [state, setState] = useState<StateMap>(loadNotifState);
  const [responsibles, setResponsibles] = useState<LossResponsible[]>([]);
  const [loadingResp, setLoadingResp] = useState(true);
  const [savingResp, setSavingResp] = useState(false);
  const [savedResp, setSavedResp] = useState(false);

  const isManager = userProfile?.is_admin ||
    userProfile?.role?.toUpperCase().includes('ADMIN') ||
    userProfile?.role?.toUpperCase().includes('GERENTE');

  const [testingId, setTestingId] = useState<string | null>(null);

  async function handleTestMessage(resp: LossResponsible) {
    if (!resp.telefone || !resp.nome) return;
    setTestingId(resp.id);
    try {
      let phone = resp.telefone.replace(/\D/g, "");
      if (phone.length >= 10 && !phone.startsWith("55")) phone = "55" + phone;

      const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api-marketing";
      const BACKEND_URL = VITE_BACKEND_URL.startsWith("http") ? VITE_BACKEND_URL : window.location.origin + VITE_BACKEND_URL;
      const msg = [
        `Olá, *${resp.nome}*.`,
        ``,
        `✅ *MENSAGEM DE TESTE* ✅`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `📋 *Motivo:* ${resp.motivo}`,
        `📱 *Número:* ${phone}`,
        `━━━━━━━━━━━━━━━━━━━━━━━━`,
        `_Esta é uma mensagem de teste do Carflax HUB._`,
        `_Se você recebeu, as notificações estão funcionando!_`
      ].join('\n');

      const res = await fetch(`${BACKEND_URL}/api/whatsapp/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, text: msg }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("[Test] Resposta do servidor:", res.status, errorData);
      }
    } catch (err) {
      console.error("[Test] Erro ao enviar mensagem teste:", err);
    } finally {
      setTimeout(() => setTestingId(null), 2000);
    }
  }

  function toggle(section: string, item: string) {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], [item]: !prev[section][item] } }));
  }

  // Persiste as preferências de notificação (usadas, ex., pelo alerta de pedidos parados).
  useEffect(() => {
    try { localStorage.setItem("carflax_notif_prefs", JSON.stringify(state)); } catch { /* ignore */ }
  }, [state]);

  // Ao habilitar "Pedido parado", pede permissão de notificação do navegador.
  useEffect(() => {
    if (state.alertas?.stalePedidos && typeof Notification !== "undefined" && Notification.permission === "default") {
      Promise.resolve(Notification.requestPermission()).catch(() => {});
    }
  }, [state.alertas?.stalePedidos]);

  useEffect(() => {
    async function fetchResponsibles() {
      setLoadingResp(true);
      const { data } = await supabase
        .from("crm_config")
        .select("value")
        .eq("key", "crm_loss_responsibles")
        .maybeSingle();

      if (data?.value) {
        try {
          setResponsibles(JSON.parse(data.value));
        } catch (e) {
          console.error("Erro ao parsear crm_loss_responsibles:", e);
        }
      }
      setLoadingResp(false);
    }
    fetchResponsibles();
  }, []);

  async function handleSaveResponsibles() {
    setSavingResp(true);
    const { error } = await supabase
      .from("crm_config")
      .upsert([{ key: "crm_loss_responsibles", value: JSON.stringify(responsibles) }]);

    setSavingResp(false);
    if (!error) {
      setSavedResp(true);
      setTimeout(() => setSavedResp(false), 3000);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {notifSections.map(({ key, icon: Icon, title, desc, items, color }) => (
          <div key={key} className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-5 border-b border-slate-50 dark:border-white/5 bg-slate-50/30 dark:bg-white/[0.02] flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                color === 'rose' ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                  color === 'blue' ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">{title}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">{desc}</p>
              </div>
            </div>
            <div className="flex-1 p-5 space-y-4">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between group">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{item.label}</span>
                  <Toggle checked={state[key][item.key]} onChange={() => toggle(key, item.key)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Responsáveis por Notificações de Perda — apenas gerentes/admin */}
      {isManager && (
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-1">
                Responsáveis por Notificações de Perda
              </h5>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                Defina quem receberá alertas no WhatsApp de acordo com o motivo de perda do orçamento.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setResponsibles(prev => [
                ...prev,
                {
                  id: String(Date.now()),
                  motivo: "Todos os Motivos",
                  nome: "",
                  telefone: ""
                }
              ]);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar Responsável
          </button>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-slate-50/10 dark:bg-slate-900/10 shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10 select-none">
              <tr>
                <th className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] w-[35%]">Motivo de Perda</th>
                <th className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] w-[35%]">Nome do Responsável</th>
                <th className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] w-[20%]">WhatsApp (com DDD)</th>
                <th className="px-4 py-3.5 font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] text-center w-[10%]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {loadingResp ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider text-[9px] animate-pulse">
                    Carregando responsáveis...
                  </td>
                </tr>
              ) : responsibles.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider text-[9px]">
                    Nenhum responsável configurado. Os alertas de perda serão enviados apenas para o centralizador.
                  </td>
                </tr>
              ) : (
                responsibles.map((resp) => (
                  <tr key={resp.id} className="hover:bg-slate-50/30 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="px-3 py-2.5">
                      <select
                        value={resp.motivo}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResponsibles(prev => prev.map(r => r.id === resp.id ? { ...r, motivo: val } : r));
                        }}
                        className="w-full px-2.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/5 transition-all"
                      >
                        <option value="Todos os Motivos">Todos os Motivos</option>
                        <option value="Preço Alto">Preço Alto</option>
                        <option value="Falta de Estoque">Falta de Estoque</option>
                        <option value="Furo de Estoque">Furo de Estoque</option>
                        <option value="Desistiu">Desistiu</option>
                        <option value="Prazo de Entrega">Prazo de Entrega</option>
                        <option value="Mão de Obra e Material">Mão de Obra e Material</option>
                        <option value="Comparativo de Linhas">Comparativo de Linhas</option>
                        <option value="Alteração de Preço">Alteração de Preço</option>
                        <option value="Liberação Financeira">Liberação Financeira</option>
                      </select>
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={resp.nome}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResponsibles(prev => prev.map(r => r.id === resp.id ? { ...r, nome: val } : r));
                        }}
                        placeholder="Nome (ex: João do Estoque)"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <input
                        type="text"
                        value={resp.telefone}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResponsibles(prev => prev.map(r => r.id === resp.id ? { ...r, telefone: val } : r));
                        }}
                        placeholder="Ex: 5511999999999"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-blue-600/50 focus:ring-2 focus:ring-blue-600/5 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
                      />
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleTestMessage(resp)}
                          disabled={testingId === resp.id || !resp.telefone || !resp.nome}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            testingId === resp.id
                              ? "text-emerald-500 dark:text-emerald-400"
                              : "text-slate-400 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 hover:bg-blue-500/10"
                          )}
                          title="Enviar mensagem teste"
                        >
                          {testingId === resp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResponsibles(prev => prev.filter(r => r.id !== resp.id));
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-end">
          <Button
            onClick={handleSaveResponsibles}
            disabled={savingResp}
            className={cn(
              "h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95",
              savedResp ? "bg-emerald-600 text-white shadow-emerald-500/20" : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
            )}
          >
            {savingResp ? "Salvando..." : savedResp ? "Responsáveis Salvos!" : "Salvar Responsáveis"}
          </Button>
        </div>
      </div>
      )}
    </div>
  );
}

type StateMap = Record<string, Record<string, boolean>>;

function buildDefault(): StateMap {
  const s: StateMap = {};
  for (const sec of notifSections) {
    s[sec.key] = {};
    // "Pedido parado" começa desligado (é um alerta operacional que a pessoa habilita).
    for (const item of sec.items) s[sec.key][item.key] = item.key !== "stalePedidos";
  }
  return s;
}

/** Lê as preferências salvas por cima dos defaults (apenas chaves conhecidas). */
function loadNotifState(): StateMap {
  const def = buildDefault();
  try {
    const raw = localStorage.getItem("carflax_notif_prefs");
    if (!raw) return def;
    const saved = JSON.parse(raw);
    for (const sec of notifSections) {
      for (const item of sec.items) {
        const v = saved?.[sec.key]?.[item.key];
        if (typeof v === "boolean") def[sec.key][item.key] = v;
      }
    }
  } catch { /* usa defaults */ }
  return def;
}

/* ─────────────────────────────────────────────
   SEGURANÇA
───────────────────────────────────────────── */

function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const strength = getStrength(pw.next);
  const match = pw.next === pw.confirm && pw.next.length > 0;

  async function handleSave() {
    if (!pw.current || !pw.next || !match) return;
    setSaving(true);
    setErrorMsg("");

    try {
      // 1. Buscar e-mail do usuário logado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user?.email) {
        setErrorMsg("Não foi possível identificar seu usuário. Faça login novamente.");
        return;
      }

      // 2. Verificar a senha atual tentando um login silencioso
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pw.current,
      });

      if (signInError) {
        setErrorMsg("Senha atual incorreta. Verifique e tente novamente.");
        return;
      }

      // 3. Atualizar para a nova senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: pw.next,
      });

      if (updateError) {
        setErrorMsg("Erro ao atualizar a senha: " + updateError.message);
        return;
      }

      // 4. Sucesso
      setSaved(true);
      setPw({ current: "", next: "", confirm: "" });
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[Security] Erro ao trocar senha:", err);
      setErrorMsg("Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Pass Change Card - Centralizado/Destaque */}
        <div className="md:col-start-3 md:col-span-8 bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-[#E5E7EB] dark:border-white/10 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50 dark:border-white/5">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
              <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Segurança da Conta</h4>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Gerencie seu acesso e senha</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <h5 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4">Alterar Senha de Acesso</h5>
            
            <PasswordField label="Senha Atual" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} placeholder="••••••••" />
            <PasswordField label="Nova Senha" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} placeholder="Mínimo 8 caracteres" strength={strength} />
            <PasswordField label="Confirmar Nova Senha" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} placeholder="Repita a nova senha" />

            {pw.confirm.length > 0 && !match && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="text-[10px] font-black text-rose-600 uppercase">As senhas não coincidem</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400">{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-50 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 max-w-[300px] text-center md:text-left leading-relaxed">
              Recomendamos o uso de senhas fortes com números e símbolos.
            </p>
            <Button
              onClick={handleSave}
              disabled={!pw.current || !pw.next || !match || saving}
              className={cn(
                "h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl active:scale-95 w-full md:w-auto",
                saved
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30 disabled:shadow-none shadow-blue-600/20"
              )}
            >
              {saved ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4" /> 
                  SENHA ATUALIZADA
                </span>
              ) : saving ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>
                  ATUALIZANDO...
                </span>
              ) : (
                "ATUALIZAR SENHA"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────────
   APARÊNCIA
───────────────────────────────────────────── */
function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Theme Cards */}
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
            <Palette className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">Tema & Interface</h4>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Escolha sua experiência visual</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { key: "light", label: "Brilhante", icon: Sun, color: "text-amber-500 bg-amber-50" },
            { key: "dark", label: "Profundo", icon: Moon, color: "text-blue-600 bg-blue-50" },
            { key: "system", label: "Automático", icon: Monitor, color: "text-slate-500 bg-slate-50" },
          ].map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => setTheme(key as "light" | "dark" | "system")}
              className={cn(
                "relative flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all group",
                theme === key
                  ? "border-blue-600 bg-blue-50/20 dark:bg-blue-500/10 shadow-lg shadow-blue-600/10"
                  : "border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900/30 hover:border-slate-200 dark:hover:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
              )}
            >
              {theme === key && (
                <div className="absolute top-4 right-4 text-blue-600 animate-in zoom-in duration-300">
                  <div className="w-5 h-5 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                    <Check className="w-3 h-3 text-white" strokeWidth={4} />
                  </div>
                </div>
              )}
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm", color)}>
                <Icon className="w-8 h-8" />
              </div>
              <div className="text-center">
                <span className={cn("text-[11px] font-black uppercase tracking-widest block", theme === key ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-600")}>
                  {label}
                </span>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-1 uppercase opacity-60">Modo {key}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Area */}
      <div className="flex justify-end pt-4 pb-2 border-t border-slate-50 dark:border-white/5">
        <Button
          onClick={handleSave}
          className={cn(
            "h-12 px-12 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95",
            saved
              ? "bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20"
          )}
        >
          {saved ? <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Preferências Aplicadas</span> : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ORÇAMENTOS - CONFIGURAÇÕES
───────────────────────────────────────────── */
interface LossResponsible {
  id: string;
  motivo: string;
  nome: string;
  telefone: string;
}

function OrcamentosTab() {
  return (
    <div className="max-w-[800px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
            <FileBadge className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-2">Comunicações de Orçamentos</h4>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
              Cada vendedor agora tem seu próprio responsável, definido em Usuários → Editar Perfil → Responsável.
              As notificações e mensagens do chat de orçamentos são enviadas direto para ele, não existe mais um único centralizador global.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COMPONENTE PRINCIPAL (TINY REDESIGN)
───────────────────────────────────────────── */

export function SettingsSection({ externalTab, userProfile }: SettingsSectionProps) {
  const tabMap: Record<string, string> = {
    "Meu Perfil": "profile",
    "Config. Orçamentos": "orcamentos",
    "Notificações": "notifications",
    "Segurança": "security",
    "Aparência": "appearance",
    "Banners": "banners",
    "Configurações": "profile",
  };

  const resolvedTab = (externalTab && tabMap[externalTab]) || "profile";
  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] dark:bg-slate-950">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-10 scrollbar-hide">
        <div className="max-w-[1200px] mx-auto">
          {activeTab === "profile" && <ProfileTab userProfile={userProfile} />}
          {activeTab === "orcamentos" && <OrcamentosTab />}
          {activeTab === "notifications" && <NotificationsTab userProfile={userProfile} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "banners" && <BannersTab userProfile={userProfile} />}
        </div>
      </div>
    </div>
  );
}

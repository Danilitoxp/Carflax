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
  Plus
} from "lucide-react";

/* ─────────────────────────────────────────────
   BANNERS
   Gestão de imagens de topo e avisos
   ───────────────────────────────────────────── */
function BannersTab() {
  const [transitionEnabled, setTransitionEnabled] = useState(true);
  const [banners] = useState([
    { id: 1, title: "Banner Promoção Abril", url: "https://images.unsplash.com/photo-1549416805-0e6d62635928?q=80&w=1200", dims: "1800 x 600px" },
    { id: 2, title: "Aviso Nova Filial", url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1200", dims: "1800 x 600px" },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <ImageIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-2">Banners da Home</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Altere as imagens e efeitos de transição</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className={cn("w-4 h-4", transitionEnabled ? "text-blue-600" : "text-slate-300")} />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">Efeito Transição</span>
            </div>
            <Toggle checked={transitionEnabled} onChange={setTransitionEnabled} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {banners.map((b) => (
            <div key={b.id} className="group relative bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:border-blue-300 transition-all duration-300">
              <div className="aspect-[3/1] bg-slate-200 relative overflow-hidden">
                <img src={b.url} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button className="bg-white text-slate-900 hover:bg-slate-100 h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    SUBSTITUIR IMAGEM
                  </Button>
                </div>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{b.title}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Dimensões: {b.dims}</p>
                </div>
                <Button className="w-8 h-8 rounded-lg bg-white border border-slate-200 p-0 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all">
                  <ImageIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* ADD NEW CARD */}
          <button className="aspect-[3/1] md:aspect-auto flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300 transition-all group">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200 shadow-sm group-hover:shadow-md group-hover:scale-110 transition-all">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
            </div>
            <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-600 uppercase tracking-widest">Adicionar Banner</span>
          </button>
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
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out",
        checked ? "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]" : "bg-slate-200"
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
  icon: any;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5 px-0.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 opacity-80">{label}</label>
      <div className="relative group">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-600/50 focus:ring-4 focus:ring-blue-600/5 transition-all placeholder:text-slate-300 shadow-sm"
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
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
      <div className="relative group">
        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 shadow-sm"
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
          <span className="text-[9px] font-black text-slate-400 tracking-tighter ml-1 uppercase">
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
function ProfileTab() {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    cargo: "",
  });
  const [isSaved, setIsSaved] = useState(false);

  function handleSave() {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  return (
    <div className="max-w-[1000px] mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* SEÇÃO 1: PERFIL (HEADER) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar e Ação de Foto */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden bg-slate-50 flex items-center justify-center transition-all group-hover:shadow-md">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo&backgroundColor=0053FC"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                alt="Avatar"
              />
            </div>
            {/* Badge de Verificado */}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg border-2 border-white">
              <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                {form.nome}
              </h3>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start items-center">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {form.cargo}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  SÃO PAULO - MATRIZ
                </span>
              </div>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-xl">
              Identificador interno verificado. Seu acesso de Administrador permite gerenciar todos os módulos do sistema Carflax com total autonomia.
            </p>
            
            <div className="flex justify-center md:justify-start pt-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 cursor-pointer hover:bg-slate-100 transition-all shadow-sm active:scale-95">
                <Camera className="w-3.5 h-3.5" />
                ALTERAR FOTO
                <input type="file" className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO 2: DADOS PESSOAIS */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
        {/* Card Header com Título */}
        <div className="px-6 py-5 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
            <User className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Informações pessoais</h4>
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
              onChange={(v) => setForm({ ...form, telefone: v })} 
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
          <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-slate-400 max-w-[300px] text-center md:text-left">
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
    ],
  },
  {
    key: "crm",
    icon: MessageSquare,
    title: "Vendas & CRM",
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

function NotificationsTab() {
  const [state, setState] = useState<StateMap>(buildDefault);

  function toggle(section: string, item: string) {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], [item]: !prev[section][item] } }));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
      {notifSections.map(({ key, icon: Icon, title, desc, items, color }) => (
        <div key={key} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-5 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              color === 'rose' ? "bg-rose-50 text-rose-600" :
                color === 'blue' ? "bg-blue-50 text-blue-600" :
                  "bg-amber-50 text-amber-600"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{title}</p>
              <p className="text-[10px] text-slate-400 font-bold">{desc}</p>
            </div>
          </div>
          <div className="flex-1 p-5 space-y-4">
            {items.map((item) => (
              <div key={item.key} className="flex items-center justify-between group">
                <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                <Toggle checked={state[key][item.key]} onChange={() => toggle(key, item.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type StateMap = Record<string, Record<string, boolean>>;

function buildDefault(): StateMap {
  const s: StateMap = {};
  for (const sec of notifSections) {
    s[sec.key] = {};
    for (const item of sec.items) s[sec.key][item.key] = true;
  }
  return s;
}

/* ─────────────────────────────────────────────
   SEGURANÇA
───────────────────────────────────────────── */

function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [saved, setSaved] = useState(false);

  const strength = getStrength(pw.next);
  const match = pw.next === pw.confirm && pw.next.length > 0;

  function handleSave() {
    if (!pw.current || !pw.next || !match) return;
    setSaved(true);
    setPw({ current: "", next: "", confirm: "" });
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Pass Change Card - Centralizado/Destaque */}
        <div className="md:col-start-3 md:col-span-8 bg-white border border-[#E5E7EB] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
          <div className="flex items-center gap-4 mb-8 pb-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight">Segurança da Conta</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Gerencie seu acesso e senha</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Alterar Senha de Acesso</h5>
            
            <PasswordField label="Senha Atual" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} placeholder="••••••••" />
            <PasswordField label="Nova Senha" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} placeholder="Mínimo 8 caracteres" strength={strength} />
            <PasswordField label="Confirmar Nova Senha" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} placeholder="Repita a nova senha" />

            {pw.confirm.length > 0 && !match && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span className="text-[10px] font-black text-rose-600 uppercase">As senhas não coincidem</span>
              </div>
            )}
          </div>

          <div className="mt-10 pt-6 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-[10px] font-bold text-slate-400 max-w-[300px] text-center md:text-left leading-relaxed">
              Recomendamos o uso de senhas fortes com números e símbolos.
            </p>
            <Button
              onClick={handleSave}
              disabled={!pw.current || !pw.next || !match}
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
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
            <Palette className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-900 uppercase tracking-tight leading-none mb-2">Tema & Interface</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escolha sua experiência visual</p>
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
                  ? "border-blue-600 bg-blue-50/20 shadow-lg shadow-blue-600/10"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
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
                <span className={cn("text-[11px] font-black uppercase tracking-widest block", theme === key ? "text-blue-600" : "text-slate-400")}>
                  {label}
                </span>
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase opacity-60">Modo {key}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save Area */}
      <div className="flex justify-end pt-4 pb-2 border-t border-slate-50">
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
   COMPONENTE PRINCIPAL (TINY REDESIGN)
───────────────────────────────────────────── */
export function SettingsSection({ externalTab }: SettingsSectionProps) {
  const [activeTab, setActiveTab] = useState("profile");
  const [prevExternalTab, setPrevExternalTab] = useState(externalTab);

  if (externalTab !== prevExternalTab) {
    setPrevExternalTab(externalTab);
    if (externalTab) {
      const tabMap: Record<string, string> = {
        "Meu Perfil": "profile",
        "Notificações": "notifications",
        "Segurança": "security",
        "Aparência": "appearance",
        "Banners": "banners",
        "Configurações": "profile",
      };
      if (tabMap[externalTab]) {
        setActiveTab(tabMap[externalTab]);
      }
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] pt-4">
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 scrollbar-hide">
        <div className="max-w-6xl mx-auto">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "banners" && <BannersTab />}
        </div>
      </div>
    </div>
  );
}

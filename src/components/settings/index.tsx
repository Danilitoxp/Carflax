import { useState, useEffect } from "react";
import {
  User,
  ShieldCheck,
  Palette,
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
  Globe,
  Sun,
  Moon,
  LogOut,
  AlertTriangle,
  Check,
  Megaphone,
  Calendar,
  MessageSquare,
  Type,
  FileText,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-provider";

interface SettingsSectionProps {
  externalTab?: string;
}

/* ─────────────────────────────────────────────
   TOGGLE COMPONENT
───────────────────────────────────────────── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
        checked ? "bg-primary" : "bg-border"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────
   PASSWORD FIELD
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
    <div className="space-y-3">
      <label className="text-[11px] font-black text-primary uppercase tracking-[0.2em] ml-1">{label}</label>
      <div className="relative group">
        <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-14 pr-14 py-5 rounded-[1.5rem] bg-secondary/10 border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base font-bold text-foreground"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      {strength !== undefined && value.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all",
                n <= strength
                  ? strength <= 1 ? "bg-red-500" : strength === 2 ? "bg-orange-400" : strength === 3 ? "bg-yellow-400" : "bg-emerald-500"
                  : "bg-border"
              )}
            />
          ))}
          <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">
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
   PROFILE TAB
───────────────────────────────────────────── */
function ProfileTab() {
  const [form, setForm] = useState({
    nome: "Danilo Oliveira",
    email: "danilo@carflax.com.br",
    telefone: "+55 (11) 99999-9999",
    cargo: "Administrator",
    bio: "Responsável pela gestão de produtos e estratégia de crescimento da Carflax.",
  });
  const [isSaved, setIsSaved] = useState(false);

  function handleSave() {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }

  return (
    <div className="space-y-10 h-full flex flex-col">
      {/* Avatar */}
      <div className="flex flex-col md:flex-row items-center gap-10 border-b border-border/10 pb-10">
        <div className="relative group">
          <div className="w-36 h-36 rounded-full border-4 border-primary/20 p-1 bg-background shadow-2xl relative overflow-hidden">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Danilo&backgroundColor=0053FC"
              className="w-full h-full rounded-full object-cover"
              alt="Avatar"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px] rounded-full">
              <Camera className="text-white w-9 h-9" />
            </div>
          </div>
          <div className="absolute bottom-1 right-1 bg-primary text-white p-2 rounded-2xl shadow-lg border-4 border-card">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-center md:text-left space-y-2">
          <h3 className="text-3xl font-black text-foreground tracking-tight">{form.nome}</h3>
          <div className="flex flex-wrap gap-2 justify-center md:justify-start">
            <span className="bg-primary text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">{form.cargo}</span>
            <span className="bg-secondary text-muted-foreground font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">Matriz SP</span>
          </div>
          <p className="text-muted-foreground text-sm opacity-70">Sua conta Carflax está ativa e verificada.</p>
          <button className="text-xs font-bold text-primary hover:underline mt-1 transition-colors">Alterar foto de perfil</button>
        </div>
      </div>

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: "nome", label: "Nome Completo", icon: User, type: "text" },
          { key: "email", label: "E-mail Corporativo", icon: Mail, type: "email" },
          { key: "telefone", label: "WhatsApp / Telefone", icon: Smartphone, type: "tel" },
          { key: "cargo", label: "Cargo", icon: Briefcase, type: "text" },
        ].map(({ key, label, icon: Icon, type }) => (
          <div key={key} className="space-y-3">
            <label className="text-[11px] font-black text-primary uppercase tracking-[0.2em] ml-1">{label}</label>
            <div className="relative group">
              <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-secondary/10 border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base font-bold text-foreground"
              />
            </div>
          </div>
        ))}

        {/* Bio — full width */}
        <div className="space-y-3 md:col-span-2">
          <label className="text-[11px] font-black text-primary uppercase tracking-[0.2em] ml-1">Sobre mim</label>
          <div className="relative group">
            <FileText className="absolute left-5 top-5 w-5 h-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full pl-14 pr-6 py-5 rounded-[1.5rem] bg-secondary/10 border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-base font-bold text-foreground resize-none"
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right pr-1">{form.bio.length}/200 caracteres</p>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-8 border-t border-border/10 flex flex-col md:flex-row gap-4 items-center justify-between mt-auto">
        <div>
          <p className="text-muted-foreground text-[10px] uppercase font-black tracking-widest opacity-40 leading-none mb-1">Status da Segurança</p>
          <p className="text-emerald-500 text-xs font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Autenticação 2FA Ativa
          </p>
        </div>
        <Button
          onClick={handleSave}
          className={cn(
            "w-full md:w-auto px-12 py-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95",
            isSaved
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
          )}
        >
          {isSaved ? <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Configuração Atualizada</span> : "Confirmar Alterações"}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NOTIFICATIONS TAB
───────────────────────────────────────────── */
const notifSections = [
  {
    key: "sistema",
    icon: Bell,
    title: "Sistema",
    desc: "Atualizações e alertas da plataforma",
    items: [
      { key: "updates", label: "Atualizações da plataforma" },
      { key: "maintenance", label: "Manutenção programada" },
      { key: "features", label: "Novas funcionalidades" },
    ],
  },
  {
    key: "email",
    icon: Mail,
    title: "E-mail",
    desc: "Notificações enviadas ao seu e-mail",
    items: [
      { key: "weekly", label: "Relatório semanal" },
      { key: "mentions", label: "Menções e respostas" },
      { key: "tasks", label: "Tarefas atribuídas" },
    ],
  },
  {
    key: "push",
    icon: Smartphone,
    title: "Push",
    desc: "Alertas no dispositivo em tempo real",
    items: [
      { key: "messages", label: "Novas mensagens" },
      { key: "reminders", label: "Lembretes de agenda" },
      { key: "approvals", label: "Aprovações pendentes" },
    ],
  },
  {
    key: "crm",
    icon: MessageSquare,
    title: "CRM",
    desc: "Atividades relacionadas a clientes",
    items: [
      { key: "newLead", label: "Novo lead cadastrado" },
      { key: "dealClosed", label: "Negociação fechada" },
    ],
  },
  {
    key: "agenda",
    icon: Calendar,
    title: "Agenda",
    desc: "Compromissos e eventos",
    items: [
      { key: "eventReminder", label: "Lembrete de evento (1h antes)" },
      { key: "newEvent", label: "Evento criado por outro membro" },
    ],
  },
  {
    key: "campanhas",
    icon: Megaphone,
    title: "Campanhas",
    desc: "Resultados e status de campanhas",
    items: [
      { key: "start", label: "Início de campanha" },
      { key: "result", label: "Resultado disponível" },
    ],
  },
];

type StateMap = Record<string, Record<string, boolean>>;

function buildDefault(): StateMap {
  const s: StateMap = {};
  for (const sec of notifSections) {
    s[sec.key] = {};
    for (const item of sec.items) s[sec.key][item.key] = true;
  }
  return s;
}

function NotificationsTab() {
  const [state, setState] = useState<StateMap>(buildDefault);

  function toggle(section: string, item: string) {
    setState((prev) => ({ ...prev, [section]: { ...prev[section], [item]: !prev[section][item] } }));
  }

  function toggleAll(section: string, value: boolean) {
    const sec = notifSections.find((s) => s.key === section)!;
    const updated: Record<string, boolean> = {};
    for (const item of sec.items) updated[item.key] = value;
    setState((prev) => ({ ...prev, [section]: updated }));
  }

  return (
    <div className="space-y-4">
      {notifSections.map(({ key, icon: Icon, title, desc, items }) => {
        const allOn = items.every((i) => state[key][i.key]);
        const anyOn = items.some((i) => state[key][i.key]);

        return (
          <div key={key} className="rounded-[1.5rem] border border-border/50 overflow-hidden bg-secondary/5">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground uppercase tracking-tight">{title}</p>
                  <p className="text-xs text-muted-foreground font-medium">{desc}</p>
                </div>
              </div>
              <Toggle checked={allOn || anyOn} onChange={(v) => toggleAll(key, v)} />
            </div>
            {/* Items */}
            <div className="divide-y divide-border/20">
              {items.map((item) => (
                <div key={item.key} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/20 transition-colors">
                  <span className="text-sm font-semibold text-foreground/80">{item.label}</span>
                  <Toggle checked={state[key][item.key]} onChange={() => toggle(key, item.key)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECURITY TAB
───────────────────────────────────────────── */
const sessions = [
  { id: 1, device: "Chrome — Windows 11", icon: Monitor, location: "São Paulo, BR", time: "Agora", current: true },
  { id: 2, device: "Safari — iPhone 14", icon: Smartphone, location: "São Paulo, BR", time: "há 2 horas", current: false },
  { id: 3, device: "Firefox — Linux", icon: Globe, location: "Campinas, BR", time: "há 3 dias", current: false },
];

function SecurityTab() {
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [twoFactor, setTwoFactor] = useState(true);
  const [saved, setSaved] = useState(false);
  const [revokedSessions, setRevokedSessions] = useState<number[]>([]);

  const strength = getStrength(pw.next);
  const match = pw.next === pw.confirm && pw.next.length > 0;

  function handleSave() {
    if (!pw.current || !pw.next || !match) return;
    setSaved(true);
    setPw({ current: "", next: "", confirm: "" });
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-6 md:col-span-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Lock className="text-primary w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Alterar Senha</h4>
              <p className="text-muted-foreground text-sm font-medium">Última alteração há 45 dias</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PasswordField
              label="Senha Atual"
              value={pw.current}
              onChange={(v) => setPw({ ...pw, current: v })}
              placeholder="••••••••"
            />
            <PasswordField
              label="Nova Senha"
              value={pw.next}
              onChange={(v) => setPw({ ...pw, next: v })}
              placeholder="Mínimo 8 caracteres"
              strength={strength}
            />
            <PasswordField
              label="Confirmar Nova Senha"
              value={pw.confirm}
              onChange={(v) => setPw({ ...pw, confirm: v })}
              placeholder="Repita a nova senha"
            />
          </div>

          {pw.confirm.length > 0 && !match && (
            <div className="flex items-center gap-2 text-sm text-red-500 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              As senhas não coincidem
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={!pw.current || !pw.next || !match}
            className={cn(
              "px-10 py-6 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95",
              saved
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : "bg-primary hover:bg-primary/90 text-white disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            )}
          >
            {saved ? <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Senha Atualizada!</span> : "Atualizar Senha"}
          </Button>
        </div>

        {/* 2FA */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
            <ShieldCheck className="text-emerald-500 w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Login em 2 Etapas</h4>
            <p className="text-muted-foreground text-sm font-medium mt-1">O 2FA adiciona uma camada extra de proteção à sua conta.</p>
          </div>
          <div className="flex items-center justify-between bg-secondary/30 p-4 rounded-xl border border-border/30">
            <div>
              <p className={cn("text-sm font-black uppercase tracking-tight", twoFactor ? "text-emerald-600" : "text-muted-foreground")}>
                {twoFactor ? "Ativado" : "Desativado"}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {twoFactor ? "Sua conta está protegida" : "Ative para maior segurança"}
              </p>
            </div>
            <Toggle checked={twoFactor} onChange={setTwoFactor} />
          </div>
        </div>

        {/* Sessions */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Monitor className="text-primary w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Sessões Ativas</h4>
            <p className="text-muted-foreground text-sm font-medium mt-1">Dispositivos com acesso à sua conta agora.</p>
          </div>
          <div className="space-y-3">
            {sessions.map((s) => {
              const Icon = s.icon;
              const revoked = revokedSessions.includes(s.id);
              return (
                <div key={s.id} className={cn("flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/30 transition-all", revoked && "opacity-40")}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs font-bold text-foreground truncate">{s.device}</p>
                        {s.current && (
                          <span className="text-[9px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0">Esta</span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">{s.location} · {s.time}</p>
                    </div>
                  </div>
                  {!s.current && !revoked && (
                    <button
                      onClick={() => setRevokedSessions([...revokedSessions, s.id])}
                      className="flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-all uppercase shrink-0"
                    >
                      <LogOut className="w-3 h-3" />
                      Revogar
                    </button>
                  )}
                  {revoked && <span className="text-[10px] text-muted-foreground italic">Revogado</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   APPEARANCE TAB
───────────────────────────────────────────── */
const accentColors = [
  { key: "blue", label: "Azul Carflax", value: "#0053FC" },
  { key: "indigo", label: "Índigo", value: "#4F46E5" },
  { key: "violet", label: "Violeta", value: "#7C3AED" },
  { key: "emerald", label: "Esmeralda", value: "#059669" },
  { key: "rose", label: "Rosa", value: "#E11D48" },
  { key: "amber", label: "Âmbar", value: "#D97706" },
];

const densities = [
  { key: "compact", label: "Compacto", desc: "Mais itens visíveis" },
  { key: "default", label: "Padrão", desc: "Equilíbrio confortável" },
  { key: "relaxed", label: "Relaxado", desc: "Mais espaço entre elementos" },
];

const languages = [
  { key: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { key: "en-US", label: "English (US)", flag: "🇺🇸" },
  { key: "es-ES", label: "Español", flag: "🇪🇸" },
];

function AppearanceTab() {
  const { theme, setTheme } = useTheme();
  const [accent, setAccent] = useState("blue");
  const [fontSize, setFontSize] = useState("medium");
  const [language, setLanguage] = useState("pt-BR");
  const [density, setDensity] = useState("default");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-8">
      {/* Theme */}
      <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Sun className="text-primary w-6 h-6" />
          </div>
          <div>
            <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Tema</h4>
            <p className="text-muted-foreground text-sm font-medium">Claro, escuro ou automático pelo sistema</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { key: "light", label: "Claro", icon: Sun },
            { key: "dark", label: "Escuro", icon: Moon },
            { key: "system", label: "Sistema", icon: Monitor },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key as "light" | "dark" | "system")}
              className={cn(
                "relative flex flex-col items-center gap-3 p-5 rounded-[1.5rem] border-2 transition-all",
                theme === key
                  ? "border-primary bg-primary/5 shadow-[0_0_0_4px_rgba(0,83,252,0.1)]"
                  : "border-border bg-background hover:border-primary/30 hover:bg-secondary/30"
              )}
            >
              {theme === key && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", theme === key ? "bg-primary/15" : "bg-secondary")}>
                <Icon className={cn("w-6 h-6", theme === key ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className={cn("text-sm font-black uppercase tracking-tight", theme === key ? "text-primary" : "text-muted-foreground")}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Accent Color */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-primary" />
            </div>
            <div>
              <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Cor de Destaque</h4>
              <p className="text-muted-foreground text-sm font-medium">Cor de botões e seleções</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {accentColors.map(({ key, label, value }) => (
              <button
                key={key}
                onClick={() => setAccent(key)}
                title={label}
                className={cn(
                  "relative w-10 h-10 rounded-2xl transition-all border-2",
                  accent === key ? "border-foreground scale-110 shadow-lg" : "border-transparent hover:scale-105"
                )}
                style={{ backgroundColor: value }}
              >
                {accent === key && (
                  <Check className="absolute inset-0 m-auto w-4 h-4 text-white" strokeWidth={3} />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            {accentColors.find((c) => c.key === accent)?.label}
          </p>
        </div>

        {/* Font Size */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Type className="text-primary w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Tamanho da Fonte</h4>
              <p className="text-muted-foreground text-sm font-medium">Tamanho do texto na interface</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: "small", label: "Pequeno", size: "text-sm" },
              { key: "medium", label: "Médio", size: "text-base" },
              { key: "large", label: "Grande", size: "text-lg" },
            ].map(({ key, label, size }) => (
              <button
                key={key}
                onClick={() => setFontSize(key)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-[1.5rem] border-2 transition-all",
                  fontSize === key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                )}
              >
                <span className={cn(size, "font-black", fontSize === key ? "text-primary" : "text-muted-foreground")}>Aa</span>
                <span className={cn("text-[10px] font-black uppercase tracking-tight", fontSize === key ? "text-primary" : "text-muted-foreground")}>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Monitor className="text-primary w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Densidade</h4>
              <p className="text-muted-foreground text-sm font-medium">Espaçamento da interface</p>
            </div>
          </div>
          <div className="space-y-2">
            {densities.map(({ key, label, desc }) => (
              <button
                key={key}
                onClick={() => setDensity(key)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] border-2 transition-all text-left",
                  density === key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                )}
              >
                <div>
                  <p className={cn("text-sm font-black uppercase tracking-tight", density === key ? "text-primary" : "text-foreground")}>{label}</p>
                  <p className="text-xs text-muted-foreground font-medium">{desc}</p>
                </div>
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all", density === key ? "border-primary" : "border-border")}>
                  {density === key && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="p-8 rounded-[2rem] bg-secondary/5 border border-border/50 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Globe className="text-primary w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-foreground uppercase tracking-tight">Idioma</h4>
              <p className="text-muted-foreground text-sm font-medium">Idioma da plataforma</p>
            </div>
          </div>
          <div className="space-y-2">
            {languages.map(({ key, label, flag }) => (
              <button
                key={key}
                onClick={() => setLanguage(key)}
                className={cn(
                  "w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] border-2 transition-all",
                  language === key ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{flag}</span>
                  <span className={cn("text-sm font-black uppercase tracking-tight", language === key ? "text-primary" : "text-foreground")}>{label}</span>
                </div>
                {language === key && <Check className="w-5 h-5 text-primary" strokeWidth={2.5} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pt-2 pb-4">
        <Button
          onClick={handleSave}
          className={cn(
            "px-12 py-8 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-[0_15px_30px_-5px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95",
            saved
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
              : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
          )}
        >
          {saved ? <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Preferências Salvas!</span> : "Salvar Preferências"}
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export function SettingsSection({ externalTab }: SettingsSectionProps) {
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!externalTab) return;
    const tabMap: Record<string, string> = {
      "Meu Perfil": "profile",
      "Notificações": "notifications",
      "Segurança": "security",
      "Aparência": "appearance",
      "Configurações": "profile",
    };
    if (tabMap[externalTab]) setActiveTab(tabMap[externalTab]);
  }, [externalTab]);

  const tabLabel: Record<string, string> = {
    profile: "Meu Perfil",
    notifications: "Notificações",
    security: "Segurança",
    appearance: "Aparência",
  };

  return (
    <div className="flex flex-col h-full bg-background p-4 md:p-8 overflow-hidden">
      <div className="max-w-5xl mx-auto w-full h-full flex flex-col">

        {/* Header */}
        <div className="mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
          <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter">
            {tabLabel[activeTab] ?? externalTab}
          </h2>
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1 opacity-60">
            Gerencie sua conta e preferências do sistema
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] shadow-2xl overflow-y-auto scrollbar-hide p-8 md:p-12 relative animate-in fade-in zoom-in-95 duration-500">
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "appearance" && <AppearanceTab />}
        </div>
      </div>
    </div>
  );
}

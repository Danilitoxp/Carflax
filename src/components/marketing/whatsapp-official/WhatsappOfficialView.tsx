import { useState } from "react";
import {
  Shield,
  MessageSquare,
  LayoutTemplate,
  ListChecks,
  MousePointerClick,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Users,
  DollarSign,
  ArrowRight,
  Sparkles,
  Bot,
  ShoppingBag,
  CreditCard,
  Search,
  Paperclip,
  X,
  Flame,
  Smile,
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";

type OverlayPanel = null | "templates" | "interactive" | "flows" | "metrics" | "settings";

export function WhatsappOfficialView() {
  const [configStatus] = useState<"not_configured" | "pending" | "active">("not_configured");
  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>(null);
  const [selectedContact, setSelectedContact] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageText, setMessageText] = useState("");

  const isConfigured = configStatus === "active";

  if (!isConfigured) {
    return <SetupScreen onConfigure={() => setOverlayPanel("settings")} overlayPanel={overlayPanel} setOverlayPanel={setOverlayPanel} />;
  }

  const contacts = [
    { id: 1, name: "João Silva", lastMsg: "Preciso de 300m de fio 2,5mm", time: "08:32", unread: 2, temp: "Quente", online: true },
    { id: 2, name: "Maria Santos", lastMsg: "Qual o prazo de entrega?", time: "08:15", unread: 1, temp: "Morno", online: false },
    { id: 3, name: "Carlos Eng.", lastMsg: "Vou enviar a lista completa", time: "Ontem", unread: 0, temp: "Quente", online: false },
    { id: 4, name: "Ana Paula", lastMsg: "Obrigada pelo orçamento!", time: "Ontem", unread: 0, temp: "Frio", online: true },
    { id: 5, name: "Pedro Obras", lastMsg: "Tem disjuntor DIN 32A?", time: "25/05", unread: 0, temp: "Morno", online: false },
  ];

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selected = contacts.find(c => c.id === selectedContact);

  return (
    <div className="flex h-full bg-background overflow-hidden border border-border/50 rounded-2xl shadow-2xl m-4 relative">
      {/* Contact List */}
      <div className="w-80 border-r border-border/50 flex flex-col shrink-0 bg-card/30">
        {/* Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-xs font-black uppercase tracking-tight">Mensagens</h2>
                <span className="text-[9px] font-bold text-green-500 uppercase">API Oficial</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {[
                { icon: <LayoutTemplate className="w-3.5 h-3.5" />, panel: "templates" as OverlayPanel, title: "Templates" },
                { icon: <MousePointerClick className="w-3.5 h-3.5" />, panel: "interactive" as OverlayPanel, title: "Interativos" },
                { icon: <BarChart3 className="w-3.5 h-3.5" />, panel: "metrics" as OverlayPanel, title: "Métricas" },
                { icon: <Settings className="w-3.5 h-3.5" />, panel: "settings" as OverlayPanel, title: "Config" },
              ].map((item) => (
                <button
                  key={item.panel}
                  onClick={() => setOverlayPanel(overlayPanel === item.panel ? null : item.panel)}
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center transition-all",
                    overlayPanel === item.panel
                      ? "bg-green-600/10 text-green-600"
                      : "text-muted-foreground hover:bg-secondary"
                  )}
                  title={item.title}
                >
                  {item.icon}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full h-9 pl-9 pr-3 bg-secondary/50 border border-border/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 border-b border-border/30 transition-all text-left",
                selectedContact === contact.id
                  ? "bg-green-600/5 border-l-2 border-l-green-600"
                  : "hover:bg-secondary/30"
              )}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  {contact.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                {contact.online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold truncate">{contact.name}</span>
                    <Flame className={cn("w-3 h-3", contact.temp === "Quente" ? "text-rose-500" : contact.temp === "Morno" ? "text-amber-500" : "text-blue-500")} />
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{contact.time}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{contact.lastMsg}</p>
              </div>
              {contact.unread > 0 && (
                <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-white">{contact.unread}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-5 border-b border-border/50 flex items-center justify-between bg-card/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selected.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  {selected.online && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">{selected.name}</h3>
                  <span className="text-[10px] font-bold text-green-500 uppercase">
                    {selected.online ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TempBadge temp={selected.temp} />
                <button
                  onClick={() => setOverlayPanel("templates")}
                  className="h-8 px-3 bg-green-600/10 hover:bg-green-600/20 text-green-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  Template
                </button>
                <button
                  onClick={() => setOverlayPanel("interactive")}
                  className="h-8 px-3 bg-purple-600/10 hover:bg-purple-600/20 text-purple-600 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  Botões
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#0b141a]">
              <ChatBubble sender="contact" text="Boa tarde! Preciso de um orçamento para materiais elétricos." time="14:30" />
              <ChatBubble sender="me" text="Olá! Claro, posso ajudar. Qual tipo de material você precisa?" time="14:31" status="read" />
              <ChatBubble sender="contact" text="300 metros de fio flexível 2,5mm e disjuntores DIN." time="14:32" />
              <InteractivePreview />
              <ChatBubble sender="me" text="Perfeito! Vou preparar o orçamento. Qual o CEP de entrega?" time="14:35" status="delivered" />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border/50 bg-card/50 shrink-0">
              <div className="flex items-center gap-3">
                <button className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Smile className="w-4 h-4" />
                </button>
                <button className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <Paperclip className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Responda agora..."
                    className="w-full h-10 px-4 bg-secondary/30 border border-border/50 rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
                  />
                </div>
                <button className="w-10 h-10 rounded-xl bg-green-600 hover:bg-green-700 flex items-center justify-center text-white transition-colors">
                  {messageText.trim() ? <Send className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-green-600/10 rounded-3xl flex items-center justify-center mb-6">
              <Shield className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight mb-2">WhatsApp Business API</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Selecione uma conversa para começar ou envie um template para iniciar um novo contato.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <span className="text-[10px] font-black text-green-600 bg-green-600/10 px-3 py-1.5 rounded-full uppercase">Selo Verificado</span>
              <span className="text-[10px] font-black text-blue-600 bg-blue-600/10 px-3 py-1.5 rounded-full uppercase">Sem Risco de Ban</span>
              <span className="text-[10px] font-black text-purple-600 bg-purple-600/10 px-3 py-1.5 rounded-full uppercase">Botões Interativos</span>
            </div>
          </div>
        )}
      </div>

      {/* Overlay Panel */}
      {overlayPanel && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOverlayPanel(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-[500px] bg-card border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-tight">
                {overlayPanel === "templates" && "Templates de Mensagens"}
                {overlayPanel === "interactive" && "Mensagens Interativas"}
                {overlayPanel === "flows" && "WhatsApp Flows"}
                {overlayPanel === "metrics" && "Métricas e Custos"}
                {overlayPanel === "settings" && "Configuração da API"}
              </h2>
              <button onClick={() => setOverlayPanel(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {overlayPanel === "templates" && <TemplatesContent />}
              {overlayPanel === "interactive" && <InteractiveContent />}
              {overlayPanel === "flows" && <FlowsContent />}
              {overlayPanel === "metrics" && <MetricsContent />}
              {overlayPanel === "settings" && <SettingsContent />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TempBadge({ temp }: { temp: string }) {
  const colors = temp === "Quente"
    ? "text-rose-500 bg-rose-500/10 border-rose-500/20"
    : temp === "Morno"
    ? "text-amber-500 bg-amber-500/10 border-amber-500/20"
    : "text-blue-500 bg-blue-500/10 border-blue-500/20";
  return (
    <span className={cn("text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1", colors)}>
      <Flame className="w-3 h-3" /> {temp}
    </span>
  );
}

function ChatBubble({ sender, text, time, status }: { sender: "me" | "contact"; text: string; time: string; status?: string }) {
  return (
    <div className={cn("flex", sender === "me" ? "justify-end" : "justify-start")}>
      <div className={cn(
        "max-w-[65%] rounded-2xl px-4 py-2.5 shadow-sm",
        sender === "me" ? "bg-green-800/80 text-white" : "bg-[#1f2c34] text-white"
      )}>
        <p className="text-xs leading-relaxed">{text}</p>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[9px] opacity-60">{time}</span>
          {sender === "me" && status === "read" && <CheckCircle2 className="w-3 h-3 text-blue-400" />}
          {sender === "me" && status === "delivered" && <CheckCircle2 className="w-3 h-3 opacity-60" />}
        </div>
      </div>
    </div>
  );
}

function InteractivePreview() {
  return (
    <div className="flex justify-end">
      <div className="max-w-[65%] rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-green-800/80 px-4 py-2.5">
          <p className="text-xs text-white leading-relaxed">Que tipo de projeto é?</p>
        </div>
        <div className="space-y-0.5">
          {["Residencial", "Comercial / Obra", "Revenda"].map((btn, i) => (
            <button key={i} className="w-full py-2 bg-[#1f2c34] hover:bg-[#2a3942] transition-colors text-center">
              <span className="text-xs font-medium text-blue-400">{btn}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 px-4 py-1 bg-green-800/80">
          <span className="text-[9px] text-white/60">14:33</span>
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
        </div>
      </div>
    </div>
  );
}

/* ============================================
   SETUP SCREEN (when API is not configured)
   ============================================ */

function SetupScreen({ onConfigure, overlayPanel, setOverlayPanel }: {
  onConfigure: () => void;
  overlayPanel: OverlayPanel;
  setOverlayPanel: (p: OverlayPanel) => void;
}) {
  return (
    <div className="flex h-full bg-background overflow-hidden border border-border/50 rounded-2xl shadow-2xl m-4 relative">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div className="text-center pt-8">
            <div className="w-20 h-20 bg-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-600/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight">WhatsApp Business API</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
              API oficial da Meta — selo verificado, zero risco de ban, funcionalidades exclusivas.
              Configure suas credenciais para começar.
            </p>
            <div className="flex items-center justify-center gap-3 mt-4">
              <span className="text-[10px] font-black text-green-600 bg-green-600/10 px-3 py-1.5 rounded-full uppercase">1.000 conversas grátis/mês</span>
              <span className="text-[10px] font-black text-blue-600 bg-blue-600/10 px-3 py-1.5 rounded-full uppercase">Selo verificado</span>
              <span className="text-[10px] font-black text-purple-600 bg-purple-600/10 px-3 py-1.5 rounded-full uppercase">Sem risco de ban</span>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center">
            <button
              onClick={onConfigure}
              className="h-12 px-8 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-2xl transition-all flex items-center gap-3 shadow-lg shadow-green-600/20 hover:shadow-green-600/30"
            >
              <Settings className="w-5 h-5" />
              Configurar API Oficial
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {[
              { icon: <LayoutTemplate className="w-6 h-6" />, title: "Templates Aprovados", desc: "Follow-ups e promoções com mensagens pré-aprovadas. Sem risco de ban.", color: "bg-blue-500" },
              { icon: <MousePointerClick className="w-6 h-6" />, title: "Botões Interativos", desc: "Cliente escolhe opções com um toque: \"Ver Orçamento\", \"Catálogo\".", color: "bg-purple-500" },
              { icon: <ShoppingBag className="w-6 h-6" />, title: "Catálogo de Produtos", desc: "Produtos dentro do WhatsApp. Cliente navega e pede direto.", color: "bg-emerald-500" },
              { icon: <ListChecks className="w-6 h-6" />, title: "Flows (Formulários)", desc: "Cliente preenche dados sem sair do chat. Qualificação automática.", color: "bg-amber-500" },
              { icon: <Send className="w-6 h-6" />, title: "Disparo em Massa", desc: "Promoções para todos os leads quentes com template aprovado.", color: "bg-rose-500" },
              { icon: <Bot className="w-6 h-6" />, title: "Chatbot de Qualificação", desc: "Bot qualifica o lead antes de passar pro vendedor.", color: "bg-indigo-500", soon: true },
              { icon: <Users className="w-6 h-6" />, title: "Multi-Atendente", desc: "Vários vendedores no mesmo número, sem conflito.", color: "bg-teal-500" },
              { icon: <CreditCard className="w-6 h-6" />, title: "Pagamento no Chat", desc: "Cliente paga pelo WhatsApp (em breve no Brasil).", color: "bg-pink-500", soon: true },
            ].map((f, idx) => (
              <div key={idx} className={cn("bg-card border border-border rounded-2xl p-5 transition-all hover:shadow-md", f.soon && "opacity-60")}>
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-xl text-white shrink-0", f.color)}>{f.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold">{f.title}</h4>
                      {f.soon && <span className="text-[8px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase">Em breve</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Flow Example */}
          <div className="bg-card border border-border rounded-3xl p-8">
            <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-6">Exemplo: Fluxo de Lead via Anúncio</h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              {[
                { step: "1", label: "Lead clica no anúncio", sub: "Google / Meta Ads", color: "bg-blue-500" },
                { step: "2", label: "Recebe mensagem com botões", sub: "\"Residencial\" | \"Obra\" | \"Revenda\"", color: "bg-purple-500" },
                { step: "3", label: "Flow de qualificação", sub: "Produto, metragem, CEP", color: "bg-amber-500" },
                { step: "4", label: "Vendedor recebe lead pronto", sub: "Pronto p/ vender", color: "bg-emerald-500" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 flex-1">
                  <div className="flex flex-col items-center text-center flex-1">
                    <div className={cn("w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-black", item.color)}>{item.step}</div>
                    <p className="text-xs font-bold mt-2">{item.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</p>
                  </div>
                  {idx < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground/30 shrink-0 hidden md:block" />}
                </div>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h3 className="text-sm font-bold mb-4">Tabela de Preços (Brasil)</h3>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary/50">
                    <th className="text-left p-3 font-bold uppercase text-[10px]">Tipo</th>
                    <th className="text-left p-3 font-bold uppercase text-[10px]">Quem Inicia</th>
                    <th className="text-left p-3 font-bold uppercase text-[10px]">Custo</th>
                    <th className="text-left p-3 font-bold uppercase text-[10px]">Obs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr><td className="p-3 font-medium">Service</td><td className="p-3 text-muted-foreground">Cliente</td><td className="p-3 font-bold text-emerald-600">Grátis (1.000/mês)</td><td className="p-3 text-muted-foreground">24h</td></tr>
                  <tr><td className="p-3 font-medium">Utility</td><td className="p-3 text-muted-foreground">Empresa</td><td className="p-3 font-bold">~R$ 0,25</td><td className="p-3 text-muted-foreground">Confirmações</td></tr>
                  <tr><td className="p-3 font-medium">Marketing</td><td className="p-3 text-muted-foreground">Empresa</td><td className="p-3 font-bold">~R$ 0,50</td><td className="p-3 text-muted-foreground">Promoções</td></tr>
                  <tr><td className="p-3 font-medium">Click-to-WA</td><td className="p-3 text-muted-foreground">Anúncio</td><td className="p-3 font-bold text-emerald-600">Grátis (72h)</td><td className="p-3 text-muted-foreground">Meta Ads</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay Panel */}
      {overlayPanel && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setOverlayPanel(null)} />
          <div className="absolute right-0 top-0 bottom-0 w-[500px] bg-card border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 p-5 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-tight">Configuração da API</h2>
              <button onClick={() => setOverlayPanel(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <SettingsContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================
   OVERLAY PANELS CONTENT
   ============================================ */

function TemplatesContent() {
  const templates = [
    { name: "follow_up_orcamento", category: "UTILITY", status: "APPROVED", preview: "Olá {{1}}, seu orçamento de {{2}} ainda está válido! Deseja fechar?" },
    { name: "boas_vindas_lead", category: "MARKETING", status: "APPROVED", preview: "Olá {{1}}! Bem-vindo à Carflax. Como podemos ajudar?" },
    { name: "promo_material_eletrico", category: "MARKETING", status: "PENDING", preview: "Aproveite {{1}}% de desconto em materiais elétricos! Válido até {{2}}." },
    { name: "confirmacao_pedido", category: "UTILITY", status: "APPROVED", preview: "Pedido #{{1}} confirmado! Valor: R$ {{2}}. Previsão: {{3}}." },
  ];

  const statusMap: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    APPROVED: { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "Aprovado", icon: <CheckCircle2 className="w-3 h-3" /> },
    PENDING: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Pendente", icon: <Clock className="w-3 h-3" /> },
    REJECTED: { bg: "bg-rose-500/10", text: "text-rose-600", label: "Rejeitado", icon: <XCircle className="w-3 h-3" /> },
  };

  const catColors: Record<string, string> = {
    MARKETING: "text-purple-600 bg-purple-500/10",
    UTILITY: "text-blue-600 bg-blue-500/10",
  };

  return (
    <div className="space-y-4">
      <button className="w-full h-9 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5" /> Criar Template
      </button>
      <p className="text-[10px] text-muted-foreground">Templates precisam de aprovação da Meta (minutos a 24h). Use {"{{1}}"}, {"{{2}}"} para variáveis.</p>
      <div className="space-y-3">
        {templates.map((t, idx) => {
          const st = statusMap[t.status];
          return (
            <div key={idx} className="bg-secondary/30 border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <code className="text-[10px] font-mono font-bold bg-secondary px-2 py-0.5 rounded">{t.name}</code>
                  <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded", catColors[t.category])}>{t.category}</span>
                </div>
                <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded flex items-center gap-1", st.bg, st.text)}>
                  {st.icon} {st.label}
                </span>
              </div>
              <div className="bg-card rounded-lg p-2.5 border-l-3 border-green-500/30">
                <p className="text-[11px] text-muted-foreground italic">{t.preview}</p>
              </div>
              {t.status === "APPROVED" && (
                <button className="mt-2 h-7 px-3 bg-green-600/10 hover:bg-green-600/20 text-green-600 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors">
                  <Send className="w-3 h-3" /> Enviar para contato
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveContent() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
          <MousePointerClick className="w-4 h-4 text-purple-500" /> Botões de Resposta
        </h3>
        <div className="bg-[#0b141a] rounded-2xl p-4 space-y-1.5">
          <div className="bg-[#1f2c34] rounded-xl p-3 max-w-[85%]">
            <p className="text-xs text-white">Como posso ajudar? Escolha:</p>
          </div>
          {["Ver Orçamento", "Falar com Vendedor", "Ver Catálogo"].map((btn, i) => (
            <div key={i} className="bg-[#1f2c34] rounded-xl p-2 max-w-[85%] text-center">
              <span className="text-xs text-blue-400 font-medium">{btn}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">Máx. 3 botões. Cliente toca para responder.</p>
      </div>

      <div>
        <h3 className="text-xs font-bold mb-3 flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-amber-500" /> Lista de Opções
        </h3>
        <div className="bg-[#0b141a] rounded-2xl p-4 space-y-1.5">
          <div className="bg-[#1f2c34] rounded-xl p-3 max-w-[85%]">
            <p className="text-xs text-white">Qual categoria de produto?</p>
            <div className="mt-2 bg-green-600 rounded-lg p-1.5 text-center">
              <span className="text-[10px] text-white font-medium">Ver Categorias</span>
            </div>
          </div>
          <div className="bg-[#1f2c34] rounded-xl p-3 max-w-[85%] space-y-1">
            {["Fios e Cabos", "Disjuntores", "Iluminação", "Tomadas"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-white/5 last:border-0">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-green-500" />
                <span className="text-[10px] text-white">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">Até 10 opções em seções. Ideal para catálogo.</p>
      </div>
    </div>
  );
}

function FlowsContent() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Formulários dentro do chat. Ideal para qualificação e orçamentos rápidos.</p>
      <div className="space-y-3">
        {[
          { step: "Tela 1 — Tipo de Projeto", fields: ["Residencial / Comercial", "Reforma ou Obra Nova"], color: "border-blue-500/40" },
          { step: "Tela 2 — Produtos", fields: ["Categoria", "Metragem / Qtd", "Marca (opcional)"], color: "border-purple-500/40" },
          { step: "Tela 3 — Contato", fields: ["Nome completo", "CEP de entrega", "Prazo"], color: "border-emerald-500/40" },
        ].map((s, idx) => (
          <div key={idx} className={cn("bg-secondary/30 border-2 rounded-xl p-4", s.color)}>
            <span className="text-[9px] font-black text-muted-foreground uppercase">{s.step}</span>
            <div className="space-y-1.5 mt-2">
              {s.fields.map((f, i) => (
                <div key={i} className="bg-card rounded-lg p-2 border border-border/50">
                  <span className="text-[10px] text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsContent() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Conversas", value: "—", color: "bg-blue-500", icon: <MessageSquare className="w-4 h-4" /> },
          { label: "Service (Grátis)", value: "—", color: "bg-emerald-500", icon: <Users className="w-4 h-4" /> },
          { label: "Marketing", value: "—", color: "bg-purple-500", icon: <Send className="w-4 h-4" /> },
          { label: "Custo Est.", value: "—", color: "bg-amber-500", icon: <DollarSign className="w-4 h-4" /> },
        ].map((c, idx) => (
          <div key={idx} className="bg-secondary/30 border border-border rounded-xl p-4">
            <div className={cn("w-8 h-8 rounded-lg text-white flex items-center justify-center mb-2", c.color)}>{c.icon}</div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase">{c.label}</p>
            <p className="text-xl font-black mt-0.5">{c.value}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Dados disponíveis após configurar a API.</p>
    </div>
  );
}

function SettingsContent() {
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [wabaId, setWabaId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  return (
    <div className="space-y-5">
      <div className="space-y-4">
        {[
          { label: "Phone Number ID", value: phoneNumberId, set: setPhoneNumberId, placeholder: "Ex: 123456789012345", type: "text" },
          { label: "WABA ID", value: wabaId, set: setWabaId, placeholder: "Ex: 123456789012345", type: "text" },
          { label: "Access Token", value: accessToken, set: setAccessToken, placeholder: "Token permanente", type: "password" },
          { label: "Verify Token", value: verifyToken, set: setVerifyToken, placeholder: "Token do webhook", type: "text" },
        ].map((field, idx) => (
          <div key={idx}>
            <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">{field.label}</label>
            <input
              type={field.type}
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              className="w-full h-9 px-3 bg-secondary/50 border border-border rounded-xl text-xs outline-none focus:ring-2 focus:ring-green-500/20 transition-all"
            />
          </div>
        ))}
      </div>

      <div className="bg-secondary/30 rounded-xl p-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Webhook URL</p>
        <code className="text-[10px] font-mono text-foreground bg-secondary px-2 py-1 rounded block">
          https://seu-dominio.com/api/webhook/whatsapp-official
        </code>
      </div>

      <button className="w-full h-10 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
        <Shield className="w-4 h-4" /> Salvar e Conectar
      </button>

      <div className="border-t border-border pt-4">
        <h4 className="text-[10px] font-bold text-muted-foreground uppercase mb-3">Passo a passo</h4>
        <div className="space-y-2">
          {[
            "Crie conta no Meta Business Suite",
            "Verifique com CNPJ",
            "Registre um número na seção WhatsApp",
            "Crie app em developers.facebook.com",
            "Gere Access Token permanente",
            "Cole credenciais e configure webhook",
          ].map((step, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="w-5 h-5 bg-green-600/10 text-green-600 rounded flex items-center justify-center text-[9px] font-black shrink-0">{idx + 1}</span>
              <p className="text-[10px] text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

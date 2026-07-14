import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search, MoreVertical, MessageSquare, RefreshCw,
  Send, Paperclip, Mic, Smile, CheckCheck, Check,
  ArrowLeft, Phone, Circle, Lock, PenSquare,
} from "lucide-react";
import { evolutionGoApi } from "../../../lib/evolution-go";
import type { GoInstance, GoChat, GoMessage } from "../../../lib/evolution-go";
import { marketingService } from "../../../lib/marketing-service";
import { formatBrTime, BR_TIMEZONE } from "../../../lib/utils";
import { supabase } from "../../../lib/supabase";

interface WhatsappGoViewProps {
  vendedorId?: string;
  userProfile?: { id?: string; name: string; email?: string; role: string } | null;
}

type ConnState = "checking" | "disconnected" | "qr" | "connected";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts > 1e10 ? ts : ts * 1000);
  const now = new Date();
  if (d.toDateString() === now.toDateString())
    return formatBrTime(d);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: BR_TIMEZONE });
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function Avatar({ src, name, size = "md" }: { src?: string; name?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  if (src) return <img src={src} alt="" className={`${sz} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-muted flex items-center justify-center font-semibold text-muted-foreground flex-shrink-0`}>
      {getInitials(name)}
    </div>
  );
}

// ─── WA LOGO ─────────────────────────────────────────────────────────────────

function WaLogo({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 175.216 175.552" xmlns="http://www.w3.org/2000/svg">
      <path d="M87.6 0C39.3 0 0 39.3 0 87.6c0 15.3 4 29.8 11 42.3L0 175.6l47.1-12.3A87.3 87.3 0 0 0 87.6 175.2c48.3 0 87.6-39.3 87.6-87.6S135.9 0 87.6 0z" fill="hsl(var(--primary))" />
      <path d="M128.4 103.5c-2-1-11.7-5.8-13.5-6.4-1.8-.7-3.1-1-4.4 1-1.3 2-5 6.4-6.2 7.7-1.1 1.3-2.3 1.5-4.3.5-2-.9-8.5-3.1-16.2-10-6-5.3-10-11.9-11.2-13.9-1.2-2-.1-3.1.9-4 .9-.9 2-2.3 3-3.5 1-1.2 1.3-2 2-3.3.6-1.4.3-2.6-.2-3.5s-4.4-10.6-6-14.5c-1.6-3.8-3.2-3.3-4.4-3.4-1.1 0-2.4-.1-3.7-.1s-3.4.5-5.2 2.5c-1.7 2-6.7 6.5-6.7 15.9s6.8 18.5 7.8 19.8c.9 1.3 13.4 20.5 32.5 28.8 4.5 2 8.1 3.1 10.8 4 4.5 1.4 8.7 1.2 11.9.7 3.6-.5 11.1-4.5 12.7-8.9 1.6-4.4 1.6-8.1 1.1-8.9-.4-.8-1.7-1.3-3.7-2.2z" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

// ─── QR CODE SCREEN ──────────────────────────────────────────────────────────

function QrScreen({
  qrCode, qrExpiry, pairMode, pairCode, phone,
  onPhone, onRequestPair, onRefresh, onTogglePair, loading,
}: {
  qrCode: string; qrExpiry: number; pairMode: boolean; pairCode: string;
  phone: string; onPhone: (v: string) => void; onRequestPair: () => void;
  onRefresh: () => void; onTogglePair: () => void; loading: boolean;
}) {
  const expired = qrExpiry === 0;
  const pct = (qrExpiry / 60) * 100;

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/30 overflow-y-auto py-8">
      <div className="bg-background rounded-3xl shadow-2xl border border-border p-10 flex flex-col items-center gap-5 max-w-sm w-full mx-4">

        <WaLogo size={52} />

        <div className="text-center">
          <h2 className="text-xl font-light text-foreground tracking-tight">
            Use o WhatsApp no seu computador
          </h2>
          <p className="text-xs text-muted-foreground mt-1">via Evolution GO</p>
        </div>

        {!pairMode ? (
          <>
            {/* QR Code */}
            <div className="relative w-52 h-52 rounded-2xl overflow-hidden border border-border bg-background flex items-center justify-center">
              {loading || (!qrCode && !expired) ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-muted-foreground">Gerando QR code…</span>
                </div>
              ) : expired ? (
                <div className="absolute inset-0 bg-background/85 flex flex-col items-center justify-center gap-3 z-10">
                  <RefreshCw className="w-7 h-7 text-primary" />
                  <button onClick={onRefresh} className="text-sm font-medium text-primary hover:underline">
                    Clique para atualizar
                  </button>
                </div>
              ) : null}

              {qrCode && !loading && (
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code"
                  className={`w-full h-full object-contain p-2 transition-opacity ${expired ? "opacity-10" : "opacity-100"}`}
                />
              )}
            </div>

            {/* Expiry bar */}
            {qrCode && !expired && (
              <div className="w-52 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}

            {/* Steps */}
            <ol className="text-xs text-muted-foreground space-y-1.5 self-start w-full">
              {[
                "Abra o WhatsApp no seu celular",
                "Toque em Mais opções ou Configurações e selecione Aparelhos conectados",
                "Selecione Conectar um dispositivo",
                "Aponte seu celular para esta tela para capturar o código",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-semibold text-foreground flex-shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            <div className="w-full border-t border-border" />

            <button
              onClick={onTogglePair}
              className="text-sm font-medium text-primary hover:opacity-80 transition-opacity flex items-center gap-1.5"
            >
              <Phone className="w-4 h-4" />
              Conectar por número de telefone
            </button>
          </>
        ) : (
          /* Pair by phone */
          <>
            <p className="text-sm text-muted-foreground text-center">
              Digite o número de telefone para receber o código de vinculação.
            </p>

            {pairCode ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">Código de vinculação:</p>
                <div className="flex gap-2">
                  {pairCode.split("-").map((part, i) => (
                    <div key={i} className="bg-muted rounded-xl px-4 py-3 text-2xl font-mono font-bold tracking-wider text-foreground">
                      {part}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  No celular: Aparelhos conectados → Conectar com número → insira o código acima.
                </p>
              </div>
            ) : (
              <>
                <div className="w-full">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Número com DDI e DDD
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => onPhone(e.target.value)}
                    placeholder="+55 11 99999-9999"
                    className="w-full rounded-xl border border-border bg-muted text-foreground px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors placeholder:text-muted-foreground"
                    onKeyDown={e => e.key === "Enter" && onRequestPair()}
                  />
                </div>
                <button
                  onClick={onRequestPair}
                  disabled={!phone.trim()}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  Solicitar código
                </button>
              </>
            )}

            <button onClick={onTogglePair} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar para o QR code
            </button>
          </>
        )}

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Lock className="w-3 h-3" />
          <span>Mensagens protegidas com criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────

function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 border-b-4 border-primary">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-light text-foreground tracking-tight">WhatsApp Go</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Selecione um contato ou grupo para começar a conversar.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
          <Lock className="w-3 h-3" />
          <span>Criptografia de ponta a ponta</span>
        </div>
      </div>
    </div>
  );
}

// ─── CHAT ITEM ────────────────────────────────────────────────────────────────

function ChatItem({ chat, selected, onClick }: { chat: GoChat; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors border-b border-border/50 ${
        selected ? "bg-muted" : "hover:bg-muted/50"
      }`}
    >
      <Avatar src={chat.profilePicUrl} name={chat.name || chat.pushName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground truncate">
            {chat.name || chat.pushName || chat.jid.split("@")[0]}
          </span>
          {chat.lastMessageTime && (
            <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
              {formatTime(chat.lastMessageTime)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs text-muted-foreground truncate">{chat.lastMessage || " "}</span>
          {(chat.unreadCount || 0) > 0 && (
            <span className="ml-2 flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {chat.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MESSAGE BUBBLE ───────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: GoMessage }) {
  const isMe = msg.fromMe;
  const isFallbackText = ["Mídia", "📷 Imagem", "🖼️ Figurinha", "🎵 Áudio", "📎 Mídia", "📹 Vídeo"].includes(msg.text || "");

  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`max-w-[65%] rounded-2xl shadow-sm ${
        msg.type === "sticker"
          ? "bg-transparent shadow-none border-none"
          : isMe
          ? "bg-primary text-primary-foreground rounded-br-none"
          : "bg-card text-card-foreground border border-border rounded-bl-none"
      } ${msg.type === "document" ? "p-0 overflow-hidden" : (msg.type === "image" || msg.type === "sticker" || msg.type === "video") ? "p-1" : "px-3 py-1.5 text-sm"}`}>
        
        {/* Renderização de Imagem ou Figurinha */}
        {(msg.type === "image" || msg.type === "sticker") && msg.mediaUrl && (
          <img 
            src={msg.mediaUrl} 
            alt="Mídia" 
            className={`max-w-full rounded-lg max-h-60 object-contain my-1`} 
          />
        )}

        {/* Renderização de Vídeo */}
        {msg.type === "video" && msg.mediaUrl && (
          <video 
            src={msg.mediaUrl} 
            controls 
            className="max-w-full rounded-lg max-h-60 my-1" 
          />
        )}

        {/* Renderização de Áudio */}
        {msg.type === "audio" && msg.mediaUrl && (
          <audio 
            src={msg.mediaUrl} 
            controls 
            className={`max-w-full mt-1 mb-1 focus:outline-none ${isMe ? "brightness-200 invert-[0.1]" : ""}`} 
          />
        )}

        {/* Renderização de Documento */}
        {msg.type === "document" && msg.mediaUrl && (
          <a 
            href={msg.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 p-3 bg-black/10 dark:bg-white/10 rounded-lg hover:bg-black/20 dark:hover:bg-white/20 transition-colors mt-1 mb-1"
          >
            <Paperclip className="w-4 h-4 shrink-0" />
            <span className="truncate max-w-[200px] text-xs underline">
              {msg.filename || msg.text || "Documento"}
            </span>
          </a>
        )}

        {/* Texto do Chat (exibe apenas se não for o placeholder de mídia) */}
        {msg.text && (!isFallbackText || (!msg.mediaUrl && msg.type === "text")) && (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
        )}

        <div className="flex items-center justify-end gap-1 mt-0.5 opacity-70 text-[10px]">
          <span>{formatTime(msg.timestamp)}</span>
          {isMe && (
            msg.status === "read"
              ? <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
              : msg.status === "delivered"
              ? <CheckCheck className="w-3.5 h-3.5" />
              : <Check className="w-3.5 h-3.5" />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN VIEW ───────────────────────────────────────────────────────────────

export function WhatsappGoView({ vendedorId, userProfile }: WhatsappGoViewProps) {
  const [connState, setConnState] = useState<ConnState>("checking");
  const [qrCode, setQrCode] = useState("");
  const [qrExpiry, setQrExpiry] = useState(60);
  const [qrLoading, setQrLoading] = useState(false);
  const [pairMode, setPairMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [pairCode, setPairCode] = useState("");
  const [instance, setInstance] = useState<GoInstance | null>(null);
  const [chats, setChats] = useState<GoChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<GoChat | null>(null);
  const [messages, setMessages] = useState<GoMessage[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "groups">("all");
  const [sending, setSending] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expiryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Prevent React Strict Mode double-invocation from firing two concurrent inits
  const initializedRef = useRef(false);
  const localChatsRef = useRef<string[]>([]);

  const clearTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (qrRefreshRef.current) clearTimeout(qrRefreshRef.current);
    if (expiryRef.current) clearInterval(expiryRef.current);
  }, []);

  const instanceNameRef = useRef<string>("carflax");

  const resolveInstanceName = (inst: GoInstance) =>
    inst.instanceName || inst.name || inst.id || "carflax";

  const isConnected = (inst: GoInstance & { connected?: boolean }) =>
    Boolean(inst.connected ?? ["open", "connected"].includes(inst.status));

  const extractQr = (obj: Record<string, unknown>): string => {
    for (const key of ["Qrcode", "qrcode", "base64", "qr", "qr_code", "qrCode", "code", "pairingCode"]) {
      if (typeof obj[key] === "string" && (obj[key] as string).length > 10) return obj[key] as string;
    }
    for (const val of Object.values(obj)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        const nested = val as Record<string, unknown>;
        for (const key of ["Qrcode", "qrcode", "base64", "qr", "qr_code", "qrCode", "code"]) {
          if (typeof nested[key] === "string" && (nested[key] as string).length > 10) return nested[key] as string;
        }
      }
    }
    for (const val of Object.values(obj)) {
      if (typeof val === "string" && val.length > 100) return val;
    }
    return "";
  };

  const generateQr = useCallback(async () => {
    clearTimers();
    setQrLoading(true);
    setQrCode("");
    setQrExpiry(60);
    setConnState("qr");
    setPairMode(false);
    setPairCode("");

    try {
      console.log("[EvoGO] Chamando /instance/connect...");
      await evolutionGoApi.connectInstance({
        webhookUrl: `${import.meta.env.VITE_BACKEND_URL || "https://marketing-carflax.velbav.easypanel.host"}/webhook${vendedorId ? `?vendedor_id=${vendedorId}` : ""}`,
        subscribe: ["ALL", "MESSAGE", "CONNECTION", "QRCODE", "PRESENCE", "CHAT_PRESENCE", "READ_RECEIPT", "CALL"]
      });
    } catch (e) {
      console.warn("[EvoGO] connectInstance warning (esperado se já conectando):", e);
    }

    try {
      console.log("[EvoGO] Buscando QR em /instance/qr...");
      const qrRes = await evolutionGoApi.getQr();
      console.log("[EvoGO] /instance/qr response:", JSON.stringify(qrRes));
      const code = extractQr(qrRes);
      if (!code) console.warn("[EvoGO] QR não encontrado. Campos:", Object.keys(qrRes));
      setQrCode(code);
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      if (errMsg.toLowerCase().includes("already logged in") || errMsg.includes("session already")) {
        console.log("[EvoGO] Sessão já autenticada (/instance/qr retornou 400). Buscando instância...");
        clearTimers();
        setQrLoading(false);
        try {
          const all = await evolutionGoApi.getAllInstances();
          const active = all.find(i => ["open", "connected"].includes((i.status || "").toLowerCase()));
          if (active) setInstance(active);
        } catch (err) {
          console.warn("[EvoGO] Failed to get active instance on already logged in:", err);
        }
        setConnState("connected");
        return;
      }
      console.error("[EvoGO] getQr failed:", e);
      setQrCode("");
    } finally {
      setQrLoading(false);
    }

    expiryRef.current = setInterval(() => {
      setQrExpiry(prev => { if (prev <= 1) { clearInterval(expiryRef.current!); return 0; } return prev - 1; });
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const status = await evolutionGoApi.getStatus();
        const data = (status.data ?? status) as Record<string, unknown>;
        const isConn = Boolean(data.LoggedIn ?? data.loggedIn);
        if (isConn) {
          clearTimers();
          const nameStr = String(data.Name ?? data.name ?? "");
          const inst = { status: "open", phone: nameStr } as import("../../../lib/evolution-go").GoInstance;
          try {
            const all = await evolutionGoApi.getAllInstances();
            const active = all.find(isConnected);
            if (active) setInstance(active);
            else setInstance(inst);
          } catch { setInstance(inst); }
          setConnState("connected");
        }
      } catch {
        try {
          const all = await evolutionGoApi.getAllInstances();
          const active = all.find(isConnected);
          if (active) { clearTimers(); setInstance(active); setConnState("connected"); }
        } catch (err) {
          void err;
        }
      }
    }, 3000);
  }, [clearTimers, vendedorId]);

  const checkConnection = useCallback(async () => {
    setConnState("checking");
    let name = "carflax";

    try {
      const status = await evolutionGoApi.getStatus();
      const data = (status.data ?? status) as Record<string, unknown>;
      const isConn = Boolean(data.LoggedIn ?? data.loggedIn);
      if (isConn) {
        console.log("[EvoGO] checkConnection: já conectado via /instance/status");
        try {
          await evolutionGoApi.connectInstance({
            webhookUrl: `${import.meta.env.VITE_BACKEND_URL || "https://marketing-carflax.velbav.easypanel.host"}/webhook`,
            subscribe: ["ALL", "MESSAGE", "CONNECTION", "QRCODE", "PRESENCE", "CHAT_PRESENCE", "READ_RECEIPT", "CALL"]
          });
        } catch (err) {
          console.warn("[EvoGO] Erro ao sincronizar webhook na conexão ativa:", err);
        }
        const nameStr = String(data.Name ?? data.name ?? "");
        const inst = { status: "open", phone: nameStr } as import("../../../lib/evolution-go").GoInstance;
        try {
          const all = await evolutionGoApi.getAllInstances();
          const active = all.find(isConnected);
          if (active) setInstance(active);
          else setInstance(inst);
        } catch { setInstance(inst); }
        setConnState("connected");
        return;
      }
    } catch (err) {
      void err;
    }

    try {
      const raw = await evolutionGoApi.getAllInstances();
      const instances = Array.isArray(raw) ? raw : [];
      const active = instances.find(isConnected);
      if (active) {
        instanceNameRef.current = resolveInstanceName(active);
        setInstance(active);
        setConnState("connected");
        return;
      }
      if (instances.length > 0) {
        name = resolveInstanceName(instances[0]);
        instanceNameRef.current = name;
        generateQr();
        return;
      }
    } catch (err) {
      void err;
    }

    try {
      const created = await evolutionGoApi.createInstance(name);
      name = resolveInstanceName(created);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes("already exists")) {
        console.warn("[EvoGO] createInstance falhou inesperadamente:", msg);
      }
    }

    instanceNameRef.current = name;
    generateQr();
  }, [generateQr]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    checkConnection();
    return () => {
      clearTimers();
      initializedRef.current = false;
    };
  }, [checkConnection, clearTimers]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (qrExpiry === 0 && connState === "qr") {
      const t = setTimeout(() => generateQr(), 1500);
      return () => clearTimeout(t);
    }
  }, [qrExpiry, connState, generateQr]);

  useEffect(() => {
    if (connState !== "connected") return;
    let cancelled = false;

    const loadChats = async () => {
      try {
        const dbClientes = await marketingService.getActiveClientes('all', 100, 0, vendedorId);
        if (cancelled) return;

        const mapped: GoChat[] = dbClientes.map(c => ({
          jid: c.remote_jid,
          name: c.nome || c.push_name || c.remote_jid.split("@")[0],
          pushName: c.push_name || "",
          lastMessage: c.ultima_mensagem || "",
          lastMessageTime: c.ultima_conversa_em ? Math.floor(new Date(c.ultima_conversa_em).getTime() / 1000) : 0,
          unreadCount: c.mensagens_nao_lidas || 0,
          profilePicUrl: c.foto_url || "",
          isGroup: c.remote_jid.includes("@g.us"),
        }));

        const combined = [...mapped];
        localChatsRef.current.forEach(jid => {
          if (combined.some(c => c.jid.toLowerCase() === jid.toLowerCase())) return;
          combined.push({
            jid,
            name: jid.split("@")[0],
            pushName: "",
            lastMessage: "",
            lastMessageTime: 0,
            unreadCount: 0,
            profilePicUrl: "",
            isGroup: jid.includes("@g.us"),
          });
        });

        combined.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

        setChats(combined);
      } catch (e) {
        console.error("[EvoGO] Erro ao carregar contatos do Supabase:", e);
      }
    };

    loadChats();

    const channel = supabase
      .channel("official-whatsapp-go-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "marketing_whatsapp" },
        (payload) => {
          const row = payload.new as any;
          if (!row || cancelled) return;

          if (selectedChatRef.current && row.remote_jid === selectedChatRef.current.jid) {
            const newMsg: GoMessage = {
              id: row.message_id,
              remoteJid: row.remote_jid,
              fromMe: row.sender === "me",
              text: row.texto,
              type: row.tipo || "text",
              timestamp: Math.floor(new Date(row.timestamp).getTime() / 1000),
              status: row.status,
              mediaUrl: row.media_url || undefined,
            };

            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg].sort((a, b) => a.timestamp - b.timestamp);
            });
          }

          loadChats();
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "marketing_whatsapp" },
        (payload) => {
          const row = payload.new as any;
          if (!row || cancelled) return;

          setMessages(prev => prev.map(m => m.id === row.message_id ? { ...m, status: row.status } : m));
          loadChats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_clientes" },
        () => {
          if (!cancelled) loadChats();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [connState, vendedorId]);

  const selectedChatRef = useRef<GoChat | null>(null);
  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  useEffect(() => {
    if (!selectedChat) return;
    const interval = setInterval(async () => {
      try {
        const msgs = await evolutionGoApi.getMessages(selectedChatRef.current!.jid, 50, vendedorId);
        const sorted = msgs.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(prev => {
          const ids = new Set(prev.map(m => m.id));
          const newOnes = sorted.filter(m => !ids.has(m.id));
          return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
        });
      } catch (err) {
        console.error("[EvoGO] Messages polling error:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedChat, vendedorId]);

  const handleRequestPairCode = async () => {
    if (!phone.trim()) return;
    try {
      const res = await evolutionGoApi.requestPairCode(phone.replace(/\D/g, ""), instanceNameRef.current, vendedorId) as Record<string, unknown>;
      setPairCode(String(res.code || ""));
      pollRef.current = setInterval(async () => {
        try {
          const all = await evolutionGoApi.getAllInstances();
          const active = all.find(i => i.status === "open" || i.status === "connected");
          if (active) { clearTimers(); setInstance(active); setConnState("connected"); }
        } catch (err) {
          void err;
        }
      }, 3000);
    } catch (err) {
      console.error("[EvoGO] pair code flow error:", err);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !selectedChat || sending) return;
    setSending(true);
    const text = input.trim();
    setInput("");
    const optimistic: GoMessage = {
      id: `opt_${Date.now()}`, remoteJid: selectedChat.jid, fromMe: true,
      text, type: "text", timestamp: Math.floor(Date.now() / 1000), status: "sent",
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      await evolutionGoApi.sendText(selectedChat.jid, text);
    } catch (err) {
      console.error("[EvoGO] Failed to send text:", err);
    }
    setSending(false);
  };

  const filteredChats = chats.filter(c => {
    const q = search.toLowerCase();
    if (!(c.name || c.pushName || c.jid).toLowerCase().includes(q)) return false;
    if (filter === "unread") return (c.unreadCount || 0) > 0;
    if (filter === "groups") return !!c.isGroup;
    return true;
  });

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── LEFT PANEL — só aparece quando conectado ── */}
      {connState === "connected" && <div className="w-80 flex-shrink-0 flex flex-col border-r border-border">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
          <Avatar src={instance?.profilePicUrl} name={instance?.phone || userProfile?.name} size="md" />

          <div className="flex items-center gap-1">
            {/* Botão Nova Conversa */}
            <button
              onClick={() => setNewChatOpen(o => !o)}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
              title="Nova conversa"
            >
              <PenSquare className="w-4 h-4 text-muted-foreground" />
            </button>
            <Circle className={`w-2 h-2 fill-current ml-1 ${
              connState === "connected" ? "text-primary" :
              connState === "checking" ? "text-yellow-400 animate-pulse" : "text-muted-foreground"
            }`} />
            <span className="text-xs text-muted-foreground">
              {connState === "connected" ? (instance?.phone || "Conectado") :
               connState === "checking" ? "Verificando…" : "Desconectado"}
            </span>
            {connState !== "connected" && connState !== "checking" && (
              <button onClick={generateQr} className="p-1.5 rounded-full hover:bg-muted transition-colors" title="Novo QR">
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Nova Conversa — input dinâmico */}
        {newChatOpen && (
          <div className="px-3 py-2 border-b border-border flex gap-2">
            <input
              autoFocus
              value={newChatPhone}
              onChange={e => setNewChatPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="Telefone (DDD + número)"
              className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/40"
              onKeyDown={async e => {
                if (e.key !== "Enter" || !newChatPhone.trim()) return;
                const jid = `${newChatPhone.trim()}@s.whatsapp.net`;
                if (!localChatsRef.current.includes(jid)) {
                  localChatsRef.current.push(jid);
                }
                const chat: GoChat = { jid, name: newChatPhone.trim(), isGroup: false };
                setChats(prev => [chat, ...prev.filter(c => c.jid !== jid)]);
                setSelectedChat(chat);
                setMessages([]);
                setNewChatPhone("");
                setNewChatOpen(false);
              }}
            />
            <button
              onClick={() => { setNewChatOpen(false); setNewChatPhone(""); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >Cancelar</button>
          </div>
        )}

        {connState === "connected" && (
          <>
            {/* Search */}
            <div className="px-3 py-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Pesquisar conversa…"
                  className="w-full bg-muted rounded-lg pl-9 pr-4 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 px-3 py-2 border-b border-border">
              {(["all", "unread", "groups"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Todas" : f === "unread" ? "Não lidas" : "Grupos"}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto bg-background">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
              <MessageSquare className="w-10 h-10 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground text-center">
                {search ? "Nenhuma conversa encontrada." : "Aguardando sincronização…"}
              </p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <ChatItem
                key={chat.jid}
                chat={chat}
                selected={selectedChat?.jid === chat.jid}
                onClick={async () => {
                  setSelectedChat(chat);
                  setMessages([]);
                  try {
                    const msgs = await evolutionGoApi.getMessages(chat.jid, 50, vendedorId);
                    setMessages(msgs.sort((a, b) => a.timestamp - b.timestamp));
                  } catch (e) {
                    console.warn("[EvoGO] Não foi possível carregar mensagens:", e);
                  }
                }}
              />
            ))
          )}
        </div>
      </div>}

      {/* ── RIGHT PANEL ── */}
      {connState !== "connected" ? (
        <QrScreen
          qrCode={qrCode} qrExpiry={qrExpiry} pairMode={pairMode} pairCode={pairCode}
          phone={phone} onPhone={setPhone} onRequestPair={handleRequestPairCode}
          onRefresh={generateQr} onTogglePair={() => { setPairMode(p => !p); setPairCode(""); }}
          loading={qrLoading || connState === "checking"}
        />
      ) : !selectedChat ? (
        <WelcomeScreen />
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/50 border-b border-border flex-shrink-0">
            <button onClick={() => setSelectedChat(null)} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <Avatar src={selectedChat.profilePicUrl} name={selectedChat.name || selectedChat.pushName} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {selectedChat.name || selectedChat.pushName || selectedChat.jid.split("@")[0]}
              </p>
              <p className="text-xs text-muted-foreground">{selectedChat.isGroup ? "Grupo" : "online"}</p>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <Search className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="p-2 rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-muted/10">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="bg-muted text-muted-foreground text-xs rounded-xl px-4 py-2 shadow-sm text-center max-w-xs">
                  As mensagens são protegidas com criptografia de ponta a ponta.
                </div>
              </div>
            ) : (
              messages.map(msg => <MsgBubble key={msg.id} msg={msg} />)
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-t border-border flex-shrink-0">
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Smile className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-full hover:bg-muted transition-colors">
              <Paperclip className="w-6 h-6 text-muted-foreground" />
            </button>
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-2 flex items-center focus-within:border-primary/50 transition-colors">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Digite uma mensagem"
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none max-h-32"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={sending}
              className="p-2.5 rounded-full bg-primary hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {input.trim() ? (
                <Send className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

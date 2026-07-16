import { useState } from "react";
import { Plus, Trash2, Lock, Star, X, Check, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  type Evento, type EventoFornecedor, type FornecedorStatus, type Segmento,
  FORNECEDOR_STATUS_LABEL, FORNECEDOR_STATUS_COLOR, formatBRL,
} from "./types";
import { gerarConviteFornecedor } from "./convite-pdf";

const STATUS_ORDER: FornecedorStatus[] = ["nao_contatado", "media_kit_enviado", "follow_up", "confirmado", "recusado"];

// Checkbox de célula: o plano controla brindes/prêmio/promotor/estrutura como
// "entregou ou não", então cada um é um toggle direto na linha.
function CellCheck({ on, onToggle, title }: { on: boolean; onToggle: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={title}
      className={cn(
        "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
        on ? "bg-emerald-600 border-emerald-600 text-white" : "border-border hover:border-emerald-500 text-transparent"
      )}
    >
      <Check className="w-3 h-3" />
    </button>
  );
}

export function FornecedoresTab({ evento, fornecedores, onChange }: {
  evento: Evento;
  fornecedores: EventoFornecedor[];
  onChange: () => void;
}) {
  const [novaMarca, setNovaMarca] = useState("");
  const [novoSegmento, setNovoSegmento] = useState<Segmento>("hidraulico");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Cotas são negociadas individualmente e não devem circular entre marcas.
  // Some por padrão; quem precisa conferir clica para revelar.
  const [revelarCotas, setRevelarCotas] = useState(false);

  const patch = async (id: string, campos: Partial<EventoFornecedor>) => {
    setErro(null);
    const { error } = await supabase
      .from("evento_fornecedores")
      .update({ ...campos, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { setErro(error.message); return; }
    onChange();
  };

  const adicionar = async () => {
    const marca = novaMarca.trim();
    if (!marca) return;
    setSalvando(true);
    setErro(null);
    const { error } = await supabase.from("evento_fornecedores").insert([{
      evento_id: evento.id, marca, segmento: novoSegmento, status: "nao_contatado",
    }]);
    setSalvando(false);
    if (error) {
      setErro(error.code === "23505" ? `"${marca}" já está na lista.` : error.message);
      return;
    }
    setNovaMarca("");
    onChange();
  };

  const remover = async (f: EventoFornecedor) => {
    if (!confirm(`Remover "${f.marca}" da lista de fornecedores?`)) return;
    const { error } = await supabase.from("evento_fornecedores").delete().eq("id", f.id);
    if (error) { setErro(error.message); return; }
    onChange();
  };

  const confirmados = fornecedores.filter(f => f.status === "confirmado");
  const verbaConfirmada = confirmados.reduce((a, f) => a + Number(f.cota_valor || 0), 0);
  const verbaPaga = confirmados.filter(f => f.cota_paga).reduce((a, f) => a + Number(f.cota_valor || 0), 0);
  const premiosTotal = confirmados.filter(f => f.premio_valor).length;
  const premiosValor = confirmados.reduce((a, f) => a + Number(f.premio_valor || 0), 0);
  const pctVerba = evento.verba_meta > 0 ? (verbaConfirmada / evento.verba_meta) * 100 : 0;

  const hidraulicas = fornecedores.filter(f => f.segmento === "hidraulico").length;
  const eletricas = fornecedores.filter(f => f.segmento === "eletrico").length;

  return (
    <div className="space-y-6">
      {/* Resumo de verba */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Verba confirmada</span>
          <p className="text-xl font-black text-foreground tracking-tighter mt-1">{formatBRL(verbaConfirmada)}</p>
          <div className="h-1.5 w-full bg-secondary dark:bg-slate-800 rounded-full overflow-hidden border border-border mt-2">
            <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(pctVerba, 100)}%` }} />
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">
            {pctVerba.toFixed(0)}% da meta de {formatBRL(evento.verba_meta)}
          </span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Já recebida</span>
          <p className="text-xl font-black text-emerald-600 tracking-tighter mt-1">{formatBRL(verbaPaga)}</p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">
            Prazo: 30/08/2026
          </span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Marcas confirmadas</span>
          <p className="text-xl font-black text-foreground tracking-tighter mt-1">{confirmados.length}<span className="text-sm text-muted-foreground"> / 12</span></p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">
            {hidraulicas} hidráulica{hidraulicas === 1 ? "" : "s"} · {eletricas} elétrica{eletricas === 1 ? "" : "s"} cadastradas
          </span>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Prêmios de sorteio</span>
          <p className="text-xl font-black text-foreground tracking-tighter mt-1">{premiosTotal}<span className="text-sm text-muted-foreground"> / 12</span></p>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 block">
            {formatBRL(premiosValor)} em prêmios
          </span>
        </div>
      </div>

      {/* Adicionar marca */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Nova marca</label>
          <input
            value={novaMarca}
            onChange={e => setNovaMarca(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") adicionar(); }}
            placeholder="Nome do fornecedor"
            className="w-full px-3 py-2 text-xs font-bold bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Segmento</label>
          <select
            value={novoSegmento}
            onChange={e => setNovoSegmento(e.target.value as Segmento)}
            className="px-3 py-2 text-xs font-bold bg-background border border-border rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="hidraulico">Hidráulico</option>
            <option value="eletrico">Elétrico</option>
          </select>
        </div>
        <button
          onClick={adicionar}
          disabled={salvando || !novaMarca.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
        <button
          onClick={() => setRevelarCotas(v => !v)}
          className="ml-auto px-3 py-2 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1.5"
          title="As cotas são negociadas individualmente e ficam ocultas por padrão"
        >
          <Lock className="w-3.5 h-3.5" /> {revelarCotas ? "Ocultar cotas" : "Revelar cotas"}
        </button>
      </div>

      {erro && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">{erro}</span>
          <button onClick={() => setErro(null)}><X className="w-4 h-4 text-rose-500" /></button>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["Marca", "Segmento", "Status", "Cota", "Pago", "Prêmio", "Promotor", "Estrutura", "Convite", ""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fornecedores.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-12 text-center">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      Nenhuma marca cadastrada — o plano prevê 6 hidráulicas + 6 elétricas
                    </span>
                  </td>
                </tr>
              ) : fornecedores.map(f => (
                <tr key={f.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-foreground whitespace-nowrap">{f.marca}</span>
                      {f.apoio_master && (
                        <Star className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                      )}
                      {f.cota_confidencial && (
                        <Lock className="w-3 h-3 text-rose-500 shrink-0" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={f.segmento || ""}
                      onChange={e => patch(f.id, { segmento: (e.target.value || null) as Segmento })}
                      className="text-[10px] font-bold bg-transparent border border-border rounded-md px-1.5 py-1 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">—</option>
                      <option value="hidraulico">Hidráulico</option>
                      <option value="eletrico">Elétrico</option>
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={f.status}
                      onChange={e => patch(f.id, {
                        status: e.target.value as FornecedorStatus,
                        data_confirmacao: e.target.value === "confirmado" && !f.data_confirmacao
                          ? new Date().toISOString().slice(0, 10) : f.data_confirmacao,
                      })}
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wide border rounded-full px-2 py-1 focus:outline-none cursor-pointer",
                        FORNECEDOR_STATUS_COLOR[f.status]
                      )}
                    >
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{FORNECEDOR_STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    {revelarCotas ? (
                      <input
                        type="number"
                        defaultValue={Number(f.cota_valor) || 0}
                        onBlur={e => {
                          const v = parseFloat(e.target.value) || 0;
                          if (v !== Number(f.cota_valor)) patch(f.id, { cota_valor: v });
                        }}
                        className="w-24 px-2 py-1 text-[11px] font-black bg-transparent border border-border rounded-md focus:outline-none focus:border-blue-500"
                      />
                    ) : (
                      <button
                        onClick={() => setRevelarCotas(true)}
                        className="text-[11px] font-black text-muted-foreground hover:text-foreground tracking-widest"
                        title="Clique em 'Revelar cotas' para editar"
                      >
                        ••••••
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <CellCheck on={f.cota_paga} onToggle={() => patch(f.id, { cota_paga: !f.cota_paga })} title="Cota recebida" />
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      defaultValue={f.premio_descricao || ""}
                      onBlur={e => {
                        const v = e.target.value.trim() || null;
                        if (v !== f.premio_descricao) patch(f.id, { premio_descricao: v });
                      }}
                      placeholder="—"
                      className="w-32 px-2 py-1 text-[11px] font-bold bg-transparent border border-border rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        defaultValue={f.promotor_nome || ""}
                        onBlur={e => {
                          const v = e.target.value.trim() || null;
                          if (v !== f.promotor_nome) patch(f.id, { promotor_nome: v });
                        }}
                        placeholder="—"
                        className="w-28 px-2 py-1 text-[11px] font-bold bg-transparent border border-border rounded-md focus:outline-none focus:border-blue-500"
                      />
                      <CellCheck on={f.promotor_confirmado} onToggle={() => patch(f.id, { promotor_confirmado: !f.promotor_confirmado })} title="Promotor confirmado (7h–10h)" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <CellCheck on={f.estrutura_ok} onToggle={() => patch(f.id, { estrutura_ok: !f.estrutura_ok })} title="Banner/stand confirmado" />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => gerarConviteFornecedor(evento, f)}
                      title={`Baixar convite de ${f.marca} (PDF) — contém a cota negociada com esta marca`}
                      className="px-2 py-1 rounded-md border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:border-blue-500 hover:text-blue-600 transition-all flex items-center gap-1 whitespace-nowrap"
                    >
                      <FileDown className="w-3 h-3" /> PDF
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={() => remover(f)} className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors" title="Remover">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-rose-500" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] font-bold text-muted-foreground leading-relaxed">
        <Lock className="w-3 h-3 inline mr-1 text-rose-500" />
        Cota marcada com cadeado é negociada individualmente e não deve ser citada a outros fornecedores.
        Se questionado: “cada parceiro tem condição negociada individualmente”.
      </p>
    </div>
  );
}

import { useState, useEffect } from "react";
import {
  X, RotateCcw, Plus, Trash2, Pencil,
  Sparkles, CheckSquare, Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  type DemandaRecorrente,
  DIAS_SEMANA_LABELS,
  loadDemandasRecorrentesLocal,
  saveDemandasRecorrentesLocal,
} from "./recorrentes-utils";

interface DemandasRecorrentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onGerarCardManual: (rotina: DemandaRecorrente) => void;
  onUpdateRotinas?: () => void;
}

export function DemandasRecorrentesModal({
  isOpen,
  onClose,
  userId,
  onGerarCardManual,
  onUpdateRotinas,
}: DemandasRecorrentesModalProps) {
  const [rotinas, setRotinas] = useState<DemandaRecorrente[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRotina, setEditingRotina] = useState<Partial<DemandaRecorrente>>({
    tipo: "diario",
    dias_semana: [1, 2, 3, 4, 5],
    tag_name: "Média",
    active: true,
    subtasks: [],
  });
  const [newSubtask, setNewSubtask] = useState("");

  const carregarRotinas = async () => {
    try {
      const { data, error } = await supabase
        .from("marketing_demandas_recorrentes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setRotinas(data);
        saveDemandasRecorrentesLocal(data);
      } else {
        const local = loadDemandasRecorrentesLocal();
        setRotinas(local);
      }
    } catch {
      setRotinas(loadDemandasRecorrentesLocal());
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarRotinas();
    }
  }, [isOpen]);

  const salvarRotina = async () => {
    if (!editingRotina.title?.trim()) return;

    const nova: DemandaRecorrente = {
      id: editingRotina.id || `rotina-${Date.now()}`,
      title: editingRotina.title.trim(),
      description: editingRotina.description || "",
      tipo: editingRotina.tipo || "diario",
      dias_semana: editingRotina.dias_semana || [],
      dia_semana_especifico: editingRotina.dia_semana_especifico || 1,
      dia_mes_especifico: editingRotina.dia_mes_especifico || 1,
      tag_name: editingRotina.tag_name || "Média",
      subtasks: editingRotina.subtasks || [],
      owner_id: userId || null,
      active: editingRotina.active ?? true,
      last_generated_date: editingRotina.last_generated_date,
    };

    const atualizadas = editingRotina.id
      ? rotinas.map((r) => (r.id === nova.id ? nova : r))
      : [nova, ...rotinas];

    setRotinas(atualizadas);
    saveDemandasRecorrentesLocal(atualizadas);

    try {
      await supabase.from("marketing_demandas_recorrentes").upsert(nova);
    } catch (e) {
      console.warn("Supabase upsert fallback to localStorage:", e);
    }

    setIsEditing(false);
    setEditingRotina({
      tipo: "diario",
      dias_semana: [1, 2, 3, 4, 5],
      tag_name: "Média",
      active: true,
      subtasks: [],
    });
    if (onUpdateRotinas) onUpdateRotinas();
  };

  const toggleActiveRotina = async (rotina: DemandaRecorrente) => {
    const atualizada = { ...rotina, active: !rotina.active };
    const novas = rotinas.map((r) => (r.id === rotina.id ? atualizada : r));
    setRotinas(novas);
    saveDemandasRecorrentesLocal(novas);

    try {
      await supabase
        .from("marketing_demandas_recorrentes")
        .update({ active: atualizada.active })
        .eq("id", rotina.id);
    } catch {
      // localStorage backup handled
    }
    if (onUpdateRotinas) onUpdateRotinas();
  };

  const excluirRotina = async (id: string) => {
    const novas = rotinas.filter((r) => r.id !== id);
    setRotinas(novas);
    saveDemandasRecorrentesLocal(novas);

    try {
      await supabase.from("marketing_demandas_recorrentes").delete().eq("id", id);
    } catch {
      // localStorage backup handled
    }
    if (onUpdateRotinas) onUpdateRotinas();
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setEditingRotina((prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSubtask.trim()],
    }));
    setNewSubtask("");
  };

  const handleRemoveSubtask = (idx: number) => {
    setEditingRotina((prev) => ({
      ...prev,
      subtasks: (prev.subtasks || []).filter((_, i) => i !== idx),
    }));
  };

  const toggleDiaSemanaSelect = (val: number) => {
    const atuais = editingRotina.dias_semana || [];
    const novo = atuais.includes(val)
      ? atuais.filter((d) => d !== val)
      : [...atuais, val];
    setEditingRotina((prev) => ({ ...prev, dias_semana: novo }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                Automação da Esteira
              </span>
              <h2 className="text-base font-black text-foreground leading-tight mt-0.5">
                Demandas Fixas & Rotinas de Marketing
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {isEditing ? (
            /* Formulário de Criar/Editar Rotina */
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  {editingRotina.id ? "Editar Modelo de Rotina" : "Nova Rotina Recorrente"}
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-xs text-muted-foreground hover:text-foreground font-bold"
                >
                  Voltar para lista
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Título da Demanda *
                </label>
                <input
                  type="text"
                  value={editingRotina.title || ""}
                  onChange={(e) => setEditingRotina((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: 💬 Atendimento & Redirecionamento de Leads"
                  className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Descrição / Instruções da Demanda
                </label>
                <textarea
                  value={editingRotina.description || ""}
                  onChange={(e) => setEditingRotina((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Instruções ou detalhes de como realizar a tarefa..."
                  rows={2}
                  className="w-full p-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 font-medium resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Prioridade / Tag
                </label>
                <select
                  value={editingRotina.tag_name || "Média"}
                  onChange={(e) => setEditingRotina((p) => ({ ...p, tag_name: e.target.value }))}
                  className="w-full px-3 h-10 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none"
                >
                  <option value="Urgente">🚨 Urgente</option>
                  <option value="Alta">🔥 Alta</option>
                  <option value="Média">⚡ Média</option>
                  <option value="Baixa">🟢 Baixa</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Padrão de Repetição (Frequência)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRotina((p) => ({ ...p, tipo: "diario" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-center",
                      editingRotina.tipo === "diario"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    ☀️ Diário
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingRotina((p) => ({ ...p, tipo: "dias_semana" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-center",
                      editingRotina.tipo === "dias_semana"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    📅 Dias da Semana
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingRotina((p) => ({ ...p, tipo: "semanal" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-center",
                      editingRotina.tipo === "semanal"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    📆 Semanal
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingRotina((p) => ({ ...p, tipo: "mensal" }))}
                    className={cn(
                      "p-2.5 rounded-xl border text-xs font-black uppercase tracking-wider transition-all text-center",
                      editingRotina.tipo === "mensal"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 border-border/60 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    🗓️ Mensal
                  </button>
                </div>
              </div>

              {/* Opções específicas de dia */}
              {editingRotina.tipo === "dias_semana" && (
                <div className="bg-secondary/30 border border-border/60 rounded-2xl p-3 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Selecione os dias que a tarefa deve voltar:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA_LABELS.map((d) => {
                      const sel = (editingRotina.dias_semana || []).includes(d.val);
                      return (
                        <button
                          key={d.val}
                          type="button"
                          onClick={() => toggleDiaSemanaSelect(d.val)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                            sel
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editingRotina.tipo === "semanal" && (
                <div className="bg-secondary/30 border border-border/60 rounded-2xl p-3 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Selecione o dia da semana:
                  </span>
                  <select
                    value={editingRotina.dia_semana_especifico ?? 1}
                    onChange={(e) =>
                      setEditingRotina((p) => ({
                        ...p,
                        dia_semana_especifico: Number(e.target.value),
                      }))
                    }
                    className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none"
                  >
                    {DIAS_SEMANA_LABELS.map((d) => (
                      <option key={d.val} value={d.val}>
                        Toda {d.full}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingRotina.tipo === "mensal" && (
                <div className="bg-secondary/30 border border-border/60 rounded-2xl p-3 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                    Selecione o dia do mês (1 a 31):
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editingRotina.dia_mes_especifico ?? 1}
                    onChange={(e) =>
                      setEditingRotina((p) => ({
                        ...p,
                        dia_mes_especifico: Number(e.target.value),
                      }))
                    }
                    className="w-full pl-3 pr-3 h-10 rounded-xl border border-border bg-card text-xs font-bold text-foreground outline-none"
                  />
                </div>
              )}

              {/* Subtarefas / Checklist */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block mb-1">
                  Checklist Pré-configurado (Subtarefas)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
                    placeholder="Adicionar item de checklist..."
                    className="flex-1 pl-3 pr-3 h-9 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubtask}
                    className="px-3 h-9 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center gap-1 border border-border"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar
                  </button>
                </div>

                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {(editingRotina.subtasks || []).map((st, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-xl bg-secondary/40 border border-border/40 text-xs font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5 text-primary" />
                        {st}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubtask(i)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Footer for Form */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={salvarRotina}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity"
                >
                  Salvar Rotina
                </button>
              </div>
            </div>
          ) : (
            /* Lista de Rotinas Configuradas */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">
                    Estas demandas serão geradas automaticamente na coluna **"A Fazer"** da sua Esteira.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingRotina({
                      tipo: "diario",
                      dias_semana: [1, 2, 3, 4, 5],
                      tag_name: "Média",
                      active: true,
                      subtasks: [],
                    });
                    setIsEditing(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Nova Rotina
                </button>
              </div>

              {rotinas.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground space-y-2 bg-secondary/30 rounded-3xl border border-border/60">
                  <RotateCcw className="w-8 h-8 opacity-30 mx-auto" />
                  <p className="text-xs font-black uppercase tracking-wider">
                    Nenhuma rotina cadastrada
                  </p>
                  <p className="text-xs">
                    Clique no botão acima para cadastrar a primeira tarefa recorrente.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rotinas.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card",
                        r.active ? "border-border/80 shadow-xs" : "border-border/40 opacity-60 bg-secondary/20"
                      )}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-foreground leading-tight">
                            {r.title}
                          </h4>
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border",
                              r.tipo === "diario"
                                ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                : r.tipo === "dias_semana"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-violet-500/10 text-violet-500 border-violet-500/20"
                            )}
                          >
                            {r.tipo === "diario" && "☀️ Diário"}
                            {r.tipo === "dias_semana" &&
                              `📅 ${(r.dias_semana || [])
                                .map((d) => DIAS_SEMANA_LABELS.find((l) => l.val === d)?.short)
                                .join(", ")}`}
                            {r.tipo === "semanal" &&
                              `📆 Toda ${
                                DIAS_SEMANA_LABELS.find((l) => l.val === r.dia_semana_especifico)?.full ||
                                "Segunda"
                              }`}
                            {r.tipo === "mensal" && `🗓️ Todo dia ${r.dia_mes_especifico || 1}`}
                          </span>
                        </div>

                        {r.description && (
                          <p className="text-xs text-muted-foreground truncate">{r.description}</p>
                        )}

                        {r.subtasks && r.subtasks.length > 0 && (
                          <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                            <CheckSquare className="w-3 h-3 text-primary" />
                            {r.subtasks.length} itens no checklist
                          </p>
                        )}
                      </div>

                      {/* Action buttons per rotina */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleActiveRotina(r)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-colors",
                            r.active
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-secondary text-muted-foreground border-border"
                          )}
                        >
                          {r.active ? "Ativa" : "Pausada"}
                        </button>

                        <button
                          onClick={() => {
                            setEditingRotina(r);
                            setIsEditing(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors border border-border/50"
                          title="Editar modelo de rotina"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onGerarCardManual(r)}
                          className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider transition-colors border border-primary/20 flex items-center gap-1"
                          title="Gerar este card agora na coluna A Fazer"
                        >
                          <Play className="w-3 h-3" /> Gerar Agora
                        </button>

                        <button
                          onClick={() => excluirRotina(r.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-colors"
                          title="Excluir rotina"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-secondary/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            As tarefas ativas são verificadas automaticamente a cada acesso à Esteira.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  Panel,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
}

interface OrgNodeData extends Record<string, unknown> {
  title: string;
  level: 'A' | 'B' | 'C' | 'D';
  color: string;
  description: string;
  employees: Employee[];
}

// --- Custom Nodes ---

function getAvatarSrc(avatar: string, name: string) {
  return avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function CustomOrgNode({ data }: NodeProps<Node<OrgNodeData>>) {
    const { title, level, color, description, employees } = data;
  const isLevelD = level === 'D';
  
  const displayEmployees = employees.length > 0 ? employees : [{
    id: 'dummy',
    name: title.split(' ')[0],
    role: title,
    avatar: '',
    department: ''
  }];

  const mainTitle = employees.length > 0 ? employees[0].name : title;
  const subTitle = employees.length > 0 ? title : (description || "Gestão e supervisão de processos.");

  if (isLevelD) {
    return (
      <div className="flex flex-col items-center gap-2 group p-2">
        <Handle type="target" position={Position.Top} className="opacity-0" />
        <div className="relative">
          <div className={cn("absolute inset-0 rounded-full blur-md opacity-20 group-hover:opacity-40 transition-opacity", color)} />
          <div className="relative w-14 h-14 rounded-full border-4 border-border shadow-lg overflow-hidden z-10 bg-card">
            <img src={getAvatarSrc(employees[0]?.avatar || '', employees[0]?.name || title)} alt={title} className="w-full h-full object-cover" />
          </div>
          <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-border z-20", color)} />
        </div>
        <div className="text-center w-[120px]">
          <p className="text-[10px] font-black uppercase text-foreground/90 tracking-tight leading-none truncate">{mainTitle}</p>
          <p className="text-[8px] font-medium text-muted-foreground mt-1">{subTitle}</p>
        </div>
        <Handle type="source" position={Position.Bottom} className="opacity-0" />
      </div>
    );
  }

  const levelColors = {
    A: "border-blue-500",
    B: "border-emerald-500",
    C: "border-amber-400",
  };

  const badgeColors = {
    A: "bg-blue-600",
    B: "bg-emerald-600",
    C: "bg-amber-500",
  };

    return (
    <div className="flex flex-col items-center group p-4">
      <Handle type="target" position={Position.Top} className="!bg-secondary border-none" />
      
      {level !== 'B' && (
        <div className="relative z-20 -mb-10 flex -space-x-4">
          {displayEmployees.slice(0, 2).map((emp) => (
            <div key={emp.id} className="relative">
              <div className={cn("absolute inset-0 rounded-full blur-xl transition-all duration-500 group-hover:opacity-100 opacity-50", badgeColors[level === 'A' ? 'A' : 'C'])} />
              <div className="relative w-20 h-20 rounded-full border-4 border-card shadow-2xl overflow-hidden ring-1 ring-border bg-background">
                <img src={getAvatarSrc(emp.avatar, emp.name)} alt={title} className="w-full h-full object-cover" />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={cn(
        "relative w-[230px] bg-card/80 backdrop-blur-md rounded-3xl shadow-2xl border border-border border-l-[6px] p-6 pt-12 transition-all duration-300 group-hover:shadow-blue-500/10 group-hover:border-l-[10px]",
        // @ts-ignore
        levelColors[level] || "border-slate-300"
      )}>
        <div className={cn(
          "absolute top-4 right-0 px-3 py-1 flex items-center gap-1.5 rounded-l-full shadow-lg bg-blue-600/20",
          // @ts-ignore
          badgeColors[level]
        )}>
           <span className="text-[7px] font-black text-white uppercase tracking-widest">Level {level}</span>
        </div>

        <div className="text-left space-y-1.5">
          <h3 className="text-[11px] font-black text-foreground uppercase tracking-tight leading-tight">
            {mainTitle}
          </h3>
          <p className="text-[8px] font-bold text-muted-foreground leading-relaxed line-clamp-2 uppercase tracking-widest opacity-60">
            {subTitle}
          </p>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-secondary rounded-t-full group-hover:bg-blue-500 transition-colors" />
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-secondary border-none" />
    </div>
  );
}

// --- Hierarchy Definitions ---

// --- View ---

const nodeTypes = {
  custom: CustomOrgNode,
};

import { useNotification } from "@/components/ui/NotificationProvider";

export function OrgChartView() {
  const { showNotification } = useNotification();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allUsers, setAllUsers] = useState<Employee[]>([]);
  const [selectedNode, setSelectedNode] = useState<{id: string, databaseId: string, title: string, department: string, level: string} | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  
  // New State for Node Creation
  const [newTitle, setNewTitle] = useState("");

  const loadChart = useCallback(async () => {
    // 1. Fetch Employees
    const { data: usersData } = await supabase.from("usuarios").select("id,name,role,department,avatar").eq("status", "ativo");
    const formattedUsers = (usersData || []).map(u => ({ id: u.id, name: u.name, role: u.role || "", department: u.department || "", avatar: u.avatar || "" }));
    setEmployees(formattedUsers);
    setAllUsers(formattedUsers);

    // 2. Fetch Structure from organograma_cargos
    let { data: rolesData } = await supabase.from("organograma_cargos").select("*").order("created_at", { ascending: true });

    if (!rolesData || rolesData.length === 0) {
        const { data: seed } = await supabase.from("organograma_cargos").insert({
            title: "DIRETORIA",
            level: 'A',
            color: "from-blue-600 to-indigo-700",
            description: "Diretoria Executiva"
        }).select();
        rolesData = seed || [];
    }

    if (rolesData) {
      const flattenedNodes: Node[] = [];
      const flattenedEdges: Edge[] = [];
      const horizontalSpacing = 350;
      const verticalSpacing = 400;

      const idMap = new Map();
      rolesData.forEach(r => idMap.set(r.id, { ...r, children: [] }));
      const roots: any[] = [];
      rolesData.forEach(r => {
        if (r.parent_id && idMap.has(r.parent_id)) {
            idMap.get(r.parent_id).children.push(idMap.get(r.id));
        } else {
            roots.push(idMap.get(r.id));
        }
      });

      const traverse = (node: any, parentId: string | null = null, depth = 0, xOffset = 0, deptName?: string) => {
        const id = node.id;
        const currentDept = node.level === 'B' ? node.title : deptName;
        const matched = formattedUsers.filter(e => e.role === node.title);

        // Use saved position if available, otherwise use calculated spread
        const position = {
            x: node.pos_x !== null ? node.pos_x : xOffset,
            y: node.pos_y !== null ? node.pos_y : depth * verticalSpacing
        };

        flattenedNodes.push({
          id,
          type: 'custom',
          position,
          data: { ...node, employees: matched, department: currentDept },
        });

        if (parentId) {
          flattenedEdges.push({
            id: `e-${parentId}-${id}`,
            source: parentId,
            target: id,
            animated: true,
            style: { stroke: '#cbd5e1', strokeWidth: 2 },
          });
        }

        if (node.children) {
          const totalWidth = (node.children.length - 1) * horizontalSpacing;
          node.children.forEach((child: any, i: number) => {
            const childXOffset = xOffset - totalWidth / 2 + i * horizontalSpacing;
            traverse(child, id, depth + 1, childXOffset, currentDept);
          });
        }
      };

      const rootTotalWidth = (roots.length - 1) * horizontalSpacing * 2;
      roots.forEach((root, i) => {
          traverse(root, null, 0, -rootTotalWidth/2 + (i * horizontalSpacing * 2), root.level === 'A' ? "Diretoria" : "");
      });

      setNodes(flattenedNodes);
      setEdges(flattenedEdges);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    loadChart();
  }, [loadChart]);

  const onNodeDragStop = useCallback(async (_: any, node: Node) => {
    // Save position to DB when drag ends
    await supabase.from("organograma_cargos").update({
        pos_x: node.position.x,
        pos_y: node.position.y
    }).eq("id", node.id);
  }, []);

  const onNodeClick = (_: any, node: Node) => {
    setSelectedNode({ 
        id: node.id, 
        databaseId: node.id, 
        title: node.data.title as string, 
        department: node.data.department as string,
        level: node.data.level as string
    });
  };

  const handleAddNode = async (type: 'setor' | 'cargo') => {
    if (!selectedNode || !newTitle) return;
    setSaving(true);
    
    const level = type === 'setor' ? 'B' : (selectedNode.level === 'B' ? 'C' : 'D');
    const color = type === 'setor' ? "from-emerald-500 to-teal-600" : "from-amber-400 to-orange-500";

    const { error } = await supabase.from("organograma_cargos").insert({
        parent_id: selectedNode.databaseId,
        title: newTitle.toUpperCase(),
        level: level,
        color: color,
        description: type === 'setor' ? "Departamento" : "Cargo Operacional"
    });

    if (!error) {
        setNewTitle("");
        await loadChart();
        showNotification("success", "Estrutura Atualizada", `${type === 'setor' ? 'Setor' : 'Cargo'} criado com sucesso!`);
    } else {
        showNotification("error", "Erro na Estrutura", "Não foi possível criar o item.");
    }
    setSaving(false);
  };

  const handleRenameNode = async () => {
    if (!selectedNode || !newTitle) return;
    setSaving(true);
    const { error } = await supabase.from("organograma_cargos").update({ title: newTitle.toUpperCase() }).eq("id", selectedNode.databaseId);
    if (!error) {
        const oldTitle = selectedNode.title;
        const nextTitle = newTitle.toUpperCase();
        setSelectedNode(prev => prev ? { ...prev, title: nextTitle } : null);
        setNewTitle("");
        await loadChart();
        showNotification("info", "Cargo Renomeado", `De "${oldTitle}" para "${nextTitle}"`);
    }
    setSaving(false);
  };

  const handleCreateRoot = async () => {
    setSaving(true);
    const { error } = await supabase.from("organograma_cargos").insert({
        title: "NOVO DIRETOR",
        level: 'A',
        color: "from-blue-600 to-indigo-700",
        description: "Diretoria"
    });
    if (!error) {
        await loadChart();
        showNotification("success", "Novo Diretor", "Cargo de diretoria adicionado ao topo.");
    }
    setSaving(false);
  };

  const handleDeleteNode = async () => {
    if (!selectedNode) return;
    if (!confirm(`Deseja realmente excluir ${selectedNode.title}? Todos os sub-itens também serão apagados.`)) return;
    
    setSaving(true);
    const { error } = await supabase.from("organograma_cargos").delete().eq("id", selectedNode.databaseId);
    
    if (!error) {
        const deletedTitle = selectedNode.title;
        setSelectedNode(null);
        await loadChart();
        showNotification("error", "Item Removido", `"${deletedTitle}" e seus dependentes foram excluídos.`);
    }
    setSaving(false);
  };

  const handleAssign = (user: Employee) => {
    if (!selectedNode) return;
    setEmployees(prev => prev.map(u => {
      if (u.id === user.id) return { ...u, role: selectedNode.title, department: selectedNode.department };
      return u;
    }));
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        const updated = [...(n.data.employees as Employee[] || [])];
        if (!updated.find(e => e.id === user.id)) updated.push({ ...user, role: selectedNode.title });
        return { ...n, data: { ...n.data, employees: updated } };
      }
      return n;
    }));
    showNotification("info", "Vínculo Temporário", `${user.name} foi atribuído como ${selectedNode.title}. Salve para confirmar.`);
  };

  const handleUnassign = (user: Employee) => {
    setEmployees(prev => prev.map(u => {
      if (u.id === user.id) return { ...u, role: "", department: "" };
      return u;
    }));
    setNodes(nds => nds.map(n => {
        if (n.id === selectedNode?.id) {
          const updated = (n.data.employees as Employee[] || []).filter(e => e.id !== user.id);
          return { ...n, data: { ...n.data, employees: updated } };
        }
        return n;
      }));
  };

  const saveToSupabase = async () => {
    setSaving(true);
    try {
      for (const emp of employees) {
          await supabase.from("usuarios").update({ role: emp.role, department: emp.department }).eq("id", emp.id);
      }
      showNotification("success", "Alterações Salvas", "O organograma foi sincronizado com o banco de dados.");
    } catch (error) {
      console.error(error);
      showNotification("error", "Falha no Salvamento", "Não foi possível persistir as alterações.");
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = allUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative select-none">

      <Panel position="top-right" className="m-8">
        <div className="flex items-center gap-3">
            <button 
                onClick={loadChart}
                disabled={saving}
                className="px-6 py-3 bg-secondary/50 backdrop-blur-md border border-border text-foreground rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-secondary transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
                <LayoutGrid className="w-4 h-4 text-blue-500" />
                Auto-alinhar Árvore
            </button>
            <button 
                onClick={handleCreateRoot}
                disabled={saving}
                className="px-6 py-3 bg-secondary/50 backdrop-blur-md border border-border text-foreground rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-secondary transition-all active:scale-95 disabled:opacity-50"
            >
                + Novo Diretor
            </button>
            <button 
                onClick={saveToSupabase}
                disabled={saving}
                className={cn(
                    "px-6 py-3 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-600/10 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2",
                    saving ? "animate-pulse" : "hover:bg-blue-700"
                )}
            >
                {saving ? "Processando..." : "Salvar Atribuições"}
            </button>
        </div>
      </Panel>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
        minZoom={0.1}
        maxZoom={1.5}
        snapToGrid={true}
        snapGrid={[20, 20]}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} color="#1e293b" variant={undefined} style={{ opacity: 0.5 }} />
        <Controls 
          showInteractive={false} 
          className="!bg-card/80 !backdrop-blur-md !border-border !shadow-2xl overflow-hidden !rounded-2xl [&_button]:!bg-transparent [&_button]:!border-border [&_svg]:!fill-foreground/50 [&_button:hover]:!bg-secondary/50" 
        />
      </ReactFlow>

      {/* Editor Drawer */}
      {selectedNode && (
        <div className="absolute top-0 right-0 w-80 h-full bg-card/90 backdrop-blur-xl z-[100] border-l border-border flex flex-col animate-in slide-in-from-right duration-300">
           <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
              <div>
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight">{selectedNode.title}</h3>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-0.5">{selectedNode.department}</p>
              </div>
              <button onClick={() => setSelectedNode(null)} className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground shadow-sm border border-border transition-all">✕</button>
           </div>

           <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                {/* 1. Structure Actions */}
                <div className="p-6 border-b border-border space-y-6">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Estrutura de Organização</p>
                    
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-muted-foreground uppercase ml-1 opacity-50">Nome (Setor ou Cargo)</label>
                            <input 
                                type="text" 
                                placeholder="Ex: FINANCEIRO ou VENDEDOR..." 
                                className="w-full px-4 py-3 bg-secondary/40 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-blue-500/50 transition-all"
                                value={newTitle}
                                onChange={e => setNewTitle(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => handleAddNode('setor')}
                                disabled={!newTitle || saving}
                                className="py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/10"
                            >
                                + Novo Setor
                            </button>
                            <button 
                                onClick={() => handleAddNode('cargo')}
                                disabled={!newTitle || saving}
                                className="py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-amber-600 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/10"
                            >
                                + Novo Cargo
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                             <button 
                                onClick={handleRenameNode}
                                disabled={!newTitle || saving}
                                className="flex-1 py-3 bg-foreground text-background rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                            >
                                Renomear Selecionado
                            </button>
                            <button 
                                onClick={handleDeleteNode}
                                disabled={saving}
                                className="px-4 py-3 border border-red-500/20 text-red-500 rounded-xl text-[9px] font-black uppercase hover:bg-red-500/10 transition-all"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. Employee Assignment */}
                <div className="p-6 space-y-4">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Vincular Colaboradores</p>
                    <input 
                        type="text" 
                        placeholder="PESQUISAR..." 
                        className="w-full px-4 py-2 bg-secondary/40 border border-border rounded-xl text-xs font-bold text-foreground outline-none focus:border-blue-500/50 transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <div className="space-y-2">
                        {filteredUsers.map(user => {
                            const isAssigned = employees.find(e => e.id === user.id)?.role === selectedNode.title;
                            return (
                                <div key={user.id} className={cn("p-2 rounded-xl border flex items-center justify-between group transition-all", isAssigned ? "bg-blue-500/10 border-blue-500/30" : "bg-card border-border hover:border-blue-500/20 shadow-sm")}>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <img src={getAvatarSrc(user.avatar, user.name)} className="w-8 h-8 rounded-xl shadow-sm border border-border bg-card" />
                                            {isAssigned && <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black text-foreground leading-none truncate w-[160px] uppercase tracking-tight">{user.name}</p>
                                            <p className="text-[8px] text-muted-foreground mt-1 font-bold uppercase tracking-tighter truncate opacity-50">{user.role || 'Sem cargo'}</p>
                                        </div>
                                    </div>
                                    {isAssigned ? (
                                        <button 
                                            onClick={() => handleUnassign(user)} 
                                            className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                            title="Remover do cargo"
                                        >
                                            <UserMinus className="w-3.5 h-3.5" />
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleAssign(user)} 
                                            className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                            title="Vincular ao cargo"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
           </div>
        </div>
      )}

      <Panel position="bottom-right" className="m-8">
        <div className="bg-card/80 backdrop-blur-md rounded-3xl border border-border p-5 shadow-2xl space-y-4">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] border-b border-border pb-3 mb-1">Engenharia de Conexão</p>
          {[
            { l: 'A', t: 'Diretoria Executiva', c: 'bg-blue-600' },
            { l: 'B', t: 'Departamentos', c: 'bg-emerald-600' },
            { l: 'C', t: 'Gestão e Supervisão', c: 'bg-amber-500' },
            { l: 'D', t: 'Corpo Operacional', c: 'bg-orange-600' },
          ].map(item => (
            <div key={item.l} className="flex items-center gap-4 group">
               <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-black text-white shadow-lg shadow-black/20 group-hover:scale-110 transition-transform", item.c)}>{item.l}</div>
               <span className="text-[10px] font-black text-foreground/70 uppercase tracking-tight">{item.t}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

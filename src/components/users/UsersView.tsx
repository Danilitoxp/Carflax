import { useState } from "react";
import { 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  Edit3,
  Trash2,
  X,
  ChevronDown,
  Camera,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "vendedor" | "logistica" | "coletor";
  status: "ativo" | "suspenso";
  avatar: string;
  lastLogin: string;
  permissions: string[];
  operatorCode?: string;
}

export function UsersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(true);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  // User State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "vendedor" as User["role"],
    avatar: "",
    permissions: ["Painel"] as string[],
    operatorCode: ""
  });

  const availableModules = [
    "Geral", "Produtos", "Calendário", "Analytics", 
    "Orçamentos", "Campanhas", "Romaneios", 
    "Concluídas", "Usuários", "Sugestões"
  ];

  const Switch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={(e) => { e.preventDefault(); onChange(); }}
      className={cn(
        "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        enabled ? "bg-primary" : "bg-zinc-700"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          enabled ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );

  const [users, setUsers] = useState<User[]>([
    {
      id: "1",
      name: "Andrew Smith",
      email: "andrew@carflax.com",
      role: "admin",
      status: "ativo",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Andrew",
      lastLogin: "Há 5 min",
      permissions: ["Geral", "Produtos", "Calendário", "CRM", "Entregas", "Usuários", "Sugestões"]
    },
    {
      id: "2",
      name: "Tatiane Maria",
      email: "tati@carflax.com",
      role: "vendedor",
      status: "ativo",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Tatiane",
      lastLogin: "Ontem às 16:45",
      permissions: ["Geral", "CRM"]
    },
    {
      id: "3",
      name: "Mateus Ronald",
      email: "mateus@carflax.com",
      role: "logistica",
      status: "ativo",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mateus",
      lastLogin: "Hoje às 08:30",
      permissions: ["Geral", "Entregas"]
    },
    {
      id: "4",
      name: "Guilherme Santana",
      email: "guilherme@carflax.com",
      role: "vendedor",
      status: "suspenso",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Guilherme",
      lastLogin: "Há 3 dias",
      permissions: ["Geral"]
    }
  ]);

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      permissions: user.permissions || [],
      operatorCode: user.operatorCode || ""
    });
    setIsAddModalOpen(true);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...newUser } 
          : u
      ));
    } else {
      const id = (users.length + 1).toString();
      const userToAdd: User = {
        id,
        ...newUser,
        status: "ativo",
        lastLogin: "Recém criado"
      };
      setUsers(prev => [...prev, userToAdd]);
    }
    
    setIsAddModalOpen(false);
    setEditingUser(null);
    setNewUser({ name: "", email: "", role: "vendedor", avatar: "", permissions: ["Painel"], operatorCode: "" });
  };

  const handleDeleteUser = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  const getRoleBadge = (role: string) => {
    switch(role) {
      case "admin": return "bg-primary/10 text-primary border-primary/20";
      case "vendedor": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "logistica": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default: return "bg-secondary text-muted-foreground";
    }
  };

  return (
    <div className="h-full flex flex-col space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex-1 w-full max-w-xl">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-card border border-border/60 rounded-[2rem] pl-16 pr-8 py-5 text-base font-semibold outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
            />
          </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-[2rem] shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <UserPlus className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-widest">Novo Usuário</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="flex-1 bg-card border border-border/50 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/5">
                <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Usuário</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cargo</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Último Acesso</th>
                <th className="px-8 py-6 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
                {filteredUsers.map((user) => (
                  <tr 
                    key={user.id}
                    className="group hover:bg-primary/[0.01] transition-colors"
                  >
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden bg-secondary relative">
                            <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />
                            {user.operatorCode && (
                              <div className="absolute -bottom-1 -right-1 bg-primary text-[7px] font-black text-white px-1 rounded-md border-2 border-card uppercase">
                                {user.operatorCode}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-foreground uppercase tracking-tight">{user.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest",
                        getRoleBadge(user.role)
                      )}>
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", user.status === "ativo" ? "bg-emerald-500" : "bg-rose-500")} />
                        <span className={cn("text-[10px] font-black uppercase tracking-widest", user.status === "ativo" ? "text-emerald-500" : "text-rose-500")}>
                          {user.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">{user.lastLogin}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-3 rounded-xl bg-secondary/50 hover:bg-primary hover:text-white transition-all text-muted-foreground"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-3 rounded-xl bg-secondary/50 hover:bg-rose-500 hover:text-white transition-all text-muted-foreground"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all">
            <div 
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md" 
            />
            
            <div 
              className="relative w-full max-w-lg bg-card border border-border/50 rounded-[2rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground tracking-tight">
                      {editingUser ? "Editar Usuário" : "Novo Usuário"}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-secondary rounded-xl text-muted-foreground transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex flex-col max-h-[80vh]">
                <div className="p-6 pt-2 space-y-6 overflow-y-auto scrollbar-hide">
                  {/* Avatar Selection with Upload */}
                  <div className="flex flex-col items-center justify-center py-6 bg-secondary/10 rounded-3xl border border-dashed border-border/50 relative overflow-hidden group/avatar">
                    <input 
                      type="file" 
                      id="avatar-upload"
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewUser({...newUser, avatar: reader.result as string});
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    
                    <div className="relative">
                      <div 
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        className="w-28 h-28 rounded-[2.5rem] overflow-hidden bg-card border-2 border-primary/20 shadow-xl cursor-pointer hover:border-primary/50 transition-all relative group"
                      >
                        <img 
                          src={newUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name || 'default'}`} 
                          className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                          alt="Preview" 
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const seeds = ["Felix", "Ane", "Jack", "Luna", "Oliver", "Maya"];
                          const randomSeed = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 1000);
                          setNewUser({...newUser, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`});
                        }}
                        className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-white rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all z-10"
                        title="Gerar Aleatório"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-4 text-center">
                      <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Clique para fazer upload</p>
                      <p className="text-[8px] font-bold text-muted-foreground mt-1 uppercase opacity-60">PNG, JPG ou SVG (Máx. 2MB)</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        placeholder="Ex: Andrew Smith" 
                        className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail de Acesso</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                        <input 
                          type="email" 
                          value={newUser.email}
                          onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                          placeholder="email@carflax.com" 
                          className="w-full bg-secondary/20 border border-border/40 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-primary/50 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cargo</label>
                        <button
                          type="button"
                          onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                          className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between hover:bg-secondary/30 transition-all"
                        >
                          <span className="capitalize">{newUser.role}</span>
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isRoleDropdownOpen && "rotate-180")} />
                        </button>

                        {isRoleDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-[110]" 
                              onClick={() => setIsRoleDropdownOpen(false)} 
                            />
                            <div className="absolute top-full left-0 w-full mt-2 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-[120] animate-in fade-in zoom-in-95 duration-200">
                              {[
                                { id: "admin", label: "Administrador" },
                                { id: "vendedor", label: "Vendedor" },
                                { id: "logistica", label: "Logística" },
                                { id: "coletor", label: "Coletor" }
                              ].map((role) => (
                                <button
                                  key={role.id}
                                  type="button"
                                  onClick={() => {
                                    setNewUser({...newUser, role: role.id as User["role"]});
                                    setIsRoleDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-3 text-sm font-bold text-left hover:bg-primary/10 transition-colors flex items-center justify-between",
                                    newUser.role === role.id ? "text-primary bg-primary/5" : "text-foreground"
                                  )}
                                >
                                  {role.label}
                                  {newUser.role === role.id && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Cód. Operador</label>
                        <input 
                          type="text" 
                          maxLength={3}
                          value={newUser.operatorCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setNewUser({...newUser, operatorCode: val});
                          }}
                          placeholder="000" 
                          className="w-full bg-secondary/20 border border-border/40 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary/50 transition-all text-center"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/40 mt-4">
                      <button 
                        onClick={() => setIsPermissionsOpen(!isPermissionsOpen)}
                        className="flex items-center justify-between w-full hover:bg-secondary/10 p-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                          <h4 className="text-[9px] font-black text-foreground uppercase tracking-[0.2em]">Permissões de Menu</h4>
                        </div>
                        <ChevronDown className={cn(
                          "w-3 h-3 text-muted-foreground transition-transform duration-300",
                          isPermissionsOpen ? "rotate-0" : "-rotate-90"
                        )} />
                      </button>

                      {isPermissionsOpen && (
                        <div className="overflow-hidden">
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            {availableModules.map((module) => {
                              const hasAccess = newUser.permissions.includes(module);
                              return (
                                <div
                                  key={module}
                                  onClick={() => {
                                    const updatedPermissions = hasAccess
                                      ? newUser.permissions.filter(p => p !== module)
                                      : [...newUser.permissions, module];
                                    setNewUser({...newUser, permissions: updatedPermissions});
                                  }}
                                  className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer group",
                                    hasAccess 
                                      ? "bg-secondary/30 border-primary/20" 
                                      : "bg-secondary/5 border-border/10"
                                  )}
                                >
                                  <span className={cn(
                                    "text-[9px] font-black mb-2 transition-colors uppercase tracking-tight",
                                    hasAccess ? "text-foreground" : "text-muted-foreground/40"
                                  )}>
                                    {module}
                                  </span>
                                  <Switch 
                                    enabled={hasAccess} 
                                    onChange={() => {}} 
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-2 flex gap-3 bg-card/80 backdrop-blur-sm border-t border-border/20">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3.5 bg-secondary text-muted-foreground rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveUser}
                    className="flex-1 py-3.5 bg-primary text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {editingUser ? "Salvar Alterações" : "Criar Conta"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

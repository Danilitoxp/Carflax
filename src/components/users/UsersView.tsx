import { useState } from "react";
import { 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  Edit3,
  Trash2,
  X,
  Camera,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
}

export function UsersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // User State
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "vendedor" as User["role"],
    avatar: "",
    permissions: ["Geral"] as string[]
  });

  const availableModules = [
    "Geral", "Produtos", "Calendário", "CRM", "Entregas", "Usuários", "Sugestões"
  ];

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
      permissions: user.permissions || []
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
    setNewUser({ name: "", email: "", role: "vendedor", avatar: "", permissions: ["Geral"] });
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
    <div className="h-full flex flex-col space-y-8 animate-in fade-in duration-700">
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
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user, i) => (
                  <motion.tr 
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: i * 0.05 }}
                    className="group hover:bg-primary/[0.01] transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl border-2 border-border/50 p-0.5 overflow-hidden shrink-0 group-hover:border-primary/30 transition-colors">
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-2xl bg-secondary object-cover" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-foreground tracking-tight">{user.name}</span>
                          <span className="text-[11px] font-bold text-muted-foreground">{user.email}</span>
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
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVO USUÁRIO */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-md" 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-card border border-border/50 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-8 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-foreground tracking-tight">
                      {editingUser ? "Editar Usuário" : "Novo Usuário"}
                    </h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      {editingUser ? "Atualize os dados de acesso" : "Preencha os dados de acesso"}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2.5 hover:bg-secondary rounded-2xl text-muted-foreground transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8 pt-4 space-y-6">
                {/* Avatar Preview */}
                <div className="flex justify-center mb-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-[2rem] border-4 border-primary/20 p-1 overflow-hidden">
                      <img 
                        src={newUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${newUser.name || 'default'}`} 
                        className="w-full h-full rounded-[1.5rem] bg-secondary object-cover" 
                        alt="Preview" 
                      />
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg border-2 border-card text-white">
                      <Camera className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="Ex: Andrew Smith" 
                      className="w-full bg-secondary/30 border border-border/60 rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-primary/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail de Acesso</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="email" 
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="email@carflax.com" 
                        className="w-full bg-secondary/30 border border-border/60 rounded-2xl pl-12 pr-5 py-4 text-sm font-semibold outline-none focus:border-primary/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-primary">Cargo</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["admin", "vendedor", "logistica", "coletor"].map((role) => (
                        <button
                          key={role}
                          onClick={() => setNewUser({...newUser, role: role as User["role"]})}
                          className={cn(
                            "py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-tighter border transition-all flex items-center justify-between",
                            newUser.role === role 
                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                              : "bg-secondary/40 border-border/50 text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          {role}
                          {newUser.role === role && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-primary">Permissões de Acesso</label>
                    <div className="flex flex-wrap gap-2">
                      {availableModules.map((module) => {
                        const hasAccess = newUser.permissions.includes(module);
                        return (
                          <button
                            key={module}
                            onClick={() => {
                              const updatedPermissions = hasAccess
                                ? newUser.permissions.filter(p => p !== module)
                                : [...newUser.permissions, module];
                              setNewUser({...newUser, permissions: updatedPermissions});
                            }}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                              hasAccess 
                                ? "bg-primary/10 text-primary border-primary/30" 
                                : "bg-transparent border-border/40 text-muted-foreground hover:border-border"
                            )}
                          >
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full transition-all",
                              hasAccess ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            {module}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-4 bg-secondary text-muted-foreground rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-secondary/80 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveUser}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    {editingUser ? "Salvar Alterações" : "Criar Conta"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

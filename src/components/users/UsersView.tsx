import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImage } from "@/lib/uploadImage";
import {
  UserPlus,
  Search,
  Shield,
  Edit3,
  Trash2,
  X,
  ShieldCheck,
  UserCog,
  Building2,
  Briefcase,
  Camera,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TinyDropdown } from "@/components/ui/TinyDropdown";

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
  company: "Carflax" | "Zelex" | "JCM";
  department: string;
}

export function UsersView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters State
  const [filterRole, setFilterRole] = useState("Todos os Cargos");
  const [filterCompany, setFilterCompany] = useState("Todas as Empresas");
  const [filterDepartment, setFilterDepartment] = useState("Todos os Setores");

  // User State for Modal
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "vendedor" as User["role"],
    company: "Carflax" as User["company"],
    department: "Comercial",
    avatar: "",
    permissions: ["Geral"] as string[],
    operatorCode: "",
    birthDate: "",
    admissionDate: "",
  });

  const availableModules = [
    "Geral", "Produtos", "Calendário", "Analytics",
    "Orçamentos", "Campanhas", "Romaneios",
    "Concluídas", "Usuários", "Sugestões"
  ];

  const companies = ["Carflax", "Zelex", "JCM"];

  const applyDateMask = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const maskedToISO = (masked: string) => {
    const digits = masked.replace(/\D/g, "");
    if (digits.length !== 8) return null;
    return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  };

  const isoToMasked = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return y && m && d ? `${d}/${m}/${y}` : iso;
  };

  const getAvatarSrc = (avatar: string, name: string) =>
    avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    setNewUser(u => ({ ...u, avatar: URL.createObjectURL(file), _avatarFile: file } as any));
  };

  const roles = [
    // Diretoria
    "Diretor",
    // Gerências
    "Gerente de Estoque", "Gerente de Manutenção", "Gerente de Segurança",
    "Gerente de Vendas", "Gerente de Compras", "Gerente de Marketing",
    "Gerente de RH", "Gerente Contábil", "Gerente Administrativo",
    "Gerente de TI", "Gerente de Limpeza",
    // Vendas
    "Vendedor B2B", "Vendedor B2C", "Auxiliar de Vendas",
    // Estoque / Expedição
    "Conferente", "Conferente de Estoque", "Conferente Balcão",
    "Motorista", "Ajudante",
    "Auxiliar de Conferência", "Auxiliar de Expedição",
    "Auxiliar de Expedição Vendedor Separador",
    // Auxiliares gerais
    "Auxiliar de Manutenção", "Auxiliar de Segurança", "Auxiliar de Compras",
    "Auxiliar de Marketing", "Auxiliar de RH", "Auxiliar Contábil",
    "Assistente Administrativo", "Auxiliar de TI", "Auxiliar de Limpeza",
    // Administrativo / Financeiro
    "Faturista", "Caixa",
    // TI / Admin sistema
    "admin",
  ];
  const departments = [
    "Estoque", "Manutenção", "Segurança", "Vendas", "Compras",
    "Marketing", "RH", "Contabilidade", "Administrativo", "TI", "Limpeza",
  ];

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .order("name");

      if (!error && data) {
        setUsers(data.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          status: u.status,
          avatar: u.avatar || "",
          lastLogin: u.last_login ? new Date(u.last_login).toLocaleString("pt-BR") : "Nunca",
          permissions: u.permissions || ["Geral"],
          operatorCode: u.operator_code || "",
          company: u.company,
          department: u.department,
        })));
      }
      setLoading(false);
    }
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "Todos os Cargos" || user.role === filterRole;
    const matchesCompany = filterCompany === "Todas as Empresas" || user.company === filterCompany;
    const matchesDept = filterDepartment === "Todos os Setores" || user.department === filterDepartment;

    return matchesSearch && matchesRole && matchesCompany && matchesDept;
  });

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setNewUser({
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      department: user.department,
      avatar: user.avatar,
      permissions: user.permissions || [],
      operatorCode: user.operatorCode || "",
      birthDate: isoToMasked((user as any).birthDate || ""),
      admissionDate: isoToMasked((user as any).admissionDate || ""),
    });
    setAvatarLoading(false);
    setSaving(false);
    setIsAddModalOpen(true);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    const avatarFile = (newUser as any)._avatarFile as File | undefined;
    let avatarUrl: string | null | undefined;

    if (avatarFile) {
      console.log("[Users] Fazendo upload de avatar para bucket 'avatares'...");
      avatarUrl = await uploadImage(avatarFile, "avatares");
      console.log("[Users] Resultado do upload:", avatarUrl);
      if (!avatarUrl) {
        console.error("[Users] Upload falhou — verifique a policy de INSERT no bucket 'avatares'");
      }
    }

    // Se upload falhou ou não havia arquivo novo, manter avatar existente
    const finalAvatar = avatarUrl
      ?? (newUser.avatar?.startsWith("blob:") ? editingUser?.avatar || "" : newUser.avatar)
      ?? editingUser?.avatar
      ?? "";

    const payload = {
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      company: (newUser as any).company,
      department: (newUser as any).department,
      avatar: finalAvatar,
      permissions: newUser.permissions,
      operator_code: (newUser as any).operatorCode || null,
      birth_date: maskedToISO((newUser as any).birthDate || "") || null,
      admission_date: maskedToISO((newUser as any).admissionDate || "") || null,
    };

    try {
      if (editingUser) {
        const { error } = await supabase.from("usuarios").update(payload).eq("id", editingUser.id);
        if (error) { console.error("[Users] Erro ao editar:", error); return; }
        const { data: updated } = await supabase.from("usuarios").select("*").eq("id", editingUser.id).single();
        if (updated) {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? {
            id: updated.id, name: updated.name, email: updated.email, role: updated.role,
            status: updated.status, avatar: updated.avatar || "", lastLogin: updated.last_login ? new Date(updated.last_login).toLocaleString("pt-BR") : "Nunca",
            permissions: updated.permissions || [], operatorCode: updated.operator_code || "",
            company: updated.company, department: updated.department,
          } : u));
        } else {
          setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...newUser, avatar: finalAvatar } : u));
        }
      } else {
        const { error } = await supabase.from("usuarios").insert({ ...payload, status: "ativo" });
        if (error) { console.error("[Users] Erro ao criar:", error); return; }
        setUsers(prev => [...prev, {
          id: crypto.randomUUID(),
          name: payload.name, email: payload.email, role: payload.role as User["role"],
          status: "ativo", avatar: finalAvatar, lastLogin: "Recém criado",
          permissions: payload.permissions, operatorCode: payload.operator_code || "",
          company: payload.company as User["company"], department: payload.department,
        }]);
      }
      setIsAddModalOpen(false);
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;
    const { error } = await supabase.from("usuarios").delete().eq("id", id);
    if (error) { console.error("[Users] Erro ao excluir:", error); return; }
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return "bg-blue-50 text-blue-600 border-blue-100";
      case "vendedor": return "bg-emerald-50 text-emerald-600 border-emerald-100";
      case "logistica": return "bg-amber-50 text-amber-600 border-amber-100";
      default: return "bg-slate-50 text-slate-500 border-slate-100";
    }
  };

  const Switch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={(e) => { e.preventDefault(); onChange(); }}
      className={cn(
        "relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
        enabled ? "bg-blue-600" : "bg-slate-200"
      )}
    >
      <span className={cn(
        "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
        enabled ? "translate-x-4" : "translate-x-0"
      )} />
    </button>
  );

  return (
    <div className="flex-1 flex flex-col gap-4 pb-6 overflow-hidden bg-[#F8FAFC]">
      {/* TINY TOOLBAR */}
      <div className="flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Gestão de Equipe</h2>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
              <UserCog className="w-3 h-3 text-blue-500" />
              Controle de Acessos por Empresa e Setor
            </p>
          </div>

          <button
            onClick={() => {
              setEditingUser(null);
              setNewUser({ name: "", email: "", role: "vendedor", company: "Carflax", department: "Comercial", avatar: "", permissions: ["Geral"], operatorCode: "", birthDate: "", admissionDate: "" } as any);
              setAvatarLoading(false);
              setSaving(false);
              setIsAddModalOpen(true);
            }}
            className="h-8 px-4 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Novo Usuário
          </button>
        </div>

        {/* FILTERS BAR (Simplified with TinyDropdown) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all placeholder:text-slate-300 shadow-sm"
            />
          </div>

          <TinyDropdown
            value={filterCompany}
            options={["Todas as Empresas", ...companies]}
            onChange={setFilterCompany}
            icon={Building2}
            variant="blue"
            placeholder="Todas as Empresas"
          />

          <TinyDropdown
            value={filterDepartment}
            options={["Todos os Setores", ...departments]}
            onChange={setFilterDepartment}
            icon={Briefcase}
            variant="amber"
            placeholder="Todos os Setores"
          />

          <TinyDropdown
            value={filterRole}
            options={["Todos os Cargos", ...roles]}
            onChange={setFilterRole}
            icon={Shield}
            variant="emerald"
            placeholder="Todos os Cargos"
          />
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Empresa / Setor</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-2.5 px-6 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Carregando usuários...</td></tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Nenhum usuário encontrado.</td></tr>
              )}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative shrink-0">
                        <div className="img-skeleton absolute inset-0 bg-slate-200 animate-pulse" />
                        <img
                          src={getAvatarSrc(user.avatar, user.name)}
                          alt={user.name}
                          onLoad={(e) => {
                            e.currentTarget.style.opacity = "1";
                            const sk = e.currentTarget.parentElement?.querySelector(".img-skeleton") as HTMLElement;
                            if (sk) sk.style.display = "none";
                          }}
                          style={{ opacity: 0, transition: "opacity 0.3s", position: "relative", zIndex: 1 }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none truncate">{user.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 truncate mt-0.5">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-700 uppercase leading-none">{user.company}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">{user.department}</span>
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-tight",
                      getRoleBadge(user.role)
                    )}>
                      {user.role}
                    </div>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full", user.status === "ativo" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500")} />
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", user.status === "ativo" ? "text-emerald-600" : "text-rose-500")}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEditClick(user)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL REDESIGNED WITH COMPANY & DEPT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div onClick={() => setIsAddModalOpen(false)} className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100"><UserPlus className="w-4 h-4 text-blue-600" /></div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{editingUser ? "Editar Perfil" : "Nova Conta"}</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vínculo Corporativo e Permissões</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-8 overflow-y-auto scrollbar-hide flex flex-col gap-6">
              {/* Profile Photo Section */}
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-4 border-slate-50 shadow-xl overflow-hidden bg-slate-50 flex items-center justify-center transition-transform duration-500 group-hover:scale-105 relative">
                    <>
                      {avatarLoading && <div className="absolute inset-0 bg-slate-200 animate-pulse z-10" />}
                      <img
                        src={getAvatarSrc(newUser.avatar, newUser.name || "user")} alt="Avatar"
                        onLoad={() => setAvatarLoading(false)}
                        style={{ opacity: avatarLoading ? 0 : 1, transition: "opacity 0.3s", position: "relative", zIndex: 1 }}
                        className="w-full h-full object-cover"
                      />
                    </>
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center cursor-pointer backdrop-blur-[2px] z-10">
                      <Camera className="w-6 h-6 text-white mb-1" />
                      <span className="text-[8px] font-black text-white uppercase tracking-widest">Alterar</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  </div>
                </div>
                <div className="text-center mt-2">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Foto de Perfil</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value.toUpperCase() })} placeholder="DANILO OLIVEIRA" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all uppercase" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@carflax.com" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Empresa</label>
                  <TinyDropdown
                    value={newUser.company}
                    options={companies}
                    onChange={(val) => setNewUser({ ...newUser, company: val as any })}
                    icon={Building2}
                    variant="blue"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Setor</label>
                  <TinyDropdown
                    value={newUser.department}
                    options={departments}
                    onChange={(val) => setNewUser({ ...newUser, department: val })}
                    icon={Briefcase}
                    variant="slate"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo</label>
                  <TinyDropdown
                    value={newUser.role}
                    options={roles}
                    onChange={(val) => setNewUser({ ...newUser, role: val as any })}
                    icon={Shield}
                    variant="emerald"
                    className="w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cód. Operador</label>
                  <input type="text" maxLength={3} value={newUser.operatorCode} onChange={(e) => setNewUser({ ...newUser, operatorCode: e.target.value.replace(/\D/g, "") })} placeholder="000" className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all text-center" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                  <input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={(newUser as any).birthDate} onChange={(e) => setNewUser({ ...newUser, birthDate: applyDateMask(e.target.value) } as any)} className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Admissão</label>
                  <input type="text" inputMode="numeric" placeholder="dd/mm/aaaa" maxLength={10} value={(newUser as any).admissionDate} onChange={(e) => setNewUser({ ...newUser, admissionDate: applyDateMask(e.target.value) } as any)} className="w-full h-11 bg-white border border-slate-200 rounded-xl px-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-600/50 transition-all" />
                </div>
              </div>

              {/* Permissions Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Módulos do Sistema</span>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-1 scrollbar-hide">
                  {availableModules.map((module) => {
                    const hasAccess = newUser.permissions.includes(module);
                    return (
                      <div key={module} onClick={() => {
                        const updated = hasAccess ? newUser.permissions.filter(p => p !== module) : [...newUser.permissions, module];
                        setNewUser({ ...newUser, permissions: updated });
                      }} className={cn("flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer", hasAccess ? "bg-blue-50/40 border-blue-100" : "bg-white border-slate-100")}>
                        <span className={cn("text-[9px] font-black uppercase tracking-tight", hasAccess ? "text-slate-900" : "text-slate-300")}>{module}</span>
                        <Switch enabled={hasAccess} onChange={() => { }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2">
              <button onClick={() => setIsAddModalOpen(false)} disabled={saving} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">Cancelar</button>
              <button onClick={handleSaveUser} disabled={saving} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/10 disabled:opacity-70 flex items-center justify-center gap-2">
                {saving && <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>}
                {saving ? "Salvando..." : editingUser ? "Salvar" : "Criar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

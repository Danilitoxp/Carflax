import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  avatar: string;
}

interface OrgNode {
  title: string;
  color: string;
  children?: OrgNode[];
  roles: string[];
}

const ORG_TREE: OrgNode[] = [
  {
    title: "Estoque", color: "bg-teal-500", roles: [],
    children: [
      { title: "Gerente de Estoque", color: "bg-teal-400", roles: ["Gerente de Estoque"],
        children: [
          { title: "Recebimento", color: "bg-teal-300", roles: ["Recebimento", "Conferente", "Auxiliar de Conferência"] },
          { title: "Expedição", color: "bg-teal-300", roles: ["Expedição", "Conferente de Estoque", "Conferente Balcão", "Motorista", "Ajudante", "Auxiliar de Expedição", "Auxiliar de Expedição Vendedor Separador"] },
        ],
      },
    ],
  },
  {
    title: "Manutenção", color: "bg-blue-500", roles: [],
    children: [
      { title: "Gerente de Manutenção", color: "bg-blue-400", roles: ["Gerente de Manutenção"],
        children: [{ title: "Auxiliar de Manutenção", color: "bg-blue-300", roles: ["Auxiliar de Manutenção"] }],
      },
    ],
  },
  {
    title: "Segurança", color: "bg-slate-500", roles: [],
    children: [
      { title: "Gerente de Segurança", color: "bg-slate-400", roles: ["Gerente de Segurança"],
        children: [{ title: "Auxiliar de Segurança", color: "bg-slate-300", roles: ["Auxiliar de Segurança"] }],
      },
    ],
  },
  {
    title: "Vendas", color: "bg-emerald-500", roles: [],
    children: [
      { title: "Gerente de Vendas", color: "bg-emerald-400", roles: ["Gerente de Vendas"],
        children: [
          { title: "Vendedor B2B", color: "bg-emerald-300", roles: ["Vendedor B2B"] },
          { title: "Vendedor B2C", color: "bg-emerald-300", roles: ["Vendedor B2C"] },
          { title: "Auxiliar de Vendas", color: "bg-emerald-300", roles: ["Auxiliar de Vendas"] },
        ],
      },
    ],
  },
  {
    title: "Compras", color: "bg-violet-500", roles: [],
    children: [
      { title: "Gerente de Compras", color: "bg-violet-400", roles: ["Gerente de Compras"],
        children: [{ title: "Auxiliar de Compras", color: "bg-violet-300", roles: ["Auxiliar de Compras"] }],
      },
    ],
  },
  {
    title: "Marketing", color: "bg-pink-500", roles: [],
    children: [
      { title: "Gerente de Marketing", color: "bg-pink-400", roles: ["Gerente de Marketing"],
        children: [{ title: "Auxiliar de Marketing", color: "bg-pink-300", roles: ["Auxiliar de Marketing"] }],
      },
    ],
  },
  {
    title: "RH", color: "bg-orange-500", roles: [],
    children: [
      { title: "Gerente de RH", color: "bg-orange-400", roles: ["Gerente de RH"],
        children: [{ title: "Auxiliar de RH", color: "bg-orange-300", roles: ["Auxiliar de RH"] }],
      },
    ],
  },
  {
    title: "Contabilidade", color: "bg-cyan-500", roles: [],
    children: [
      { title: "Gerente Contábil", color: "bg-cyan-400", roles: ["Gerente Contábil"],
        children: [{ title: "Auxiliar Contábil", color: "bg-cyan-300", roles: ["Auxiliar Contábil"] }],
      },
    ],
  },
  {
    title: "Administrativo", color: "bg-indigo-500", roles: [],
    children: [
      { title: "Gerente Administrativo", color: "bg-indigo-400", roles: ["Gerente Administrativo"],
        children: [
          { title: "Assistente Administrativo", color: "bg-indigo-300", roles: ["Assistente Administrativo"] },
          { title: "Faturista", color: "bg-indigo-300", roles: ["Faturista"] },
          { title: "Caixa", color: "bg-indigo-300", roles: ["Caixa"] },
        ],
      },
    ],
  },
  {
    title: "TI", color: "bg-sky-500", roles: [],
    children: [
      { title: "Gerente de TI", color: "bg-sky-400", roles: ["Gerente de TI"],
        children: [{ title: "Auxiliar de TI", color: "bg-sky-300", roles: ["Auxiliar de TI"] }],
      },
    ],
  },
  {
    title: "Limpeza", color: "bg-lime-500", roles: [],
    children: [
      { title: "Gerente de Limpeza", color: "bg-lime-400", roles: ["Gerente de Limpeza"],
        children: [{ title: "Auxiliar de Limpeza", color: "bg-lime-300", roles: ["Auxiliar de Limpeza"] }],
      },
    ],
  },
];

function getAvatarSrc(avatar: string, name: string) {
  return avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

function OrgCard({ node, employees, depth = 0 }: { node: OrgNode; employees: Employee[]; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const matched = employees.filter(e => node.roles.includes(e.role));
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => hasChildren && setExpanded(v => !v)}
        className={`relative min-w-[130px] max-w-[160px] rounded-xl px-3 py-2.5 text-white text-center shadow-md transition-all ${node.color} ${hasChildren ? "cursor-pointer hover:opacity-90 active:scale-95" : "cursor-default"}`}
      >
        <p className="text-[9px] font-black uppercase tracking-widest leading-tight">{node.title}</p>
        {matched.length > 0 && (
          <div className="mt-2 flex flex-col gap-1">
            {matched.map(emp => (
              <div key={emp.id} className="flex items-center gap-1.5 bg-white/20 rounded-lg px-1.5 py-1">
                <img src={getAvatarSrc(emp.avatar, emp.name)} alt={emp.name} className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/40" />
                <span className="text-[8px] font-bold truncate">{emp.name}</span>
              </div>
            ))}
          </div>
        )}
        {hasChildren && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full p-0.5 shadow">
            {expanded
              ? <ChevronDown className="w-2.5 h-2.5 text-slate-500" />
              : <ChevronRight className="w-2.5 h-2.5 text-slate-500" />}
          </div>
        )}
      </button>

      {hasChildren && expanded && (
        <>
          <div className="w-px h-5 bg-slate-200 mt-2" />
          <div className="flex gap-4 items-start">
            {node.children!.map((child, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="w-px h-3 bg-slate-200" />
                <OrgCard node={child} employees={employees} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OrgChartView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("usuarios").select("id,name,role,department,avatar").eq("status", "ativo").then(({ data }) => {
      setEmployees((data || []).map(u => ({ id: u.id, name: u.name, role: u.role || "", department: u.department || "", avatar: u.avatar || "" })));
      setLoading(false);
    });
  }, []);

  const directors = employees.filter(e => e.role === "Diretor");

  return (
    <div className="flex-1 flex flex-col gap-4 pb-6 overflow-hidden bg-[#F8FAFC]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
          <Users className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Organograma</h2>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Estrutura Corporativa Carflax</p>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">Carregando...</div>
        ) : (
          <div className="flex flex-col items-center gap-0 min-w-max mx-auto pt-4">
            {/* Diretoria */}
            <div className="flex gap-3">
              {directors.length > 0 ? directors.map(d => (
                <div key={d.id} className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl px-4 py-2.5 shadow-lg shadow-blue-600/20">
                  <img src={getAvatarSrc(d.avatar, d.name)} alt={d.name} className="w-8 h-8 rounded-full object-cover border-2 border-white/40" />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">{d.name}</span>
                  <span className="text-[7px] font-bold text-blue-200 uppercase">Diretor</span>
                </div>
              )) : (
                ["ZECA", "LETICIA"].map(name => (
                  <div key={name} className="flex flex-col items-center gap-1.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl px-4 py-2.5 shadow-lg shadow-blue-600/20">
                    <img src={getAvatarSrc("", name)} alt={name} className="w-8 h-8 rounded-full object-cover border-2 border-white/40" />
                    <span className="text-[9px] font-black text-white uppercase tracking-widest">{name}</span>
                    <span className="text-[7px] font-bold text-blue-200 uppercase">Diretor</span>
                  </div>
                ))
              )}
            </div>

            <div className="w-px h-6 bg-slate-200" />

            {/* Departamentos */}
            <div className="flex gap-6 items-start">
              {ORG_TREE.map((dept, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-slate-200" />
                  <OrgCard node={dept} employees={employees} depth={0} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

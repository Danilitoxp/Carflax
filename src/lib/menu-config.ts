export interface NavSubItem {
  label: string;
  value?: string; // permission key when different from label
}

export interface NavSection {
  label: string;
  permGroup: string; // group shown in UsersView permissions panel
  subItems?: NavSubItem[];
  leaderOnly?: boolean; // acesso liberado automaticamente para líderes, sem toggle manual no painel
}

// Single source of truth for sidebar navigation + permission groups.
// Adding a new subItem here automatically makes it appear in the UsersView permissions panel.
// Módulos liberados para todos (não aparecem no painel de permissões):
// - Dashboard > Geral e Produtos
// - Calendário (Eventos, Férias)
// - Sugestões
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Dashboard",
    permGroup: "DASHBOARD",
    subItems: [
      { label: "Geral" },
      { label: "Produtos" },
    ],
  },
  { label: "Esteira", permGroup: "ESSENCIAL" },
  {
    label: "Calendário",
    permGroup: "CALENDÁRIO",
    subItems: [{ label: "Eventos" }, { label: "Férias" }],
  },
  {
    label: "Comercial",
    permGroup: "COMERCIAL",
    subItems: [
      { label: "Minha Carteira", value: "Carteira" },
      { label: "Orçamentos" },
      { label: "Meus Pedidos" },
      { label: "Análise FRV" },
      { label: "Prospecções" },
      { label: "Campanhas" },
      { label: "Alugueis" },
      { label: "Relatórios" },
    ],
  },
  {
    label: "Marketing",
    permGroup: "MARKETING",
    subItems: [
      { label: "Whatsapp", value: "Whatsapp Evolution" },
      { label: "Whatsapp Go" },
      { label: "Leads" },
      { label: "Cronograma" },
      { label: "Pós-Venda" },
      { label: "Relatórios", value: "Relatórios Mkt" },
    ],
  },
  {
    label: "Coletor",
    permGroup: "LOGÍSTICA",
    subItems: [{ label: "Painel Coletor" }],
  },
  {
    label: "Entregas",
    permGroup: "LOGÍSTICA",
    subItems: [{ label: "Romaneios" }],
  },
  { label: "Scrum", permGroup: "GESTÃO & ADMIN", leaderOnly: true },
  { label: "Usuários", permGroup: "GESTÃO & ADMIN", leaderOnly: true },
  { label: "DB Admin", permGroup: "GESTÃO & ADMIN", leaderOnly: true },
  { label: "Sugestões", permGroup: "ESSENCIAL" },
];

// Extra action-level permissions not tied to sidebar sections.
// These stay hardcoded here since they control in-app features, not navigation.
export const EXTRA_PERMISSIONS: { group: string; label: string; leaderOnly?: boolean }[] = [
  { group: "COMERCIAL", label: "Criar Campanha" },
  { group: "LOGÍSTICA", label: "Lançar Entrega" },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Comunicados", leaderOnly: true },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Férias", leaderOnly: true },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Banners", leaderOnly: true },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Calendário", leaderOnly: true },
];

// Derived permission groups for UsersView — built automatically from NAV_SECTIONS + EXTRA_PERMISSIONS
function buildPermissionGroups() {
  const map = new Map<string, string[]>();

  // Define group order
  const ORDER = ["COMERCIAL", "MARKETING", "LOGÍSTICA", "GESTÃO & ADMIN"];
  ORDER.forEach(g => map.set(g, []));

  NAV_SECTIONS.forEach(section => {
    if (section.leaderOnly) return; // liberado automaticamente para líderes, sem toggle manual
    if (!map.has(section.permGroup)) map.set(section.permGroup, []);
    const arr = map.get(section.permGroup)!;
    if (section.subItems?.length) {
      section.subItems.forEach(sub => arr.push(sub.value || sub.label));
    } else {
      arr.push(section.label);
    }
  });

  EXTRA_PERMISSIONS.forEach(({ group, label, leaderOnly }) => {
    if (leaderOnly) return; // liberado automaticamente para líderes, sem toggle manual
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(label);
  });

  return Array.from(map.entries())
    .filter(([name, modules]) => modules.length > 0 && name !== "DASHBOARD" && name !== "CALENDÁRIO" && name !== "ESSENCIAL")
    .map(([name, modules]) => ({ name, modules }));
}

export const PERMISSION_GROUPS = buildPermissionGroups();

// All permission keys derived from nav (for isAllowed checks)
export const ALL_NAV_PERMISSIONS: string[] = NAV_SECTIONS.flatMap(s =>
  s.subItems?.length
    ? s.subItems.map(sub => sub.value || sub.label)
    : [s.label]
);

// Prefixo usado no "value" dos subquadros da Esteira, pra não colidir com
// labels de outras seções do menu (ex: um subquadro chamado "Marketing").
export const ESTEIRA_SUBQUADRO_PREFIX = "esteira-subquadro:";

// ─── Controle de acesso a seções ──────────────────────────────────────────────
// Fonte única de verdade para "quem pode entrar em cada tela". Antes essa lógica
// existia duplicada (uma no AppSidebar, para mostrar/esconder o menu, e outra no
// App, para bloquear/redirecionar), e as duas divergiam — por isso líderes viam
// "Usuários" no menu mas eram redirecionados ao clicar. Aqui é o superset de tudo
// que já liberava acesso, para nunca negar algo que o usuário legitimamente vê.
export interface AccessProfile {
  role?: string;
  department?: string;
  permissions?: string[];
  is_admin?: boolean;
  is_leader?: boolean;
}

// Liberado para todos (configurações pessoais + dashboards + módulos essenciais)
const PUBLIC_SECTIONS = [
  "Meu Perfil", "Aparência", "Notificações", "Segurança",
  "Dashboard", "Geral", "Produtos",
  "Calendário", "Eventos", "Férias",
  "Esteira", "Minha Esteira", "Sugestões",
  "Organograma", "Coletor", "Painel Coletor",
  "Relatórios", "Relatórios Mkt",
];

const VENDEDOR_SECTIONS = [
  "Comercial", "Orçamentos", "Análise FRV", "Carteira", "Ligações", "Campanhas",
  "Alugueis", "Logística", "Romaneios", "Entregas",
];

const MARKETING_SECTIONS = [
  "Marketing", "Whatsapp Evolution", "Whatsapp Go", "Leads", "Cronograma", "Pós-Venda", "Relatórios Mkt",
];

const VENDAS_SECTIONS = [
  "Comercial", "Orçamentos", "Meus Pedidos", "Análise FRV", "Carteira", "Prospecções", "Campanhas", "Alugueis", "Relatórios",
];

// Módulos de Gestão & Admin liberados automaticamente para líderes
const LEADER_SECTIONS = ["Scrum", "Usuários", "DB Admin"];

export function canAccessSection(profile: AccessProfile | null | undefined, item: string): boolean {
  if (!item) return false;
  if (!profile) return false;

  const role = profile.role?.toUpperCase() || "";
  // Admin e Gerente veem tudo
  if (profile.is_admin || role.includes("ADMIN") || role.includes("GERENTE")) return true;

  // Subquadros da Esteira são abertos pra todo mundo, igual a própria Esteira
  if (item.startsWith(ESTEIRA_SUBQUADRO_PREFIX)) return true;

  if (PUBLIC_SECTIONS.includes(item)) return true;

  if (profile.is_leader && LEADER_SECTIONS.includes(item)) return true;

  if (role.includes("VENDEDOR") && VENDEDOR_SECTIONS.includes(item)) return true;

  if (profile.department?.toUpperCase() === "MARKETING" && MARKETING_SECTIONS.includes(item)) return true;

  const dept = profile.department?.toUpperCase();
  if ((dept === "VENDAS" || dept === "COMERCIAL") && VENDAS_SECTIONS.includes(item)) return true;

  // Permissões manuais atribuídas no cadastro do usuário
  if (profile.permissions?.includes(item)) return true;

  return false;
}

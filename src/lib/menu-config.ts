export interface NavSubItem {
  label: string;
  value?: string; // permission key when different from label
}

export interface NavSection {
  label: string;
  permGroup: string; // group shown in UsersView permissions panel
  subItems?: NavSubItem[];
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
  {
    label: "Calendário",
    permGroup: "CALENDÁRIO",
    subItems: [{ label: "Eventos" }, { label: "Férias" }],
  },
  {
    label: "Comercial",
    permGroup: "COMERCIAL",
    subItems: [
      { label: "Orçamentos" },
      { label: "Meus Pedidos" },
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
      { label: "Whatsapp Evolution" },
      { label: "Whatsapp Oficial" },
      { label: "Whatsapp Go" },
      { label: "Leads" },
      { label: "Cronograma" },
      { label: "Esteira" },
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
  { label: "Usuários", permGroup: "GESTÃO & ADMIN" },
  { label: "DB Admin", permGroup: "GESTÃO & ADMIN" },
  { label: "Sugestões", permGroup: "ESSENCIAL" },
];

// Extra action-level permissions not tied to sidebar sections.
// These stay hardcoded here since they control in-app features, not navigation.
export const EXTRA_PERMISSIONS: { group: string; label: string }[] = [
  { group: "COMERCIAL", label: "Criar Campanha" },
  { group: "LOGÍSTICA", label: "Lançar Entrega" },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Comunicados" },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Férias" },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Banners" },
  { group: "GESTÃO & ADMIN", label: "Gerenciar Calendário" },
];

// Derived permission groups for UsersView — built automatically from NAV_SECTIONS + EXTRA_PERMISSIONS
function buildPermissionGroups() {
  const map = new Map<string, string[]>();

  // Define group order
  const ORDER = ["COMERCIAL", "MARKETING", "LOGÍSTICA", "GESTÃO & ADMIN"];
  ORDER.forEach(g => map.set(g, []));

  NAV_SECTIONS.forEach(section => {
    if (!map.has(section.permGroup)) map.set(section.permGroup, []);
    const arr = map.get(section.permGroup)!;
    if (section.subItems?.length) {
      section.subItems.forEach(sub => arr.push(sub.value || sub.label));
    } else {
      arr.push(section.label);
    }
  });

  EXTRA_PERMISSIONS.forEach(({ group, label }) => {
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

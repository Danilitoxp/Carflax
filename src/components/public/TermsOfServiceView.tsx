import { useState } from "react";
import { Scale, FileText, CheckCircle2, ChevronRight, AlertTriangle, HelpCircle, ShieldAlert } from "lucide-react";

export function TermsOfServiceView() {
  const [activeSection, setActiveSection] = useState<string>("acceptance");

  const sections = [
    {
      id: "acceptance",
      title: "1. Aceitação dos Termos",
      icon: CheckCircle2,
      content: `Ao acessar e utilizar o portal e os serviços do **Carflax HUB**, gerenciado pela **Carflax Hidráulica e Elétrica**, você declara ter lido, compreendido e concordado em cumprir estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, você não deve utilizar nossa plataforma ou nossos canais oficiais de comunicação.`
    },
    {
      id: "usage",
      title: "2. Condições de Uso",
      icon: FileText,
      content: `O Carflax HUB é uma plataforma corporativa voltada para a gestão de atendimento e vendas. A utilização da ferramenta está sujeita às seguintes regras:
      \n• **Finalidade Exclusiva:** O uso do sistema é exclusivo para fins comerciais legítimos relacionados à Carflax.
      \n• **Respeito às Políticas da Meta:** Todas as comunicações enviadas via WhatsApp Oficial devem respeitar as Políticas Comerciais e de Mensagens do WhatsApp da Meta Platforms Inc.
      \n• **Proibições:** É expressamente vedado o envio de mensagens de spam, conteúdo ofensivo, spam massivo não solicitado (opt-out desrespeitado) ou qualquer prática que configure assédio comercial.`
    },
    {
      id: "responsibilities",
      title: "3. Responsabilidades do Usuário",
      icon: ShieldAlert,
      content: `Você é responsável por todas as interações realizadas na plataforma através de sua identificação. Isso inclui:
      \n• **Veracidade das Informações:** Garantir que todos os dados fornecidos sobre negociações, produtos e orçamentos sejam verídicos.
      \n• **Segurança das Credenciais:** Manter o sigilo de sua senha e conta de acesso do Carflax HUB, notificando imediatamente a administração em caso de qualquer uso não autorizado.`
    },
    {
      id: "liability",
      title: "4. Limitação de Responsabilidade",
      icon: AlertTriangle,
      content: `A Carflax busca manter a plataforma estável e segura, mas não garante a ausência de interrupções temporárias decorrentes de falhas em serviços de terceiros (como falhas nos servidores do Supabase ou instabilidade na rede de API do WhatsApp da Meta).
      \nNossos serviços são prestados "como estão", e não nos responsabilizamos por quaisquer danos indiretos ou lucros cessantes decorrentes do uso da plataforma.`
    },
    {
      id: "modifications",
      title: "5. Alterações nos Termos",
      icon: Scale,
      content: `Estes Termos de Serviço podem ser atualizados periodicamente para refletir mudanças regulatórias ou aprimoramentos técnicos de nossos serviços. A data da última atualização estará sempre no topo da página. O uso contínuo dos serviços após tais modificações constituirá a aceitação dos novos termos.`
    },
    {
      id: "contact",
      title: "6. Dúvidas e Suporte",
      icon: HelpCircle,
      content: `Caso você tenha qualquer dúvida sobre as disposições destes Termos de Serviço ou precise de suporte relacionado aos seus direitos e deveres na utilização da plataforma Carflax HUB, entre em contato através do e-mail:
      \n**marketing@carflax.com.br**`
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              CARFLAX
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
            <span>Portal de Transparência</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-4 gap-12 relative z-10">
        {/* Sidebar Nav */}
        <aside className="lg:col-span-1 space-y-2">
          <div className="sticky top-28 space-y-1">
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase px-3 mb-3">Tópicos dos Termos</p>
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    setActiveSection(sec.id);
                    document.getElementById(sec.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-center gap-3 border text-xs font-bold ${
                    isActive 
                      ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-sm" 
                      : "bg-slate-900/20 border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{sec.title.split(". ")[1]}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-indigo-400 animate-pulse" />}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content Body */}
        <div className="lg:col-span-3 space-y-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
              <CheckCircle2 className="w-3.5 h-3.5" /> Atualizado em Junho de 2026
            </div>
            <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Termos de Serviço
            </h1>
            <p className="text-slate-400 font-medium text-base leading-relaxed">
              Estes Termos de Serviço regulam a utilização de nossos sistemas, dados e integrações oficiais de comunicação da Carflax Hidráulica e Elétrica no âmbito do console da Meta.
            </p>
          </div>

          <div className="space-y-8">
            {sections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <section
                  key={sec.id}
                  id={sec.id}
                  className={`p-8 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? "bg-slate-900/40 border-indigo-500/20 shadow-xl shadow-indigo-500/5" 
                      : "bg-slate-900/10 border-slate-900 hover:border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3.5 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${
                      isActive ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-slate-950 border-slate-850 text-slate-400"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-black tracking-tight text-white uppercase">{sec.title}</h2>
                  </div>
                  <div className="text-slate-350 text-sm font-medium leading-relaxed whitespace-pre-line">
                    {sec.content}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-10 mt-16 bg-slate-950/40">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          <span>&copy; {new Date().getFullYear()} Carflax Hidráulica e Elétrica. Todos os direitos reservados.</span>
          <span>Em conformidade com a LGPD</span>
        </div>
      </footer>
    </div>
  );
}

import { useState } from "react";
import { Shield, Lock, Eye, FileText, Share2, Mail, CheckCircle2, ChevronRight } from "lucide-react";

export function PrivacyPolicyView() {
  const [activeSection, setActiveSection] = useState<string>("general");

  const sections = [
    {
      id: "general",
      title: "1. Informações Gerais",
      icon: FileText,
      content: `A **Carflax Hidráulica e Elétrica** está empenhada em proteger a privacidade e os dados pessoais de seus clientes, parceiros e colaboradores. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos as informações fornecidas por você através das nossas ferramentas de comunicação, com destaque para a integração com a **API Oficial do WhatsApp (Meta Cloud API)**.`
    },
    {
      id: "collection",
      title: "2. Coleta de Dados",
      icon: Eye,
      content: `Coletamos e processamos apenas as informações estritamente necessárias para a prestação de nossos serviços de atendimento e campanhas de marketing comercial. Esses dados incluem:
      \n• **Dados de Contato:** Nome de perfil do WhatsApp (*Push Name*), número de telefone celular.
      \n• **Histórico de Mensagens:** Conteúdo textual das mensagens, reações e registros de timestamps de envios e recebimentos.
      \n• **Mídias e Arquivos:** Imagens, vídeos, áudios e documentos (como PDFs de orçamentos) transmitidos durante o atendimento, que são armazenados temporariamente em nossos servidores do Supabase Storage.`
    },
    {
      id: "usage",
      title: "3. Uso das Informações",
      icon: Lock,
      content: `As informações coletadas são utilizadas exclusivamente para as seguintes finalidades:
      \n• **Atendimento ao Cliente:** Responder a dúvidas, fornecer orçamentos e prestar assistência técnica.
      \n• **Gestão Comercial (CRM):** Manter o histórico de interações e negociações com cada cliente e registrar as prospecções.
      \n• **Comunicação de Marketing:** Envio de alertas de ofertas e campanhas promocionais ativas autorizadas pelo contato.`
    },
    {
      id: "sharing",
      title: "4. Compartilhamento e Transferência",
      icon: Share2,
      content: `Nós **não vendemos, alugamos ou comercializamos** seus dados pessoais com terceiros. A transferência de dados ocorre apenas para os parceiros de infraestrutura tecnológica essenciais para a operação da Carflax:
      \n• **Meta Platforms Inc.**: Utilizada para trafegar mensagens via API Oficial do WhatsApp.
      \n• **Supabase Inc.**: Utilizado para armazenamento do banco de dados e arquivos de mídia criptografados.`
    },
    {
      id: "rights",
      title: "5. Seus Direitos (LGPD)",
      icon: Shield,
      content: `Em conformidade com a **Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/18)**, você possui os seguintes direitos relativos aos seus dados pessoais:
      \n• Confirmar a existência de tratamento de dados;
      \n• Acessar as informações que mantemos sobre você;
      \n• Solicitar a retificação de dados incorretos ou desatualizados;
      \n• Solicitar a eliminação definitiva dos seus dados de nossa base de dados comercial.`
    },
    {
      id: "contact",
      title: "6. Contato",
      icon: Mail,
      content: `Para exercer seus direitos de privacidade, tirar dúvidas ou solicitar a remoção de seus dados de contato, entre em contato diretamente com o nosso encarregado de dados através do e-mail:
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
              <Shield className="w-5 h-5 text-white" />
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
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase px-3 mb-3">Tópicos da Política</p>
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
              Política de Privacidade
            </h1>
            <p className="text-slate-400 font-medium text-base leading-relaxed">
              Esta política estabelece os termos de tratamento de dados pessoais coletados nas interações comerciais e de marketing pela Carflax, estando em conformidade com as diretrizes do ecossistema de desenvolvedores da Meta e a LGPD.
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

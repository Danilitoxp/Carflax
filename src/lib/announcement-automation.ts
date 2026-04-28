import { supabase } from "./supabase";
import { apiDashboardGeral } from "./api";


/**
 * Announcement Automation Service (Birthdays, Work Anniversaries & Calendar Events)
 */

let isAutomationRunning = false;

export async function runAnnouncementAutomation() {
  if (isAutomationRunning) {
    console.log("[Automation] Already running, skipping concurrent call.");
    return { birthdays: 0, workAnniversaries: 0, events: 0, goals: 0 };
  }
  
  isAutomationRunning = true;
  console.log("Starting announcement automation check...");
  
  const results = {
    birthdays: 0,
    workAnniversaries: 0,
    events: 0,
    goals: 0
  };

  try {
    results.birthdays = await checkAndPostBirthdays();
    results.workAnniversaries = await checkAndPostWorkAnniversaries();
    results.events = await checkAndPostEvents();
    results.goals = await checkAndPostGoalAchievements();

    console.log("Automation completed:", results);
    return results;
  } catch (error) {
    console.error("Error in announcement automation:", error);
    return results;
  } finally {
    isAutomationRunning = false;
  }
}

async function checkAndPostBirthdays() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const { data: allUsers } = await supabase
    .from("usuarios")
    .select("id, name, avatar, birth_date");

  if (!allUsers || allUsers.length === 0) return 0;

  const birthdayUsers = allUsers.filter(user => {
    if (!user.birth_date) return false;
    // birth_date is usually YYYY-MM-DD
    return user.birth_date.includes(`-${month}-${day}`);
  });

  if (birthdayUsers.length === 0) return 0;

  let postsCreated = 0;
  for (const user of birthdayUsers) {
    const postTitle = `FELIZ ANIVERSÁRIO, ${user.name.toUpperCase()}! 🎂`;
    
    const { data: existingPost } = await supabase
      .from("comunicados")
      .select("id")
      .eq("titulo", postTitle)
      .gte("created_at", `${today.getFullYear()}-${month}-${day}T00:00:00`)
      .maybeSingle();

    if (!existingPost) {
      await supabase.from("comunicados").insert([{
        titulo: postTitle,
        descricao: `Hoje celebramos a vida da noss(o)a colega ${user.name}! A família Carflax se alegra em compartilhar esse momento especial ao seu lado, reconhecendo toda a dedicação, profissionalismo e energia que você contribui no dia a dia. Parabéns! 🎈✨`,
        filtro: "Social",
        image_url: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
        tag: "Sistema Carflax",
        likes: 0,
        liked_by: []
      }]);
      postsCreated++;
    }
  }
  return postsCreated;
}

async function checkAndPostWorkAnniversaries() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  const { data: allUsers } = await supabase
    .from("usuarios")
    .select("id, name, avatar, admission_date");

  if (!allUsers || allUsers.length === 0) return 0;

  const users = allUsers.filter(user => {
    if (!user.admission_date) return false;
    return user.admission_date.includes(`-${month}-${day}`);
  });

  if (users.length === 0) return 0;

  let postsCreated = 0;
  for (const user of users) {
    if (!user.admission_date) continue;
    
    const admissionYear = parseInt(user.admission_date.split('-')[0]);
    const years = currentYear - admissionYear;
    
    if (years <= 0) continue; 

    const postTitle = `PARABÉNS PELO ANIVERSÁRIO DE EMPRESA, ${user.name.toUpperCase()}! 🎖️`;
    
    const { data: existingPost } = await supabase
      .from("comunicados")
      .select("id")
      .eq("titulo", postTitle)
      .gte("created_at", `${currentYear}-${month}-${day}T00:00:00`)
      .maybeSingle();

    if (!existingPost) {
      await supabase.from("comunicados").insert([{
        titulo: postTitle,
        descricao: `Hoje comemoramos os ${years} ${years === 1 ? 'ano' : 'anos'} de dedicação e história do(a) ${user.name} na Carflax! 🚀\n\nÉ um orgulho ter você em nosso time. Obrigado por toda a parceria, empenho e por fazer parte da nossa trajetória. Que venham muitos outros anos de sucesso juntos! 🥂✨`,
        filtro: "Empresa",
        image_url: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`,
        tag: "Sistema Carflax",
        likes: 0,
        liked_by: []
      }]);
      postsCreated++;
    }
  }
  return postsCreated;
}

async function checkAndPostEvents() {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const day = today.getDate();

  const { data: events } = await supabase
    .from("eventos_calendario")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .eq("day", day);

  if (!events || events.length === 0) return 0;

  let postsCreated = 0;
  for (const event of events) {
    const postTitle = event.title.toUpperCase();

    const { data: existingPost } = await supabase
      .from("comunicados")
      .select("id")
      .eq("titulo", postTitle)
      .gte("created_at", `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`)
      .maybeSingle();

    if (!existingPost) {
      await supabase.from("comunicados").insert([{
        titulo: postTitle,
        descricao: `Fiquem atentos! Hoje temos um evento importante em nossa agenda: ${event.title}. Não esqueçam de participar!`,
        filtro: "Eventos",
        image_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${event.id}`,
        tag: "Carflax",
        likes: 0,
        liked_by: []
      }]);
      postsCreated++;
    }
  }
  return postsCreated;
}

async function checkAndPostGoalAchievements() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dataStr = `${year}-${month}-${day}`;
  const mesAno = `${month}/${year}`;

  try {
    const metrics = await apiDashboardGeral(undefined, dataStr);
    if (!metrics || metrics.length === 0) return 0;

    let postsCreated = 0;
    const winners = metrics.filter(m => {
      const total = Number(m.TOTAL || 0);
      const meta = Number(m.META || 0);
      return meta > 0 && total >= meta;
    });

    for (const winner of winners) {
      const sellerName = winner.NOME_VENDEDOR.toUpperCase();
      const postTitle = `META BATIDA: ${sellerName} - ${mesAno} 🏆`;

      const { data: existingPost } = await supabase
        .from("comunicados")
        .select("id")
        .eq("titulo", postTitle)
        .maybeSingle();

      if (!existingPost) {
        // Busca o avatar usando o código do vendedor para ser 100% preciso
        const { data: userData } = await supabase
          .from("usuarios")
          .select("avatar")
          .eq("operator_code", String(winner.COD_VENDEDOR))
          .maybeSingle();

        await supabase.from("comunicados").insert([{
          titulo: postTitle,
          descricao: `É com imenso orgulho que anunciamos: ${winner.NOME_VENDEDOR} ACABA DE BATER A META DE ${mesAno}! 🚀✨\n\nParabéns por todo o empenho, resiliência e foco nos resultados. Você é um exemplo de excellence para toda a equipe Carflax. Que essa conquista seja apenas o começo de um mês extraordinário! Vamos pra cima! 🥂👊`,
          filtro: "Empresa",
          image_url: userData?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.NOME_VENDEDOR}`,
          tag: "Carflax",
          likes: 0,
          liked_by: []
        }]);
        postsCreated++;
      }
    }
    return postsCreated;
  } catch (error) {
    console.error("Error in goal automation:", error);
    return 0;
  }
}

// @ts-expect-error: Deno module resolution
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DenoEnv {
  get(key: string): string | undefined;
}
declare const Deno: {
  env: DenoEnv;
  serve(handler: () => Promise<Response>): void;
};

interface UserData {
  name: string;
  avatar: string | null;
  birth_date: string | null;
  admission_date: string | null;
}

interface HolidayData {
  date: string;
  name: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

Deno.serve(async () => {
  try {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() + 1
    const day = today.getDate()
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

    console.log(`Running Universal Automation: ${dateStr}`)
    
    const [userResp, eventResp, holidayResp] = await Promise.all([
      supabase.from("usuarios").select("name, avatar, birth_date, admission_date"),
      supabase.from("eventos_calendario").select("*").eq("year", year).eq("month", month).eq("day", day),
      fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`).then(r => r.ok ? r.json() : [])
    ])

    const posts = [];

    // A. Aniversários de Vida
    const birthdays = (userResp.data as UserData[] || []).filter((u: UserData) => {
      if (!u.birth_date) return false;
      const dateParts = u.birth_date.split("-");
      const m = dateParts[1];
      const d = dateParts[2];
      return parseInt(m) === month && parseInt(d) === day;
    });
    for (const u of birthdays) {
      posts.push({
        titulo: `🎈 FELIZ ANIVERSÁRIO, ${u.name.toUpperCase()}!`,
        descricao: `Mais um ciclo se inicia para um membro especial da nossa família! 🎂 Hoje é dia de celebrar a vida e as conquistas do(a) ${u.name}. Que este novo ano traga saúde, prosperidade e muitos motivos para sorrir. Agradecemos por compartilhar sua energia conosco todos os dias. Parabéns! ✨`,
        filtro: "Social",
        image_url: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
        tag: "Carflax"
      });
    }

    // B. Aniversários de Empresa
    const workAnniversaries = (userResp.data as UserData[] || []).filter((u: UserData) => {
      if (!u.admission_date) return false;
      const parts = u.admission_date.split("-");
      const y = parts[0];
      const m = parts[1];
      const d = parts[2];
      const years = year - parseInt(y);
      return years > 0 && parseInt(m) === month && parseInt(d) === day;
    });
    for (const u of workAnniversaries) {
      if (!u.admission_date) continue;
      const admissionYear = parseInt(u.admission_date.split("-")[0]);
      const yearsCount = year - admissionYear;
      const anosTexto = yearsCount === 1 ? "1 ano" : `${yearsCount} anos`;
      
      posts.push({
        titulo: `🎉 Parabéns, ${u.name}! ${anosTexto} de Carflax!`,
        descricao: `Hoje comemoramos um marco importante:\n\n${anosTexto} de dedicação, crescimento e conquistas do(a) ${u.name} conosco. Sua contribuição tem sido essencial para o nosso desenvolvimento e para tudo o que construímos até aqui.\n\nObrigado por fazer parte da nossa história, seguimos juntos rumo a novos desafios! 🚀`,
        filtro: "Empresa",
        image_url: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`,
        tag: "Carflax"
      });
    }

    // C. Eventos Manuais
    for (const ev of (eventResp.data || [])) {
      posts.push({
        titulo: `🎯 AGENDA: ${ev.title.toUpperCase()}`,
        descricao: ev.description || `Preparem-se para um dia de novos aprendizados e integração! 📢 Hoje teremos o evento: ${ev.title}. Aproveite essa oportunidade para crescermos juntos em direção à nossa meta. Nos vemos lá! ✨`,
        filtro: "Eventos",
        image_url: `https://api.dicebear.com/7.x/shapes/svg?seed=${ev.id}`,
        tag: "Carflax"
      });
    }

    // D. Feriados
    const holiday = (holidayResp as HolidayData[] || []).find((h: HolidayData) => h.date === dateStr);
    if (holiday) {
      posts.push({
        titulo: `🇧🇷 FERIADO: ${holiday.name.toUpperCase()}`,
        descricao: `Informamos que hoje celebramos o feriado de ${holiday.name}. Um momento importante de pausa para renovar as energias e valorizar nossa história. Desejamos a todos um excelente e revigorante descanso! ✨`,
        filtro: "Avisos",
        image_url: `https://api.dicebear.com/7.x/identicon/svg?seed=${holiday.name}`,
        tag: "Carflax"
      });
    }

    // 2. Publicar posts
    let createdCount = 0;
    for (const post of posts) {
      const { data: exists } = await supabase
        .from("comunicados")
        .select("id")
        .eq("titulo", post.titulo)
        .gte("created_at", `${dateStr}T00:00:00`)
        .maybeSingle();

      if (!exists) {
        await supabase.from("comunicados").insert([{
          ...post,
          likes: 0,
          liked_by: []
        }]);
        createdCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, postsProcessed: posts.length, postsCreated: createdCount }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: unknown) {
    console.error("Fatal error:", error)
    const errMsg = error instanceof Error ? error.message : "Unknown error"
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

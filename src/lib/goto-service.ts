const ALOIA_API_URL = import.meta.env.VITE_ALOIA_API_URL;

export async function getCallHistory() {
  try {
    // Busca chamadas processadas diretamente do backend Aloia (Easypanel)
    const resp = await fetch(`${ALOIA_API_URL}/api/calls?only_inbound=false`);
    if (!resp.ok) throw new Error("Falha ao comunicar com Aloia API");
    
    const calls = await resp.json();

    return calls.map((c: any) => ({
      id: c.id,
      clientName: c.client || 'Desconhecido',
      type: c.direction === 'inbound' ? 'incoming' : 'outgoing',
      duration: c.duration,
      timestamp: c.date,
      status: c.sentiment === 'Positivo' ? 'Concluída' : (c.sentiment === 'Pendente' ? 'Concluída' : (c.sentiment === 'Abandonada' ? 'Perdida' : 'Concluída')),
      responsible: c.agent,
      phoneNumber: c.client,
      summary: c.summary,
      audio_url: c.audio_url,
      score: c.score,
      recording_id: c.recording_id
    }));
  } catch (err) {
    console.error("Erro ao buscar histórico GoTo:", err);
    return [];
  }
}

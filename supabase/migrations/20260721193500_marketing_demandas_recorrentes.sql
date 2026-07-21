-- Tabela de Demandas Recorrentes de Marketing (armazenadas 100% no Supabase)
CREATE TABLE IF NOT EXISTS marketing_demandas_recorrentes (
  id text PRIMARY KEY,
  title text NOT NULL,
  description text,
  tipo text NOT NULL CHECK (tipo IN ('diario', 'dias_semana', 'semanal', 'mensal')),
  dias_semana jsonb,
  dia_semana_especifico integer DEFAULT 1,
  dia_mes_especifico integer DEFAULT 1,
  tag_name text DEFAULT 'Média',
  subtasks jsonb,
  owner_id text,
  active boolean DEFAULT true,
  last_generated_date text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilita RLS com permissão total para leitura e gravação
ALTER TABLE marketing_demandas_recorrentes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura total em demandas recorrentes" 
  ON marketing_demandas_recorrentes FOR SELECT USING (true);

CREATE POLICY "Permitir inserção total em demandas recorrentes" 
  ON marketing_demandas_recorrentes FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir atualização total em demandas recorrentes" 
  ON marketing_demandas_recorrentes FOR UPDATE USING (true);

CREATE POLICY "Permitir exclusão total em demandas recorrentes" 
  ON marketing_demandas_recorrentes FOR DELETE USING (true);

-- Seed de rotinas iniciais cadastradas diretamente no banco Supabase
INSERT INTO marketing_demandas_recorrentes (id, title, description, tipo, dias_semana, tag_name, subtasks, active)
VALUES 
(
  'rotina-stories-diarios',
  '📱 3 Stories Diários (Postar Roteiros do Social Media)',
  'Postar e executar a sequência de 3 Stories diários com base nos roteiros criados pelo Social Media.',
  'dias_semana',
  '[1, 2, 3, 4, 5]'::jsonb,
  'Alta',
  '["Story 1 (Manhã): Postar Story do Roteiro 1", "Story 2 (Tarde): Postar Story do Roteiro 2 (Produto/Dica)", "Story 3 (Fim da Tarde): Postar Story do Roteiro 3 (Engajamento/CTA)"]'::jsonb,
  true
),
(
  'rotina-reels-ter-qui',
  '🎬 2 Reels da Semana (Postar Roteiros do Social Media)',
  'Gravar/Editar/Postar os 2 Reels semanais (Terça e Quinta) com os roteiros aprovados pelo Social Media.',
  'dias_semana',
  '[2, 4]'::jsonb,
  'Urgente',
  '["Postar/Executar Reel de Terça (Roteiro do Social Media)", "Postar/Executar Reel de Quinta (Roteiro do Social Media)"]'::jsonb,
  true
),
(
  'rotina-atendimento-directs',
  '💬 Atendimento & Redirecionamento de Leads das Redes',
  'Responder directs, comentários e encaminhar orçamentos para o comercial.',
  'dias_semana',
  '[1, 2, 3, 4, 5]'::jsonb,
  'Urgente',
  '["Responder todos os Directs e comentários (máx. 30 min)", "Verificar links do WhatsApp da Bio e anúncios", "Encaminhar interessados em orçamento para a equipe de vendas"]'::jsonb,
  true
),
(
  'rotina-avaliacoes-google',
  '⭐ Avaliações no Google Meu Negócio',
  'Responder avaliações recebidas e disparar convites de 5 estrelas para clientes.',
  'dias_semana',
  '[1, 2, 3, 4, 5]'::jsonb,
  'Média',
  '["Responder 100% das avaliações do Google no dia", "Pedir lista de vendas do dia com o comercial", "Disparar mensagem no WhatsApp para 5 a 10 clientes pedindo avaliação no Google"]'::jsonb,
  true
),
(
  'rotina-encarte-quarta',
  '🎨 Encarte de Promoções da Semana',
  'Divulgação dos produtos em destaque na semana para os clientes.',
  'semanal',
  '[]'::jsonb,
  'Alta',
  '["Selecionar 3 a 5 produtos em oferta com o comercial", "Criar imagem do encarte semanal", "Publicar no feed/stories e enviar nos grupos de clientes do WhatsApp"]'::jsonb,
  true
),
(
  'rotina-relatorio-sexta',
  '📊 Relatório Semanal & Alinhamento com Vendas',
  'Análise de alcance, leads gerados e planejamento da semana seguinte.',
  'semanal',
  '[]'::jsonb,
  'Média',
  '["Extrair alcance, novos seguidores e leads do WhatsApp", "Reunião rápida de 10 min com gerente comercial sobre demandas da próxima semana"]'::jsonb,
  true
),
(
  'rotina-mensal-google-waze',
  '🗓️ Atualização Mensal do Google Meu Negócio & Waze',
  'Renovar fotos da loja, equipe, fachada e horários.',
  'mensal',
  '[]'::jsonb,
  'Baixa',
  '["Subir fotos novas da fachada, balcão e equipe", "Conferir horários de funcionamento e dados de contato"]'::jsonb,
  true
),
(
  'rotina-mensal-parceiros',
  '🤝 Relacionamento com Eletricistas e Encanadores Parceiros',
  'Contato especial de relacionamento e ofertas exclusivas para parceiros.',
  'mensal',
  '[]'::jsonb,
  'Média',
  '["Mapear lista de parceiros recorrentes", "Enviar mensagem com agradecimento ou condição especial do mês"]'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

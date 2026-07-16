-- Revisão do plano do Encontro do Instalador (versão de 16/07/2026).
-- O evento deixou de ser café da manhã e virou buffet no fim do expediente,
-- com metas menores. Alinha o registro do banco ao documento.
--
--   Horário          07h30–10h00  ->  17h30–19h30 (Buffet do Instalador)
--   Meta de presença      60–80   ->  40–50
--   Convites             ~100     ->  ~80 (margem de ausência de ~30% -> ~40%)
--   Brindes do kit          80    ->  60 unidades mínimas por fornecedor
--
-- Verba total segue R$ 19.000 (Amanco 8.000 + 11 × 1.000).

update public.eventos
   set hora_inicio       = time '17:30',
       hora_fim          = time '19:30',
       publico_meta_min  = 40,
       publico_meta_max  = 50,
       convidados_meta   = 80,
       brindes_meta      = 60,
       descricao         = 'Grande encontro unificando os profissionais dos segmentos hidráulico e elétrico, '
                           'promovendo uma experiência completa para clientes, fornecedores e parceiros, com foco '
                           'em relacionamento, reativação de clientes e venda no balcão. Buffet do Instalador no fim '
                           'do expediente: o horário da tarde permite participar após concluir os serviços do dia e '
                           'favorece quem já passa na Carflax para comprar material ou retirar pedidos. O formato com '
                           'buffet incentiva maior permanência, mais interação com os estandes e networking entre os '
                           'profissionais.',
       updated_at        = now()
 where nome = 'Encontro do Instalador Carflax';

-- A cota da Amanco não mudou, mas a contrapartida citava "horário de pico
-- (8h–9h)", que não existe mais na janela das 17h30–19h30. O documento manteve
-- essa linha desatualizada; aqui o horário sai e fica só o critério (pico),
-- para não registrar uma promessa impossível de cumprir.
update public.evento_fornecedores f
   set observacoes = replace(
         f.observacoes,
         'demonstração no horário de pico (8h–9h)',
         'demonstração no horário de pico do evento'
       ),
       updated_at = now()
  from public.eventos e
 where f.evento_id = e.id
   and e.nome = 'Encontro do Instalador Carflax'
   and f.marca = 'Amanco'
   and f.observacoes like '%8h–9h%';

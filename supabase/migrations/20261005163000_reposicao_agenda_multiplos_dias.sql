-- Suporte a múltiplos dias da semana na agenda de reposição.
--
-- Antes a agenda só permitia escolher 1 dia (dia_semana integer: 1=seg ... 5=sex).
-- Agora permite múltiplos dias (ex: seg, qua, sex para a curva B).
-- Mantemos a coluna legada dia_semana sincronizada com o primeiro dia para
-- retrocompatibilidade total com queries legadas.

alter table public.reposicao_agenda
  add column if not exists dias_semana integer[];

-- Migra agendamentos existentes copiando o dia_semana para o array dias_semana
update public.reposicao_agenda
   set dias_semana = ARRAY[dia_semana]
 where (dias_semana is null or array_length(dias_semana, 1) is null)
   and dia_semana is not null;

-- Permite dia_semana ser nulo (caso futuramente seja descontinuado)
alter table public.reposicao_agenda
  alter column dia_semana drop not null;

comment on column public.reposicao_agenda.dias_semana is
  'Dias da semana em que a agenda executa (1=Segunda ... 5=Sexta). Permite múltiplos dias (ex: [1, 3, 5]).';

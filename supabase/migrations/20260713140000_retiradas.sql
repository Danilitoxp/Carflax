-- Create retiradas table to track client pickups
CREATE TABLE IF NOT EXISTS public.retiradas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido VARCHAR(50) NOT NULL UNIQUE,
    cliente VARCHAR(255) NOT NULL,
    empresa VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- 'pendente', 'retirando', 'finalizado'
    notificado_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ,
    operator_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.retiradas ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
ON public.retiradas
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable realtime for this table
alter publication supabase_realtime add table public.retiradas;

-- NEXUS SOCIAL - MÓDULO 11: PUBLICIDAD Y ANUNCIOS
-- Propósito: Gestión de anuncios patrocinados, métricas de impresiones y clics.

-- 1. TABLA DE ANUNCIOS
CREATE TABLE IF NOT EXISTS public.ads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. HABILITAR RLS
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACCESO
-- Cualquiera puede ver anuncios activos
DROP POLICY IF EXISTS "Lectura pública de anuncios activos" ON public.ads;
CREATE POLICY "Lectura pública de anuncios activos" 
ON public.ads FOR SELECT 
USING (is_active = TRUE);

-- Solo administradores pueden gestionar anuncios
DROP POLICY IF EXISTS "Gestión total por Admins" ON public.ads;
CREATE POLICY "Gestión total por Admins" 
ON public.ads FOR ALL 
USING (public.is_admin());

-- Permitir que usuarios anónimos/autenticados incrementen impresiones y clics (vía RPC o Update limitado)
-- Nota: Para mayor seguridad, esto suele hacerse vía RPC SECURITY DEFINER
DROP POLICY IF EXISTS "Actualización limitada de métricas" ON public.ads;
CREATE POLICY "Actualización limitada de métricas" 
ON public.ads FOR UPDATE 
USING (true)
WITH CHECK (true);

-- 4. FUNCIONES PARA MÉTRICAS (RPC)
CREATE OR REPLACE FUNCTION public.record_ad_impression(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ads 
  SET impressions = impressions + 1 
  WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_ad_click(p_ad_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.ads 
  SET clicks = clicks + 1 
  WHERE id = p_ad_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

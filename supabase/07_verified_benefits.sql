-- Create verified_benefits table
CREATE TABLE IF NOT EXISTS verified_benefits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'Star',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE verified_benefits ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read active benefits
DROP POLICY IF EXISTS "Anyone can view active benefits" ON verified_benefits;
CREATE POLICY "Anyone can view active benefits" 
ON verified_benefits FOR SELECT 
USING (is_active = true);

-- Admins can manage all benefits
DROP POLICY IF EXISTS "Admins can manage benefits" ON verified_benefits;
CREATE POLICY "Admins can manage benefits" 
ON verified_benefits FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.is_admin = true OR profiles.is_super_admin = true)
  )
);

-- Insert initial benefits
INSERT INTO verified_benefits (slug, name, description, icon_name, is_active)
VALUES 
('prioritized_support', 'Soporte Prioritario', 'Atención al cliente 24/7 con respuesta en menos de 1 hora.', 'Headphones', false),
('exclusive_badge', 'Insignia Dorada', 'Distintivo exclusivo en tu perfil que resalta tu estatus verificado.', 'Award', false),
('hd_video', 'Video HD', 'Capacidad para subir videos en alta resolución (1080p).', 'Video', false),
('no_ads', 'Sin Publicidad', 'Navegación fluida sin anuncios en toda la plataforma.', 'ShieldOff', false),
('custom_themes', 'Temas Personalizados', 'Acceso a paletas de colores y temas exclusivos para tu perfil.', 'Palette', false),
('appointments', 'Sistema de Citas', 'Permite que otros usuarios soliciten citas directamente desde tus publicaciones y perfil.', 'Calendar', false)
ON CONFLICT (slug) DO NOTHING;

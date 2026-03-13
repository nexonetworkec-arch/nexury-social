-- NEXUS SOCIAL - MÓDULO 06: PERMISOS DE ADMINISTRADOR
-- Propósito: Añadir control granular de funciones para administradores.

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "can_manage_users": true,
  "can_manage_posts": true,
  "can_manage_appointments": true,
  "can_view_stats": true,
  "can_manage_settings": false
}'::JSONB;

-- Actualizar administradores existentes con permisos por defecto si no los tienen
UPDATE public.profiles 
SET permissions = '{
  "can_manage_users": true,
  "can_manage_posts": true,
  "can_manage_appointments": true,
  "can_view_stats": true,
  "can_manage_settings": false
}'::JSONB
WHERE is_admin = TRUE AND permissions IS NULL;

-- Los Super Admins siempre tienen todos los permisos
UPDATE public.profiles 
SET permissions = '{
  "can_manage_users": true,
  "can_manage_posts": true,
  "can_manage_appointments": true,
  "can_view_stats": true,
  "can_manage_settings": true
}'::JSONB
WHERE is_super_admin = TRUE;

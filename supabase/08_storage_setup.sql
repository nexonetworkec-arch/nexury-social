-- NEXUS SOCIAL - MÓDULO 08: CONFIGURACIÓN DE ALMACENAMIENTO (STORAGE)
-- Propósito: Crear buckets para avatares y posts, y configurar políticas de acceso.

-- 1. CREAR BUCKETS (Si no existen)
-- Nota: Esto inserta en la tabla de configuración de storage de Supabase.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS PARA EL BUCKET 'avatars'
-- Permitir lectura pública
CREATE POLICY "Acceso público a avatares"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Permitir a usuarios autenticados subir sus propios avatares
CREATE POLICY "Usuarios pueden subir sus propios avatares"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Permitir a usuarios actualizar sus propios avatares
CREATE POLICY "Usuarios pueden actualizar sus propios avatares"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- 3. POLÍTICAS PARA EL BUCKET 'posts'
-- Permitir lectura pública
CREATE POLICY "Acceso público a imágenes de posts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

-- Permitir a usuarios autenticados subir imágenes a posts
CREATE POLICY "Usuarios pueden subir imágenes a posts"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' AND
  auth.role() = 'authenticated'
);

-- Permitir a usuarios actualizar/borrar sus propias imágenes de posts
CREATE POLICY "Usuarios pueden gestionar sus imágenes de posts"
ON storage.objects FOR ALL
USING (
  bucket_id = 'posts' AND
  auth.role() = 'authenticated'
);

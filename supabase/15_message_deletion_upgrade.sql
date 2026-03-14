-- NEXUS SOCIAL - MÓDULO 15: MEJORAS EN ELIMINACIÓN DE MENSAJES
-- Propósito: Añadir soporte para marcar mensajes como eliminados para todos.

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN DEFAULT FALSE;

-- Asegurar que el realtime capture los cambios
ALTER TABLE public.messages REPLICA IDENTITY FULL;

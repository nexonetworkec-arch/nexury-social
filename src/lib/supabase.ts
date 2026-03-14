/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si no hay credenciales, evitamos que createClient lance un error fatal
// y en su lugar exportamos un objeto que avise al usuario.
const createMockSupabase = () => {
  const message = "Supabase no está configurado. Por favor, añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el panel de Secrets.";
  
  const handler: ProxyHandler<any> = {
    get: (target, prop) => {
      if (prop === 'then') return undefined;
      
      // Chaining para consultas
      const chainableMethods = ['from', 'select', 'insert', 'update', 'delete', 'upsert', 'order', 'limit', 'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy', 'range', 'match', 'or', 'filter', 'not', 'single', 'maybeSingle', 'csv', 'on', 'subscribe', 'channel', 'or'];
      
      if (chainableMethods.includes(prop as string)) {
        return () => {
          console.warn(message);
          return new Proxy({}, handler);
        };
      }

      // Auth object
      if (prop === 'auth') {
        return new Proxy({}, handler);
      }

      // Auth methods
      if (prop === 'onAuthStateChange') {
        return () => {
          console.warn(message);
          return { data: { subscription: { unsubscribe: () => {} } } };
        };
      }

      const asyncAuthMethods = ['signInWithPassword', 'signUp', 'signOut', 'getSession', 'getUser', 'resend', 'resetPasswordForEmail', 'updateUser'];
      if (asyncAuthMethods.includes(prop as string)) {
        return () => {
          console.warn(message);
          return Promise.resolve({ data: { user: null, session: null }, error: null });
        };
      }

      // Default fallback
      return () => {
        console.warn(message);
        return Promise.reject(new Error(message));
      };
    }
  };

  return new Proxy({}, handler);
};

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? (() => {
      console.log('Supabase: Inicializando cliente real con URL:', supabaseUrl);
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'nexury-auth-token',
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: { 'x-application-name': 'nexury' },
          fetch: async (url, options) => {
            const maxRetries = 3;
            let lastError;
            
            for (let i = 0; i < maxRetries; i++) {
              try {
                const response = await fetch(url, options);
                return response;
              } catch (err) {
                lastError = err;
                console.warn(`Supabase Fetch Attempt ${i + 1} failed:`, err);
                if (i < maxRetries - 1) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
              }
            }
            
            console.error('Supabase Fetch Error after retries:', lastError);
            throw lastError;
          }
        }
      });
    })()
  : (() => {
      console.log('Supabase: Inicializando mock (faltan credenciales)');
      return createMockSupabase();
    })();

/**
 * Guía para la migración a Supabase:
 * 
 * 1. Crea un proyecto en https://supabase.com
 * 2. Obtén tu URL y Anon Key desde Project Settings > API
 * 3. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY a tus variables de entorno en AI Studio
 * 4. Crea las tablas necesarias en el SQL Editor.
 * 5. Habilita Realtime para 'conversation_participants' en Database > Replication > supabase_realtime.
 * 6. Ejecuta este SQL para la gestión profesional de chats:
 * 
 *    -- Política RLS para permitir borrar la propia participación
 *    CREATE POLICY "Users can remove themselves from conversations" 
 *    ON conversation_participants FOR DELETE USING (auth.uid() = user_id);
 * 
 *    -- Trigger de limpieza automática de mensajes huérfanos
 *    CREATE OR REPLACE FUNCTION clean_orphan_conversations()
 *    RETURNS TRIGGER AS $$
 *    BEGIN
 *      IF NOT EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = OLD.conversation_id) THEN
 *        DELETE FROM messages WHERE conversation_id = OLD.conversation_id;
 *        DELETE FROM conversations WHERE id = OLD.conversation_id;
 *      END IF;
 *      RETURN OLD;
 *    END;
 *    $$ LANGUAGE plpgsql;
 * 
 *    CREATE TRIGGER trigger_clean_orphans
 *    AFTER DELETE ON conversation_participants
 *    FOR EACH ROW EXECUTE FUNCTION clean_orphan_conversations();
 */

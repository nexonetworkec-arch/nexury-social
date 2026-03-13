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
        },
        global: {
          fetch: (url, options) => {
            return fetch(url, options).catch(err => {
              console.error('Supabase Fetch Error:', err);
              if (err.message === 'Failed to fetch') {
                console.error('CONSEJO: Esto suele significar que la URL de Supabase es incorrecta o inaccesible. Verifica VITE_SUPABASE_URL.');
              }
              throw err;
            });
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
 * 4. Crea las tablas 'profiles', 'posts', 'comments', 'likes', 'follows', 'appointments', 'conversations', 'messages', 'verified_benefits' y 'verified_benefits_users' en el SQL Editor de Supabase.
 * 5. Crea dos buckets en Storage: 'posts' y 'avatars' (asegúrate de que sean Públicos).
 * 6. Habilita Row Level Security (RLS) para proteger tus datos.
 */

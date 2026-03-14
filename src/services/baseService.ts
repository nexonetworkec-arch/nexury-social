import { supabase } from '../lib/supabase';

export class BaseService {
  protected static async handleResponse<T>(promise: Promise<{ data: T | null; error: any }>): Promise<T> {
    const { data, error } = await promise;
    if (error) {
      console.error('Supabase Error:', error);
      throw new Error(error.message || 'Unknown database error');
    }
    return data as T;
  }

  protected static async handleMaybeSingle<T>(promise: Promise<{ data: T | null; error: any }>): Promise<T | null> {
    const { data, error } = await promise;
    if (error) {
      console.error('Supabase Error:', error);
      return null;
    }
    return data;
  }
}

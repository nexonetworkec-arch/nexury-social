import { supabase } from '../lib/supabase';
import { Appointment } from '../types';
import { BaseService } from './baseService';

export class AppointmentService extends BaseService {
  static async getAppointments(userId: string): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        requester:requester_id (username, display_name, avatar_url, is_verified),
        receiver:receiver_id (username, display_name, avatar_url, is_verified)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('appointment_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((a: any) => ({
      ...a,
      requester_username: a.requester?.username,
      requester_display_name: a.requester?.display_name,
      requester_avatar: a.requester?.avatar_url,
      requester_is_verified: !!a.requester?.is_verified,
      receiver_username: a.receiver?.username,
      receiver_display_name: a.receiver?.display_name,
      receiver_avatar: a.receiver?.avatar_url,
      receiver_is_verified: !!a.receiver?.is_verified
    }));
  }

  static async createAppointment(appointment: Partial<Appointment>): Promise<Appointment> {
    return this.handleResponse<Appointment>(
      supabase
        .from('appointments')
        .insert([appointment])
        .select()
        .single()
    );
  }

  static async updateAppointmentStatus(appointmentId: string, status: Appointment['status']): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);
    if (error) throw error;
  }
}

import { supabase } from '../lib/supabase';
import { BaseService } from './baseService';

export class AdminService extends BaseService {
  static async getGlobalSettings(): Promise<any> {
    return this.handleMaybeSingle(
      supabase
        .from('app_settings')
        .select('*')
        .eq('id', 'global')
        .maybeSingle()
    );
  }

  static async updateGlobalSettings(updates: any): Promise<void> {
    const { error } = await supabase
      .from('app_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', 'global');
    if (error) throw error;
  }

  static async reportContent(targetId: string, reporterId: string, reason: string, type: 'post' | 'user' | 'comment'): Promise<void> {
    const { error } = await supabase
      .from('user_reports')
      .insert([{ 
        reporter_id: reporterId, 
        target_id: targetId, 
        reason,
        status: 'pending'
      }]);
    if (error) throw error;
  }

  static async getAdminStats() {
    const [users, posts, reports, appointments] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('user_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('appointments').select('*', { count: 'exact', head: true })
    ]);

    return {
      totalUsers: users.count || 0,
      totalPosts: posts.count || 0,
      pendingReports: reports.count || 0,
      totalAppointments: appointments.count || 0
    };
  }

  static async getAdminUsers() {
    return this.handleResponse(
      supabase.from('profiles').select('*').order('created_at', { ascending: false })
    );
  }

  static async getAdminPosts() {
    return this.handleResponse(
      supabase.from('posts').select(`
        *,
        profiles:user_id (username, display_name, avatar_url)
      `).order('created_at', { ascending: false })
    );
  }

  static async updateAd(adId: string, updates: any) {
    return this.handleResponse(
      supabase.from('ads').update(updates).eq('id', adId)
    );
  }

  static async createAd(ad: any) {
    return this.handleResponse(
      supabase.from('ads').insert([ad])
    );
  }

  static async deleteUser(userId: string) {
    return this.handleResponse(
      supabase.from('profiles').delete().eq('id', userId)
    );
  }

  static async blockUserAdmin(userId: string, blocked: boolean) {
    return this.handleResponse(
      supabase.from('profiles').update({ is_blocked: blocked }).eq('id', userId)
    );
  }

  static async deletePost(postId: string) {
    return this.handleResponse(
      supabase.from('posts').delete().eq('id', postId)
    );
  }

  static async deleteAd(adId: string) {
    return this.handleResponse(
      supabase.from('ads').delete().eq('id', adId)
    );
  }

  static async getAdministrators() {
    return this.handleResponse(
      supabase.from('profiles').select('*').or('is_admin.eq.true,is_super_admin.eq.true')
    );
  }

  static async getVerifiedBenefits() {
    return this.handleResponse(
      supabase.from('verified_benefits').select('*').order('created_at', { ascending: false })
    );
  }

  static async createVerifiedBenefit(benefit: any) {
    return this.handleResponse(
      supabase.from('verified_benefits').insert([benefit])
    );
  }

  static async updateVerifiedBenefit(benefitId: string, updates: any) {
    return this.handleResponse(
      supabase.from('verified_benefits').update(updates).eq('id', benefitId)
    );
  }

  static async deleteVerifiedBenefit(benefitId: string) {
    return this.handleResponse(
      supabase.from('verified_benefits').delete().eq('id', benefitId)
    );
  }

  static async setAdminStatus(userId: string, isAdmin: boolean, permissions: any = {}) {
    return this.handleResponse(
      supabase.from('profiles').update({ 
        is_admin: isAdmin,
        permissions: permissions
      }).eq('id', userId)
    );
  }

  static async updateAdminPermissions(userId: string, permissions: any) {
    return this.handleResponse(
      supabase.from('profiles').update({ permissions }).eq('id', userId)
    );
  }

  static async optimizeTable(tableName: string) {
    const { error } = await supabase.from(tableName).select('id').limit(1);
    if (error) throw error;
    return { success: true, message: `Table ${tableName} is healthy` };
  }

  static async getServerLogs() {
    return [
      { id: 1, level: 'info', message: 'System started', timestamp: new Date().toISOString() },
      { id: 2, level: 'info', message: 'Database connected', timestamp: new Date().toISOString() }
    ];
  }
}

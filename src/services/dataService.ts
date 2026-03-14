import { Post, Comment, User, Conversation, Message, Notification, Appointment, VerifiedBenefit } from '../types';
import { supabase } from '../lib/supabase';
import { AuthService } from './authService';
import { SocialService } from './socialService';
import { ChatService } from './chatService';
import { NotificationService } from './notificationService';
import { AdminService } from './adminService';
import { AppointmentService } from './appointmentService';
import { LiveService } from './liveService';

/**
 * FACADE SERVICE
 * Este servicio actúa como un punto de entrada unificado para mantener compatibilidad
 * mientras se migra a servicios modulares especializados.
 */
export const dataService = {
  // AUTH & PROFILES
  getUserProfile: AuthService.getUserProfile.bind(AuthService),
  getUserProfileByUsername: AuthService.getUserProfileByUsername.bind(AuthService),
  updateUserStatus: AuthService.updateUserStatus.bind(AuthService),
  updateProfile: AuthService.updateProfile.bind(AuthService),
  searchUsers: AuthService.searchProfiles.bind(AuthService), // Alias
  searchProfiles: AuthService.searchProfiles.bind(AuthService),
  uploadMedia: AuthService.uploadMedia.bind(AuthService),
  verifyUser: AuthService.verifyUser.bind(AuthService),
  requestVerification: AuthService.requestVerification.bind(AuthService),
  savePushToken: AuthService.savePushToken.bind(AuthService),
  blockUserPersonal: AuthService.blockUserPersonal.bind(AuthService),
  updateUser: AuthService.updateProfile.bind(AuthService), // Alias
  getUserCounts: AuthService.getUserCounts.bind(AuthService),

  // SOCIAL (POSTS, LIKES, COMMENTS, FOLLOWS)
  getPosts: SocialService.getPosts.bind(SocialService),
  getUserPosts: SocialService.getUserPosts.bind(SocialService),
  createPost: SocialService.createPost.bind(SocialService),
  updatePost: SocialService.updatePost.bind(SocialService),
  deletePost: SocialService.deletePost.bind(SocialService),
  likePost: SocialService.likePost.bind(SocialService),
  getComments: SocialService.getComments.bind(SocialService),
  createComment: SocialService.createComment.bind(SocialService),
  followUser: SocialService.followUser.bind(SocialService),
  checkIfFollowing: SocialService.checkIfFollowing.bind(SocialService),
  getSuggestedUsers: SocialService.getSuggestedUsers.bind(SocialService),
  getTrends: SocialService.getTrends.bind(SocialService),
  toggleBookmark: SocialService.toggleBookmark.bind(SocialService),
  checkIfBookmarked: SocialService.checkIfBookmarked.bind(SocialService),
  getBookmarks: SocialService.getBookmarks.bind(SocialService),
  getNexuarios: SocialService.getNexuarios.bind(SocialService),
  incrementPostViews: SocialService.incrementPostViews.bind(SocialService),
  recordUniqueView: SocialService.recordUniqueView.bind(SocialService),
  reportPost: SocialService.reportPost.bind(SocialService),
  isBenefitActive: SocialService.isBenefitActive.bind(SocialService),

  // CHAT
  getConversations: ChatService.getConversations.bind(ChatService),
  getMessages: ChatService.getMessages.bind(ChatService),
  sendMessage: ChatService.sendMessage.bind(ChatService),
  getOrCreateConversation: ChatService.getOrCreateConversation.bind(ChatService),
  markMessagesAsRead: ChatService.markMessagesAsRead.bind(ChatService),
  deleteMessageForEveryone: ChatService.deleteMessageForEveryone.bind(ChatService),
  deleteMessageForMe: ChatService.deleteMessageForMe.bind(ChatService),
  clearChatForMe: ChatService.clearChatForMe.bind(ChatService),
  deleteConversation: ChatService.deleteConversation.bind(ChatService),
  getUnreadMessagesCount: ChatService.getUnreadMessagesCount.bind(ChatService),

  // NOTIFICATIONS
  getNotifications: NotificationService.getNotifications.bind(NotificationService),
  markNotificationAsRead: NotificationService.markAsRead.bind(NotificationService),
  markAllNotificationsAsRead: NotificationService.markAllAsRead.bind(NotificationService),
  getUnreadNotificationsCount: NotificationService.getUnreadCount.bind(NotificationService),
  clearAllNotifications: NotificationService.clearAll.bind(NotificationService),
  deleteNotification: NotificationService.deleteNotification.bind(NotificationService),

  // APPOINTMENTS
  getAppointments: AppointmentService.getAppointments.bind(AppointmentService),
  createAppointment: AppointmentService.createAppointment.bind(AppointmentService),
  updateAppointmentStatus: AppointmentService.updateAppointmentStatus.bind(AppointmentService),

  // LIVE
  getActiveLiveStreams: LiveService.getActiveLiveStreams.bind(LiveService),
  getPastLiveStreams: LiveService.getPastLiveStreams.bind(LiveService),
  startLiveStream: LiveService.startLiveStream.bind(LiveService),
  endLiveStream: LiveService.endLiveStream.bind(LiveService),
  getLiveMessages: LiveService.getLiveMessages.bind(LiveService),
  sendLiveMessage: LiveService.sendLiveMessage.bind(LiveService),
  deleteLiveStream: LiveService.deleteLiveStream.bind(LiveService),

  // ADMIN
  getAdminStats: AdminService.getAdminStats.bind(AdminService),
  getAdminUsers: AdminService.getAdminUsers.bind(AdminService),
  getAdminPosts: AdminService.getAdminPosts.bind(AdminService),
  getGlobalSettings: AdminService.getGlobalSettings.bind(AdminService),
  updateGlobalSettings: AdminService.updateGlobalSettings.bind(AdminService),
  getAdministrators: AdminService.getAdministrators.bind(AdminService),
  setAdminStatus: AdminService.setAdminStatus.bind(AdminService),
  updateAdminPermissions: AdminService.updateAdminPermissions.bind(AdminService),
  deleteUser: AdminService.deleteUser.bind(AdminService),
  blockUser: AdminService.blockUserAdmin.bind(AdminService),
  reportUser: AdminService.reportContent.bind(AdminService), // Alias for reportContent
  getVerifiedBenefits: AdminService.getVerifiedBenefits.bind(AdminService),
  createVerifiedBenefit: AdminService.createVerifiedBenefit.bind(AdminService),
  updateVerifiedBenefit: AdminService.updateVerifiedBenefit.bind(AdminService),
  deleteVerifiedBenefit: AdminService.deleteVerifiedBenefit.bind(AdminService),
  optimizeTable: AdminService.optimizeTable.bind(AdminService),
  getServerLogs: AdminService.getServerLogs.bind(AdminService),
  createAd: AdminService.createAd.bind(AdminService),
  updateAd: AdminService.updateAd.bind(AdminService),
  deleteAd: AdminService.deleteAd.bind(AdminService),

  // ADS (PUBLIC)
  async getAds(): Promise<any[]> {
    const { data, error } = await supabase.from('ads').select('*').eq('is_active', true);
    if (error) throw error;
    return data || [];
  },

  async recordAdImpression(adId: string) {
    await supabase.rpc('increment_ad_impressions', { p_ad_id: adId });
  },

  async recordAdClick(adId: string) {
    await supabase.rpc('increment_ad_clicks', { p_ad_id: adId });
  }
};

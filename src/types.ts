export interface AdminPermissions {
  can_manage_users: boolean;
  can_manage_posts: boolean;
  can_manage_appointments: boolean;
  can_view_stats: boolean;
  can_manage_settings: boolean;
  can_manage_ads: boolean;
}

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  is_admin: boolean;
  is_super_admin?: boolean;
  is_verified?: boolean;
  is_blocked?: boolean;
  created_at: string;
  followers_count?: number;
  following_count?: number;
  total_likes_received?: number;
  permissions?: AdminPermissions;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  media_type?: 'image' | 'video';
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified?: boolean;
  show_appointment_button?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified?: boolean;
}

export interface Appointment {
  id: string;
  requester_id: string;
  receiver_id: string;
  title: string;
  description: string;
  appointment_date: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  requester_username?: string;
  requester_display_name?: string;
  requester_avatar?: string;
  requester_is_verified?: boolean;
  receiver_username?: string;
  receiver_display_name?: string;
  receiver_avatar?: string;
  receiver_is_verified?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  from_user_id: string;
  post_id?: string;
  read: number;
  created_at: string;
  from_username?: string;
  from_display_name?: string;
  from_avatar?: string;
  from_is_verified?: boolean;
}

export interface Conversation {
  id: string;
  created_at: string;
  last_message?: string;
  last_message_at?: string;
  participants: User[];
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface VerifiedBenefit {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_name: string;
  is_active: boolean;
  created_at: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  is_active: boolean;
  impressions: number;
  clicks: number;
  created_at: string;
}

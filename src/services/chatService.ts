import { supabase } from '../lib/supabase';
import { Conversation, Message, User } from '../types';
import { BaseService } from './baseService';

export class ChatService extends BaseService {
  static async getConversations(userId: string): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations:conversation_id (
          id,
          created_at,
          last_message,
          last_message_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;

    const conversations = await Promise.all((data || []).map(async (item: any) => {
      const conv = item.conversations;
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select(`
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('conversation_id', conv.id)
        .neq('user_id', userId);

      return {
        ...conv,
        participants: (participants || []).map((p: any) => p.profiles),
        unread_count: 0 // Simplificado por ahora
      };
    }));

    return conversations;
  }

  static async sendMessage(conversationId: string, senderId: string, content: string): Promise<Message> {
    const { data: participants } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId)
      .limit(1);
    
    const receiverId = participants?.[0]?.user_id;

    const { data, error } = await supabase
      .from('messages')
      .insert([{ 
        conversation_id: conversationId, 
        sender_id: senderId, 
        receiver_id: receiverId,
        content 
      }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar el último mensaje de la conversación
    await supabase
      .from('conversations')
      .update({ 
        last_message: content, 
        last_message_at: new Date().toISOString() 
      })
      .eq('id', conversationId);

    return data;
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    return this.handleResponse<Message[]>(
      supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
    );
  }

  static async getOrCreateConversation(userIds: string[]): Promise<Conversation> {
    const { data, error } = await supabase.rpc('create_chat_atomic', { p_participant_ids: userIds });
    if (error) throw error;
    
    // Fetch the full conversation details
    return this.handleResponse<Conversation>(
      supabase
        .from('conversations')
        .select(`
          *,
          participants:conversation_participants(
            profiles:user_id(*)
          )
        `)
        .eq('id', data)
        .single()
    );
  }

  static async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  }

  static async deleteMessageForEveryone(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted_for_everyone: true, content: 'Este mensaje fue eliminado' })
      .eq('id', messageId);
    if (error) throw error;
  }

  static async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
    // This would require a separate table for per-user message deletion status
    // For now, we'll just ignore it or implement a simple version
    console.log('Delete for me not fully implemented in DB schema yet');
  }

  static async clearChatForMe(conversationId: string, userId: string): Promise<void> {
    console.log('Clear chat not fully implemented in DB schema yet');
  }

  static async deleteConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    if (error) throw error;
  }

  static async getUnreadMessagesCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  }
}

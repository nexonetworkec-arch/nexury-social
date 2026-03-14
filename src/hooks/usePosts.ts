import { useState, useEffect, useCallback } from 'react';
import { Post } from '../types';
import { SocialService } from '../services/socialService';

export function usePosts(currentUserId?: string, feedType: 'recent' | 'smart' = 'smart') {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SocialService.getPosts(currentUserId);
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, refetch: fetchPosts };
}

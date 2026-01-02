import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserTag {
  tag_id: string;
  tag_name: string;
  tag_category: string;
  display_name: string;
  is_active: boolean;
}

export interface UseUserTagsResult {
  tags: UserTag[];
  loading: boolean;
  hasTag: (tagName: string) => boolean;
  hasAnyTag: (tagNames: string[]) => boolean;
  hasCategory: (category: string) => boolean;
  refetchTags: () => Promise<void>;
}

/**
 * Custom hook to fetch and check user tags
 * @param userId - The user's ID
 * @returns Object containing tags, loading state, and helper functions
 */
export const useUserTags = (userId: string | null): UseUserTagsResult => {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserTags = async () => {
    if (!userId) {
      setTags([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_tag_assignments')
        .select(`
          tag_id,
          is_active,
          user_tags (
            id,
            tag_name,
            tag_category,
            display_name
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching user tags:', error);
        setTags([]);
        return;
      }

      // Transform the data to a flat structure
      const userTags: UserTag[] = (data || [])
        .filter(assignment => assignment.user_tags)
        .map(assignment => ({
          tag_id: assignment.tag_id,
          tag_name: assignment.user_tags.tag_name,
          tag_category: assignment.user_tags.tag_category,
          display_name: assignment.user_tags.display_name,
          is_active: assignment.is_active
        }));

      setTags(userTags);
    } catch (error) {
      console.error('Error in fetchUserTags:', error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTags();
  }, [userId]);

  /**
   * Check if user has a specific tag by tag_name
   * @param tagName - The tag name to check (case-insensitive)
   */
  const hasTag = (tagName: string): boolean => {
    return tags.some(tag => tag.tag_name.toLowerCase() === tagName.toLowerCase());
  };

  /**
   * Check if user has any of the specified tags
   * @param tagNames - Array of tag names to check (case-insensitive)
   */
  const hasAnyTag = (tagNames: string[]): boolean => {
    return tagNames.some(tagName => hasTag(tagName));
  };

  /**
   * Check if user has any tag in a specific category
   * @param category - The category to check (case-insensitive)
   */
  const hasCategory = (category: string): boolean => {
    return tags.some(tag => tag.tag_category.toLowerCase() === category.toLowerCase());
  };

  /**
   * Manually refetch tags (useful after tag assignments change)
   */
  const refetchTags = async (): Promise<void> => {
    await fetchUserTags();
  };

  return {
    tags,
    loading,
    hasTag,
    hasAnyTag,
    hasCategory,
    refetchTags
  };
};

/**
 * Helper function to check if user should see a feature based on required tags
 * @param userTags - Array of user's tags
 * @param requiredTags - Array of tags required to see the feature (OR logic - user needs at least one)
 * @returns boolean indicating if user has access
 */
export const hasFeatureAccess = (userTags: UserTag[], requiredTags: string[]): boolean => {
  if (requiredTags.length === 0) return true; // No restrictions
  
  return requiredTags.some(requiredTag =>
    userTags.some(userTag => userTag.tag_name.toLowerCase() === requiredTag.toLowerCase())
  );
};

/**
 * Helper function to filter sidebar items based on user tags
 * @param items - Array of sidebar items
 * @param userTags - Array of user's tags
 * @returns Filtered array of sidebar items
 */
export const filterSidebarByTags = (
  items: Array<{ id: string; requiredTags?: string[]; [key: string]: any }>,
  userTags: UserTag[]
): Array<any> => {
  return items.filter(item => {
    if (!item.requiredTags || item.requiredTags.length === 0) {
      return true; // No tag requirements, show to everyone
    }
    return hasFeatureAccess(userTags, item.requiredTags);
  });
};
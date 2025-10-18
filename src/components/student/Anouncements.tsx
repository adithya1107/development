
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  MessageSquare,
  Bell,
  Users,
  Send,
  Reply,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CommunicationCenterProps {
  studentData: any;
}

const Anouncements: React.FC<CommunicationCenterProps> = ({ studentData }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [forums, setForums] = useState([]);
  const [selectedForum, setSelectedForum] = useState<any>(null);
  const [forumPosts, setForumPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCommunicationData();
  }, [studentData]);

  const fetchCommunicationData = async () => {
    try {
      // Fetch announcements
      const { data: announcementsData } = await supabase
        .from('announcements')
        .select('*')
        .eq('college_id', studentData.college_id)
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('created_at', { ascending: false });

      setAnnouncements(announcementsData || []);

      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentData.user_id);

      const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

      // Fetch discussion forums for enrolled courses
      const { data: forumsData } = await supabase
        .from('discussion_forums')
        .select(`
          *,
          courses(course_name, course_code)
        `)
        .in('course_id', enrolledCourseIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      setForums(forumsData || []);

    } catch (error) {
      console.error('Error fetching communication data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch communication data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchForumPosts = async (forumId: string) => {
    try {
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select(`
          *,
          user_profiles!forum_posts_author_id_fkey(first_name, last_name, user_type)
        `)
        .eq('forum_id', forumId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      // Fetch replies for each post
      const postsWithReplies = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: replies } = await supabase
            .from('forum_posts')
            .select(`
              *,
              user_profiles!forum_posts_author_id_fkey(first_name, last_name, user_type)
            `)
            .eq('parent_post_id', post.id)
            .order('created_at');

          return { ...post, replies: replies || [] };
        })
      );

      setForumPosts(postsWithReplies);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
    }
  };

  const createForumPost = async (forumId: string, content: string, parentPostId?: string) => {
    try {
      const { error } = await supabase
        .from('forum_posts')
        .insert({
          forum_id: forumId,
          author_id: studentData.user_id,
          content: content,
          parent_post_id: parentPostId || null
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: parentPostId ? 'Reply posted successfully' : 'Post created successfully',
      });

      // Refresh forum posts
      fetchForumPosts(forumId);
    } catch (error) {
      console.error('Error creating forum post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'destructive';
      case 'high':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'destructive';
      case 'academic':
        return 'default';
      case 'event':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Loading communications...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-3 sm:px-4 md:px-6 w-full max-w-full">
      <div className="flex flex-col xs:flex-row justify-between items-start xs:items-center gap-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Communication Center</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">{announcements.length} Announcements</Badge>
          <Badge variant="outline" className="px-2 sm:px-3 py-1 text-xs sm:text-sm whitespace-nowrap">{forums.length} Forums</Badge>
        </div>
      </div>

      <Tabs defaultValue="announcements" className="space-y-4 w-full">
        <div className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="announcements" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Announcements</span>
            </TabsTrigger>
            <TabsTrigger value="forums" className="text-[10px] xs:text-xs sm:text-sm px-1 xs:px-2 sm:px-3 py-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <span className="truncate">Discussion Forums</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="announcements" className="space-y-4">
          {announcements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No announcements at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {announcements.map((announcement: any) => (
                <Card
                  key={announcement.id}
                  className="hover:shadow-md transition-shadow w-full"
                >
                  <CardContent className="p-4 sm:p-6">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      {/* Title + Content */}
                      <div className="flex-1 w-full">
                        <h3 className="text-base sm:text-lg font-semibold mb-2 break-words">
                          {announcement.title}
                        </h3>
                        <p className="text-gray-700 text-sm sm:text-base leading-relaxed break-words">
                          {announcement.content}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 sm:space-y-2">
                        <Badge
                          variant={getPriorityColor(announcement.priority)}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-0.5"
                        >
                          {announcement.priority}
                        </Badge>
                        <Badge
                          variant={getAnnouncementTypeColor(announcement.announcement_type)}
                          className="text-xs sm:text-sm px-2 sm:px-3 py-0.5"
                        >
                          {announcement.announcement_type}
                        </Badge>
                      </div>
                    </div>

                    {/* Footer (Date Section) */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs sm:text-sm text-gray-500 pt-3 border-t gap-1 sm:gap-2">
                      <span className="whitespace-nowrap">
                        {new Date(announcement.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {announcement.expires_at && (
                        <span className="whitespace-nowrap">
                          Expires: {new Date(announcement.expires_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="forums" className="space-y-4">
          {selectedForum ? (
            <ForumDiscussion
              forum={selectedForum}
              posts={forumPosts}
              onBack={() => setSelectedForum(null)}
              onCreatePost={createForumPost}
              currentUserId={studentData.user_id}
            />
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {forums.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm sm:text-base">No discussion forums available</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {forums.map((forum: any) => (
                    <Card
                      key={forum.id}
                      className="hover:shadow-md transition-shadow cursor-pointer w-full"
                    >
                      <CardContent className="p-4 sm:p-6 flex flex-col justify-between h-full">
                        {/* Header Section */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                          <div className="flex-1 w-full">
                            <h3 className="text-base sm:text-lg font-semibold mb-1 break-words">
                              {forum.title}
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base mb-2 leading-relaxed break-words">
                              {forum.description}
                            </p>
                            <Badge variant="outline" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5">
                              {forum.courses.course_name}
                            </Badge>
                          </div>
                          <Users className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 flex-shrink-0" />
                        </div>

                        {/* Footer Section */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t text-xs sm:text-sm text-gray-500 gap-2 sm:gap-0">
                          <span className="whitespace-nowrap">
                            Created: {new Date(forum.created_at).toLocaleDateString()}
                          </span>
                          <Button
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => {
                              setSelectedForum(forum);
                              fetchForumPosts(forum.id);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Discussion
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Forum Discussion Component
const ForumDiscussion: React.FC<{
  forum: any;
  posts: any[];
  onBack: () => void;
  onCreatePost: (forumId: string, content: string, parentPostId?: string) => void;
  currentUserId: string;
}> = ({ forum, posts, onBack, onCreatePost, currentUserId }) => {
  const [newPostContent, setNewPostContent] = useState('');

  const handleCreatePost = () => {
    if (!newPostContent.trim()) return;
    onCreatePost(forum.id, newPostContent);
    setNewPostContent('');
  };

  return (
    <div className="space-y-6">
      {/* Forum Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{forum.title}</CardTitle>
              <p className="text-gray-600 mt-2">{forum.description}</p>
              <Badge variant="outline" className="mt-2">
                {forum.courses.course_name}
              </Badge>
            </div>
            <Button variant="outline" onClick={onBack}>
              Back to Forums
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* New Post */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Start a New Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Share your thoughts, ask questions, or start a discussion..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
          />
          <Button onClick={handleCreatePost} disabled={!newPostContent.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Post Message
          </Button>
        </CardContent>
      </Card>

      {/* Forum Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No posts yet. Be the first to start the discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <ForumPost
              key={post.id}
              post={post}
              onReply={(content) => onCreatePost(forum.id, content, post.id)}
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Forum Post Component
const ForumPost: React.FC<{
  post: any;
  onReply: (content: string) => void;
  currentUserId: string;
}> = ({ post, onReply, currentUserId }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (!replyContent.trim()) return;
    onReply(replyContent);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <Card>
      <CardContent className="p-6">
        {/* Main Post */}
        <div className="mb-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {post.user_profiles.first_name?.[0]}{post.user_profiles.last_name?.[0]}
              </div>
              <div>
                <p className="font-medium">
                  {post.user_profiles.first_name} {post.user_profiles.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  {post.user_profiles.user_type} • {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-700 leading-relaxed">{post.content}</p>

          <div className="flex items-center space-x-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <Reply className="h-4 w-4 mr-1" />
              Reply ({post.replies?.length || 0})
            </Button>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <div className="border-t pt-4 mb-4">
            <Textarea
              placeholder="Write your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <div className="flex space-x-2">
              <Button size="sm" onClick={handleReply} disabled={!replyContent.trim()}>
                Post Reply
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowReplyForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Replies */}
        {post.replies && post.replies.length > 0 && (
          <div className="border-t pt-4 space-y-4">
            {post.replies.map((reply: any) => (
              <div key={reply.id} className="ml-8 bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {reply.user_profiles.first_name?.[0]}{reply.user_profiles.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {reply.user_profiles.first_name} {reply.user_profiles.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {reply.user_profiles.user_type} • {new Date(reply.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-gray-700 text-sm">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Anouncements;
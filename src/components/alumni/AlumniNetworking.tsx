
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "@/components/ui/use-toast";
import { Users, MessageSquare, Plus, Search, Send } from 'lucide-react';
import AlumniNetworkingHub from './AlumniNetworkingHub';

interface AlumniNetworkingProps {
  user: any;
}

const AlumniNetworking = ({ user }: AlumniNetworkingProps) => {
  const [networks, setNetworks] = useState<any[]>([]);
  const [forums, setForums] = useState<any[]>([]);
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [selectedForum, setSelectedForum] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNetworks();
    fetchForums();
  }, [user]);

  useEffect(() => {
    if (selectedForum) {
      fetchForumPosts(selectedForum);
    }
  }, [selectedForum]);

  const fetchNetworks = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni_networks')
        .select(`
          *,
          alumni_network_members(count)
        `)
        .eq('college_id', user.college_id)
        .eq('is_active', true);

      if (error) throw error;
      setNetworks(data || []);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  };

  const fetchForums = async () => {
    try {
      const { data, error } = await supabase
        .from('alumni_forums')
        .select('*')
        .eq('college_id', user.college_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForums(data || []);
      if (data && data.length > 0 && !selectedForum) {
        setSelectedForum(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching forums:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchForumPosts = async (forumId: string) => {
    try {
      const { data, error } = await supabase
        .from('alumni_forum_posts')
        .select(`
          *,
          user_profiles:author_id(first_name, last_name)
        `)
        .eq('forum_id', forumId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForumPosts(data || []);
    } catch (error) {
      console.error('Error fetching forum posts:', error);
    }
  };

  const handleJoinNetwork = async (networkId: string) => {
    try {
      const { error } = await supabase
        .from('alumni_network_members')
        .insert({
          network_id: networkId,
          user_id: user.user_id,
          role: 'member'
        });

      if (error) throw error;

      toast({
        title: 'Joined Network',
        description: 'You have successfully joined the network.',
      });

      fetchNetworks();
    } catch (error: any) {
      console.error('Error joining network:', error);
      toast({
        title: 'Join Failed',
        description: error.message || 'Failed to join network',
        variant: 'destructive',
      });
    }
  };

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !selectedForum) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('alumni_forum_posts')
        .insert({
          forum_id: selectedForum,
          author_id: user.user_id,
          title: newPostTitle,
          content: newPostContent
        });

      if (error) throw error;

      toast({
        title: 'Post Created',
        description: 'Your post has been published successfully.',
      });

      setNewPostTitle('');
      setNewPostContent('');
      fetchForumPosts(selectedForum);
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Post Failed',
        description: error.message || 'Failed to create post',
        variant: 'destructive',
      });
    }
  };

  const filteredNetworks = networks.filter(network =>
    network.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    network.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4">
      <Tabs defaultValue="networks" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="networks" className="text-xs sm:text-sm py-2 sm:py-2.5">
            Alumni Networks
          </TabsTrigger>
          <TabsTrigger value="forums" className="text-xs sm:text-sm py-2 sm:py-2.5">
            Discussion Forums
          </TabsTrigger>
          <TabsTrigger value="hub" className="text-xs sm:text-sm py-2 sm:py-2.5">
            Networking Hub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="networks">
          <Card>
            <CardHeader className="p-4 sm:p-6 space-y-3 sm:space-y-4">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-base sm:text-lg md:text-xl">Alumni Networks</span>
              </CardTitle>
              <div className="relative">
                <Search className="h-3 w-3 sm:h-4 sm:w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search networks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-9 text-xs sm:text-sm"
                />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="grid gap-3 sm:gap-4">
                {filteredNetworks.length > 0 ? (
                  filteredNetworks.map((network) => (
                    <Card key={network.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0">
                          <div className="flex-1 w-full">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <h3 className="font-semibold text-sm sm:text-base">{network.name}</h3>
                              <Badge variant="outline" className="text-xs">{network.category}</Badge>
                            </div>
                            <p className="text-gray-600 mb-2 text-xs sm:text-sm">{network.description}</p>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {network.alumni_network_members?.[0]?.count || 0} members
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleJoinNetwork(network.id)}
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            Join Network
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-6 sm:py-8">
                    <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">No networks found</h3>
                    <p className="text-xs sm:text-sm text-gray-500">Try adjusting your search criteria.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forums">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Forum List */}
            <Card className="lg:col-span-1">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-base sm:text-lg md:text-xl">Forums</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="space-y-2">
                  {forums.map((forum) => (
                    <div
                      key={forum.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedForum === forum.id
                          ? 'bg-blue-100 border-blue-300 border'
                          : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                        }`}
                      onClick={() => setSelectedForum(forum.id)}
                    >
                      <h4 className="font-medium text-sm sm:text-base">{forum.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{forum.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{forum.category}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Forum Posts */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
                    <CardTitle className="text-base sm:text-lg md:text-xl">Forum Posts</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto text-xs sm:text-sm">
                          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          New Post
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-md mx-2">
                        <DialogHeader>
                          <DialogTitle className="text-lg sm:text-xl">Create New Post</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Post title"
                            value={newPostTitle}
                            onChange={(e) => setNewPostTitle(e.target.value)}
                            className="text-xs sm:text-sm"
                          />
                          <Textarea
                            placeholder="Write your post content..."
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            rows={6}
                            className="text-xs sm:text-sm"
                          />
                          <Button onClick={handleCreatePost} className="w-full text-sm sm:text-base">
                            <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                            Publish Post
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-3 sm:space-y-4">
                    {forumPosts.length > 0 ? (
                      forumPosts.map((post) => (
                        <Card key={post.id}>
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-2">
                              <h4 className="font-medium text-sm sm:text-base">{post.title}</h4>
                              {post.is_pinned && (
                                <Badge variant="default" className="text-xs">Pinned</Badge>
                              )}
                            </div>
                            <p className="text-gray-600 mb-3 text-xs sm:text-sm">{post.content}</p>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 text-xs sm:text-sm text-gray-500">
                              <span>
                                By {post.user_profiles?.first_name} {post.user_profiles?.last_name}
                              </span>
                              <span className="text-[10px] sm:text-xs">
                                {new Date(post.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-6 sm:py-8">
                        <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">No posts yet</h3>
                        <p className="text-xs sm:text-sm text-gray-500">Be the first to start a discussion!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hub">
          <AlumniNetworkingHub alumniData={user} />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default AlumniNetworking;

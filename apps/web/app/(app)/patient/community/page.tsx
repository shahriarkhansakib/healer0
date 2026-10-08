"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Users, Heart, MessageSquare, Plus, Send, ShieldCheck, UserCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface CommunityGroup {
  id: string;
  groupName: string;
  topic: string;
  description: string | null;
  anonymousAllowed: boolean;
}

interface CommunityPost {
  id: string;
  groupId: string;
  userId: string;
  anonymousName: string | null;
  postContent: string;
  aiModerationStatus: string;
  createdAt: string;
}

interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  commentText: string;
  parentCommentId: string | null;
  aiModerationStatus: string;
  createdAt: string;
}

export default function CommunityPage() {
  const queryClient = useQueryClient();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [anonymousName, setAnonymousName] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  // Fetch groups
  const { data: groups, isLoading: loadingGroups } = useQuery<CommunityGroup[]>({
    queryKey: ['community', 'groups'],
    queryFn: () => apiFetch<CommunityGroup[]>('/community/groups'),
  });

  const activeGroup = groups?.find((g) => g.id === selectedGroupId) || groups?.[0];
  const activeGroupId = activeGroup?.id;

  // Fetch posts for active group
  const { data: posts, isLoading: loadingPosts } = useQuery<CommunityPost[]>({
    queryKey: ['community', 'posts', activeGroupId],
    queryFn: () => apiFetch<CommunityPost[]>(`/community/groups/${activeGroupId}/posts`),
    enabled: !!activeGroupId,
  });

  // Mutation: Join Group
  const joinMutation = useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/community/groups/${groupId}/join`, { method: 'POST' }),
    onSuccess: () => {
      toast.success("Joined community group!");
      queryClient.invalidateQueries({ queryKey: ['community'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join group.");
    },
  });

  // Mutation: Create Post
  const createPostMutation = useMutation({
    mutationFn: (data: { postContent: string; anonymousName?: string }) =>
      apiFetch<CommunityPost>(`/community/groups/${activeGroupId}/posts`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newPost) => {
      if (newPost.aiModerationStatus === 'Review') {
        toast.warning("Post submitted and queued for safety review.");
      } else {
        toast.success("Post published to group!");
      }
      setNewPostContent('');
      queryClient.invalidateQueries({ queryKey: ['community', 'posts', activeGroupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to post. Make sure you have joined the group.");
    },
  });

  // Mutation: Like Post
  const likeMutation = useMutation({
    mutationFn: (postId: string) =>
      apiFetch<{ alreadyLiked: boolean }>(`/community/posts/${postId}/like`, { method: 'POST' }),
    onSuccess: (res) => {
      if (res.alreadyLiked) {
        toast.info("You already liked this post.");
      } else {
        toast.success("Liked post!");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to like post.");
    },
  });

  // Mutation: Create Comment
  const createCommentMutation = useMutation({
    mutationFn: ({ postId, commentText }: { postId: string; commentText: string }) =>
      apiFetch<CommunityComment>(`/community/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ commentText }),
      }),
    onSuccess: (_, variables) => {
      toast.success("Comment added.");
      setCommentInputs((prev) => ({ ...prev, [variables.postId]: '' }));
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit comment.");
    },
  });

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !activeGroupId) return;
    createPostMutation.mutate({
      postContent: newPostContent.trim(),
      anonymousName: anonymousName.trim() || 'Anonymous Member',
    });
  };

  const handleCommentSubmit = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    createCommentMutation.mutate({ postId, commentText: text });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Peer Support & Communities</h1>
        <p className="text-sm text-muted-foreground">
          Safe, AI-moderated anonymous spaces to connect with others on similar journeys.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Group Selection */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Discussion Groups</CardTitle>
              <CardDescription className="text-xs">Find a group that resonates with you</CardDescription>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {loadingGroups ? (
                <p className="text-xs text-muted-foreground p-3">Loading groups...</p>
              ) : groups && groups.length > 0 ? (
                groups.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      activeGroupId === g.id
                        ? 'border-primary bg-primary/5 shadow-xs'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-foreground">{g.groupName}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                        {g.topic}
                      </span>
                    </div>
                    {g.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {g.description}
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinMutation.mutate(g.id);
                        }}
                      >
                        <UserCheck className="w-3 h-3 mr-1" /> Join Group
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No groups available.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Posts Feed & Composer */}
        <div className="lg:col-span-2 space-y-6">
          {activeGroup ? (
            <>
              {/* Group Header Banner */}
              <div className="p-5 rounded-2xl bg-secondary border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{activeGroup.groupName}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{activeGroup.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <ShieldCheck className="w-4 h-4" /> AI Moderated
                </div>
              </div>

              {/* Create Post Form */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Share with the group</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePostSubmit} className="space-y-3">
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Share your thoughts, advice, or ask questions anonymously..."
                      rows={3}
                      className="w-full rounded-md border border-input bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    />
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <Input
                        value={anonymousName}
                        onChange={(e) => setAnonymousName(e.target.value)}
                        placeholder="Display Name (optional)"
                        className="text-xs max-w-xs"
                      />
                      <Button type="submit" size="sm" disabled={createPostMutation.isPending}>
                        <Send className="w-3.5 h-3.5 mr-1" /> Publish Post
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Posts Feed */}
              <div className="space-y-4">
                {loadingPosts ? (
                  <p className="text-sm text-muted-foreground">Loading posts...</p>
                ) : posts && posts.length > 0 ? (
                  posts.map((post) => (
                    <Card key={post.id} className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {post.anonymousName || 'Anonymous User'}
                        </span>
                        <span>{new Date(post.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                      </div>

                      <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">
                        {post.postContent}
                      </p>

                      <div className="flex items-center gap-4 pt-2 border-t text-xs">
                        <button
                          onClick={() => likeMutation.mutate(post.id)}
                          className="flex items-center gap-1 text-muted-foreground hover:text-rose-600 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5" /> Like
                        </button>
                      </div>

                      {/* Add comment quick input */}
                      <div className="flex gap-2 pt-2">
                        <Input
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          placeholder="Write a supportive reply..."
                          className="text-xs flex-1 h-8"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleCommentSubmit(post.id)}
                        >
                          Reply
                        </Button>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center text-muted-foreground text-xs">
                    No posts yet in this group. Be the first to share!
                  </Card>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Select a group from the left to view community posts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

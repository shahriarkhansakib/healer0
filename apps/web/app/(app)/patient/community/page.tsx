"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import {
  Send,
  ShieldCheck,
  Users,
  Search,
  CheckCheck,
  Reply,
  X,
  RefreshCw,
  AlertTriangle,
  Smile,
  MessageSquare,
  Lock,
  Plus,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  UserX,
  Filter,
  LogOut,
  Clock,
  Check,
  ShieldAlert,
  Compass,
  Crown,
  Activity,
  Info,
  MoreVertical,
  Hash,
  PanelRightClose,
  PanelRightOpen,
  MessageCircle,
  Eye,
  EyeOff,
  Key,
  Copy,
  Share2,
  Settings,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  userId: string;
  anonymousName: string;
  avatarColor: string;
  role: string;
  joinedDate: string;
  createdAt: string;
  isCreator: boolean;
  isMe: boolean;
}

interface CommunityGroup {
  id: string;
  groupName: string;
  topic: string;
  description: string | null;
  avatarEmoji: string | null;
  anonymousAllowed: boolean;
  requiresApproval: boolean;
  isHidden: boolean;
  isInviteOnly: boolean;
  inviteCode?: string | null;
  creatorId: string | null;
  isMember: boolean;
  isPending: boolean;
  membershipStatus: string | null;
  isGroupAdmin: boolean;
  pendingRequestsCount: number;
  myAnonymousName: string | null;
  myAvatarColor: string | null;
  memberCount: number;
  latestMessage: {
    text: string;
    sender: string;
    createdAt: string;
  } | null;
}

interface CommunityMessage {
  id: string;
  groupId: string;
  userId: string;
  anonymousName: string;
  avatarColor: string;
  messageText: string;
  messageType: string;
  replyToId: string | null;
  replyToText: string | null;
  replyToSender: string | null;
  aiModerationStatus: string;
  createdAt: string;
}

interface PendingMemberRequest {
  id: string;
  groupId: string;
  userId: string;
  anonymousName: string | null;
  avatarColor: string | null;
  memberStatus: string;
  createdAt: string;
}

interface SendMessageResponse {
  message: CommunityMessage;
  moderationFlagged: boolean;
  crisisGuidance?: string;
}

const COLOR_CLASSES: Record<string, { bg: string; text: string; badge: string }> = {
  emerald: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-500" },
  sky: { bg: "bg-sky-500/15", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-500" },
  indigo: { bg: "bg-indigo-500/15", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-500" },
  violet: { bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-500" },
  amber: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-500" },
  rose: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-500" },
  teal: { bg: "bg-teal-500/15", text: "text-teal-700 dark:text-teal-300", badge: "bg-teal-500" },
  cyan: { bg: "bg-cyan-500/15", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-500" },
};

const SUPPORTIVE_EMOJIS = ["❤️", "🫂", "🌸", "🙏", "✨", "💪", "🌱", "☕"];
const EMOJI_OPTIONS = ["🌿", "🌙", "☀️", "🌊", "🕊️", "🌸", "☕", "💡", "🛡️", "🧘", "🫂", "🎯"];

const SUGGESTED_TOPICS = [
  "Anxiety Recovery",
  "Sleep Improvement",
  "Academic Pressure",
  "Stress Management",
  "Depression Support",
  "Mindfulness & Healing",
  "Workplace Burnout",
  "General Peer Chat",
];

const RANDOM_PSEUDONYMS = [
  "Gentle Willow", "Calm River", "Mindful Sparrow", "Peaceful Lotus",
  "Serene Breeze", "Resilient Otter", "Hopeful Falcon", "Tranquil Harbor",
  "Warm Cedar", "Quiet Pebble", "Patient Meadow", "Kind Horizon",
];

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // View Mode: 'directory' vs 'chat'
  const [viewMode, setViewMode] = useState<"directory" | "chat">("directory");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Directory Hub: Default to "my_groups" (first only show groups I am in).
  // When searching or clicking explore, show all available groups.
  const [directoryTab, setDirectoryTab] = useState<"my_groups" | "all_groups">("my_groups");
  const [directorySearch, setDirectorySearch] = useState("");
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("All");

  // Chat conversation state
  const [chatSearchFilter, setChatSearchFilter] = useState("");
  const [inputText, setInputText] = useState("");
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  const [crisisAlert, setCrisisAlert] = useState<string | null>(null);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Leave Group Dialog
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);

  // Group Members & Admin Actions Dialogs
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberToKick, setMemberToKick] = useState<GroupMember | null>(null);
  const [memberToPromote, setMemberToPromote] = useState<GroupMember | null>(null);
  const [memberToDemote, setMemberToDemote] = useState<GroupMember | null>(null);

  // Admin Pending Requests Dialog
  const [isPendingRequestsDialogOpen, setIsPendingRequestsDialogOpen] = useState(false);

  // Create Group Modal
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupTopic, setNewGroupTopic] = useState("Anxiety Recovery");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupEmoji, setNewGroupEmoji] = useState("🌿");
  const [newGroupRequiresApproval, setNewGroupRequiresApproval] = useState(false);
  const [newGroupIsHidden, setNewGroupIsHidden] = useState(false);
  const [newGroupIsInviteOnly, setNewGroupIsInviteOnly] = useState(false);

  // Join by Invite Code Modal
  const [isJoinByCodeOpen, setIsJoinByCodeOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState("");
  const [inviteCustomName, setInviteCustomName] = useState("");
  const [inviteCustomColor, setInviteCustomColor] = useState("sky");

  // Admin Group Settings Modal
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [editGroupName, setEditGroupName] = useState("");
  const [editGroupTopic, setEditGroupTopic] = useState("Anxiety Recovery");
  const [editGroupDescription, setEditGroupDescription] = useState("");
  const [editGroupEmoji, setEditGroupEmoji] = useState("🌿");
  const [editRequiresApproval, setEditRequiresApproval] = useState(false);
  const [editIsHidden, setEditIsHidden] = useState(false);
  const [editIsInviteOnly, setEditIsInviteOnly] = useState(false);

  // Room Info & Privacy Dialog
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // Regenerate Invite Code confirmation dialog
  const [isRegenerateCodeOpen, setIsRegenerateCodeOpen] = useState(false);

  // Profile Customization Modal
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [customNameInput, setCustomNameInput] = useState("");
  const [customColorInput, setCustomColorInput] = useState("sky");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Check URL query parameters for ?join=CODE or ?invite=CODE on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("join") || params.get("invite");
      if (code) {
        setInviteCodeInput(code.toUpperCase());
        setIsJoinByCodeOpen(true);
      }
    }
  }, []);

  // 1. Fetch Chat Groups
  const { data: groups, isLoading: loadingGroups } = useQuery<CommunityGroup[]>({
    queryKey: ["community", "groups"],
    queryFn: () => apiFetch<CommunityGroup[]>("/community/groups"),
    refetchInterval: 8000,
  });

  const activeGroup = groups?.find((g) => g.id === selectedGroupId) || (groups && groups.length > 0 ? groups[0] : null);
  const activeGroupId = activeGroup?.id;

  // 1b. Fetch Group Preview by Invite Code
  const cleanInviteCode = inviteCodeInput.trim().toUpperCase();
  const { data: invitePreviewGroup, isFetching: loadingInvitePreview } = useQuery<CommunityGroup | null>({
    queryKey: ["community", "by-invite", cleanInviteCode],
    queryFn: async () => {
      try {
        return await apiFetch<CommunityGroup>(`/community/groups/by-invite/${encodeURIComponent(cleanInviteCode)}`);
      } catch {
        return null;
      }
    },
    enabled: isJoinByCodeOpen && cleanInviteCode.length >= 4,
    retry: false,
  });

  // 2. Fetch Messages for Active Group in Chat view (if active member)
  const { data: messages, isLoading: loadingMessages } = useQuery<CommunityMessage[]>({
    queryKey: ["community", "messages", activeGroupId],
    queryFn: () => apiFetch<CommunityMessage[]>(`/community/groups/${activeGroupId}/messages`),
    enabled: viewMode === "chat" && !!activeGroupId && activeGroup?.isMember === true,
    refetchInterval: 3000,
  });

  // 3. Fetch Pending Requests for Group Admin
  const { data: pendingRequests, isLoading: loadingPendingRequests } = useQuery<PendingMemberRequest[]>({
    queryKey: ["community", "pending-requests", activeGroupId],
    queryFn: () => apiFetch<PendingMemberRequest[]>(`/community/groups/${activeGroupId}/pending-requests`),
    enabled: isPendingRequestsDialogOpen && !!activeGroupId && activeGroup?.isGroupAdmin === true,
    refetchInterval: 5000,
  });

  // 3b. Fetch Active Group Members
  const { data: members, isLoading: loadingMembers } = useQuery<GroupMember[]>({
    queryKey: ["community", "members", activeGroupId],
    queryFn: () => apiFetch<GroupMember[]>(`/community/groups/${activeGroupId}/members`),
    enabled: viewMode === "chat" && !!activeGroupId && activeGroup?.isMember === true,
    refetchInterval: 6000,
  });

  // Scroll to bottom within messages container when new messages arrive
  useEffect(() => {
    if (viewMode === "chat" && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages?.length]);

  // When switching groups or switching to chat mode, snap immediately to bottom and reset outer main scroll
  useEffect(() => {
    if (viewMode === "chat") {
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTop = 0;
      }
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [viewMode, activeGroupId]);

  // 4. Create Group Mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: {
      groupName: string;
      topic: string;
      description: string;
      avatarEmoji: string;
      requiresApproval: boolean;
      isHidden: boolean;
      isInviteOnly: boolean;
    }) =>
      apiFetch<CommunityGroup>("/community/groups", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (newGroup) => {
      toast.success(`Chat group "${newGroup.groupName}" created! You are the group admin.`);
      setIsCreateGroupOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupRequiresApproval(false);
      setNewGroupIsHidden(false);
      setNewGroupIsInviteOnly(false);
      queryClient.setQueryData<CommunityGroup[]>(["community", "groups"], (old) => {
        if (!old) return [newGroup];
        return [newGroup, ...old.filter((g) => g.id !== newGroup.id)];
      });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      setSelectedGroupId(newGroup.id);
      setViewMode("chat");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create chat group.");
    },
  });

  // 4b. Update Group Settings Mutation
  const updateGroupSettingsMutation = useMutation({
    mutationFn: (payload: {
      groupName?: string;
      topic?: string;
      description?: string;
      avatarEmoji?: string;
      requiresApproval?: boolean;
      isHidden?: boolean;
      isInviteOnly?: boolean;
    }) =>
      apiFetch<{ success: boolean; message: string; group: CommunityGroup }>(
        `/community/groups/${activeGroupId}/settings`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: (res) => {
      toast.success(res.message || "Group settings updated!");
      setIsGroupSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update room settings.");
    },
  });

  // 4c. Regenerate Invite Code Mutation
  const regenerateInviteCodeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; message: string; inviteCode: string }>(
        `/community/groups/${activeGroupId}/regenerate-invite-code`,
        {
          method: "POST",
        }
      ),
    onSuccess: (res) => {
      toast.success("New invite code generated!");
      setIsRegenerateCodeOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to regenerate invite code.");
    },
  });

  // 5. Join or Request to Join Group Mutation
  const joinGroupMutation = useMutation({
    mutationFn: ({ groupId, inviteCode }: { groupId: string; inviteCode?: string }) =>
      apiFetch<{ memberStatus: string }>(`/community/groups/${groupId}/join`, {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: (res, vars) => {
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      if (res.memberStatus === "Pending") {
        toast.info("Join request sent! An admin will review your membership before access is granted.");
      } else {
        toast.success("Joined community chat room!");
        setSelectedGroupId(vars.groupId);
        setViewMode("chat");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join group.");
    },
  });

  // 5b. Join Group via Invite Code Mutation
  const joinGroupByCodeMutation = useMutation({
    mutationFn: ({
      inviteCode,
      anonymousName,
      avatarColor,
    }: {
      inviteCode: string;
      anonymousName?: string;
      avatarColor?: string;
    }) =>
      apiFetch<{ memberStatus: string; groupId?: string }>(`/community/groups/join-by-code`, {
        method: "POST",
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          anonymousName: anonymousName?.trim() || undefined,
          avatarColor,
        }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      setIsJoinByCodeOpen(false);
      setInviteCodeInput("");
      if (res.memberStatus === "Pending") {
        toast.info("Invite accepted! Join request sent to group admins for approval.");
      } else {
        toast.success("Successfully joined the private group!");
        if (res.groupId) {
          setSelectedGroupId(res.groupId);
        }
        setViewMode("chat");
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to join with invite code.");
    },
  });

  // 6. Leave Group Mutation
  const leaveGroupMutation = useMutation({
    mutationFn: (groupId: string) =>
      apiFetch(`/community/groups/${groupId}/leave`, { method: "POST" }),
    onSuccess: () => {
      toast.info("You left the chat group.");
      setIsLeaveGroupDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
      setViewMode("directory");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to leave group.");
    },
  });

  // 7. Approve Pending Request Mutation
  const approveMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      apiFetch(`/community/groups/${groupId}/members/${memberId}/approve`, { method: "POST" }),
    onSuccess: () => {
      toast.success("Member request approved!");
      queryClient.invalidateQueries({ queryKey: ["community", "pending-requests", activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to approve request.");
    },
  });

  // 8. Reject Pending Request Mutation
  const rejectMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      apiFetch(`/community/groups/${groupId}/members/${memberId}/reject`, { method: "POST" }),
    onSuccess: () => {
      toast.info("Member request rejected.");
      queryClient.invalidateQueries({ queryKey: ["community", "pending-requests", activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reject request.");
    },
  });

  // 8b. Kick Member Mutation
  const kickMemberMutation = useMutation({
    mutationFn: ({ groupId, memberId }: { groupId: string; memberId: string }) =>
      apiFetch<{ success: boolean; message: string }>(
        `/community/groups/${groupId}/members/${memberId}/kick`,
        { method: "POST" }
      ),
    onSuccess: (res) => {
      toast.success(res.message || "Member removed from the group.");
      setMemberToKick(null);
      queryClient.invalidateQueries({ queryKey: ["community", "members", activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to kick member.");
    },
  });

  // 8c. Update Member Role Mutation (Choose other user as admin / Demote)
  const updateMemberRoleMutation = useMutation({
    mutationFn: ({
      groupId,
      memberId,
      role,
    }: {
      groupId: string;
      memberId: string;
      role: "admin" | "member";
    }) =>
      apiFetch<{ success: boolean; message: string }>(
        `/community/groups/${groupId}/members/${memberId}/role`,
        {
          method: "POST",
          body: JSON.stringify({ role }),
        }
      ),
    onSuccess: (res) => {
      toast.success(res.message || "Member role updated.");
      setMemberToPromote(null);
      setMemberToDemote(null);
      queryClient.invalidateQueries({ queryKey: ["community", "members", activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update member role.");
    },
  });

  // 9. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: (payload: { messageText: string; replyToId?: string; replyToText?: string; replyToSender?: string }) =>
      apiFetch<SendMessageResponse>(`/community/groups/${activeGroupId}/messages`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setInputText("");
      setReplyingTo(null);
      if (data.moderationFlagged && data.crisisGuidance) {
        setCrisisAlert(data.crisisGuidance);
      }
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deliver message.");
    },
  });

  // 10. Update Anonymous Handle Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (payload: { anonymousName: string; avatarColor: string }) =>
      apiFetch(`/community/groups/${activeGroupId}/profile`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Anonymous identity updated!");
      setIsProfileModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["community", "messages", activeGroupId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update anonymous identity.");
    },
  });

  const handleOpenGroup = (group: CommunityGroup) => {
    setSelectedGroupId(group.id);
    if (group.isMember || group.isPending) {
      setViewMode("chat");
    } else if (group.isInviteOnly) {
      setInviteCodeInput(group.inviteCode || "");
      setIsJoinByCodeOpen(true);
    } else {
      joinGroupMutation.mutate({ groupId: group.id });
    }
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTop = 0;
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeGroupId || sendMessageMutation.isPending) return;

    sendMessageMutation.mutate({
      messageText: inputText.trim(),
      replyToId: replyingTo?.id,
      replyToText: replyingTo ? replyingTo.messageText.slice(0, 100) : undefined,
      replyToSender: replyingTo?.anonymousName,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleOpenProfileModal = () => {
    setCustomNameInput(activeGroup?.myAnonymousName || "");
    setCustomColorInput(activeGroup?.myAvatarColor || "sky");
    setIsProfileModalOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customNameInput.trim() || !activeGroupId) return;
    updateProfileMutation.mutate({
      anonymousName: customNameInput.trim(),
      avatarColor: customColorInput,
    });
  };

  const handleRollRandomName = () => {
    const random = RANDOM_PSEUDONYMS[Math.floor(Math.random() * RANDOM_PSEUDONYMS.length)];
    setCustomNameInput(random);
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !newGroupTopic.trim()) return;

    createGroupMutation.mutate({
      groupName: newGroupName.trim(),
      topic: newGroupTopic.trim(),
      description: newGroupDescription.trim(),
      avatarEmoji: newGroupEmoji,
      requiresApproval: newGroupRequiresApproval,
      isHidden: newGroupIsHidden,
      isInviteOnly: newGroupIsInviteOnly,
    });
  };

  const handleOpenGroupSettings = () => {
    if (!activeGroup) return;
    setEditGroupName(activeGroup.groupName);
    setEditGroupTopic(activeGroup.topic);
    setEditGroupDescription(activeGroup.description || "");
    setEditGroupEmoji(activeGroup.avatarEmoji || "🌿");
    setEditRequiresApproval(activeGroup.requiresApproval);
    setEditIsHidden(activeGroup.isHidden);
    setEditIsInviteOnly(activeGroup.isInviteOnly);
    setIsGroupSettingsOpen(true);
  };

  const handleSaveGroupSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroupId || !editGroupName.trim() || !editGroupTopic.trim()) return;

    updateGroupSettingsMutation.mutate({
      groupName: editGroupName.trim(),
      topic: editGroupTopic.trim(),
      description: editGroupDescription.trim(),
      avatarEmoji: editGroupEmoji,
      requiresApproval: editRequiresApproval,
      isHidden: editIsHidden,
      isInviteOnly: editIsInviteOnly,
    });
  };

  const handleCopyInviteCode = (code: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(code);
      toast.success(`Invite code "${code}" copied to clipboard!`);
    }
  };

  const handleCopyInviteLink = (code: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/patient/community?join=${code}`;
      navigator.clipboard.writeText(url);
      toast.success("Private invite link copied to clipboard!");
    }
  };

  // Group directory logic:
  // "First only show which group I are in, when I go to search then show all available groups"
  const isSearching = directorySearch.trim().length > 0;
  const effectiveTab = isSearching ? "all_groups" : directoryTab;

  const myJoinedGroups = (groups || []).filter((g) => g.isMember || g.isPending);
  const myGroupsCount = myJoinedGroups.length;
  const totalGroupsCount = (groups || []).length;

  const baseDirectoryGroups =
    effectiveTab === "my_groups" ? myJoinedGroups : (groups || []);

  const filteredDirectoryGroups = baseDirectoryGroups.filter((g) => {
    const matchesSearch =
      !isSearching ||
      g.groupName.toLowerCase().includes(directorySearch.toLowerCase()) ||
      g.topic.toLowerCase().includes(directorySearch.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(directorySearch.toLowerCase()));

    const matchesTopic =
      selectedTopicFilter === "All" || g.topic.toLowerCase() === selectedTopicFilter.toLowerCase();

    return matchesSearch && matchesTopic;
  });

  // Filter groups for chat sidebar
  const filteredChatGroups = (groups || []).filter(
    (g) =>
      g.groupName.toLowerCase().includes(chatSearchFilter.toLowerCase()) ||
      g.topic.toLowerCase().includes(chatSearchFilter.toLowerCase())
  );

  // Filter members for active group members modal
  const filteredMembers = (members || []).filter((m) =>
    !memberSearch.trim() ||
    m.anonymousName.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className={viewMode === "chat" ? "w-full h-[calc(100dvh-7.5rem)] max-h-[calc(100dvh-7.5rem)] flex flex-col min-h-0" : "max-w-7xl mx-auto space-y-6"}>
      {/* =========================================================================
          VIEW 1: DIRECTORY HUB
          - Default: Only shows groups user is in ("My Groups")
          - Search: Automatically shows all available groups matching search
          ========================================================================= */}
      {viewMode === "directory" ? (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          {/* Top Hero Banner & Create Group CTA */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Anonymous & AI Moderated Peer Community</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                Peer Support Chat Groups
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                Connect in real-time with fellow patients on similar paths. Chat in your joined rooms, or search to discover and join new communities.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setInviteCodeInput("");
                  setIsJoinByCodeOpen(true);
                }}
                className="h-11 px-4 rounded-xl font-semibold shadow-xs flex items-center gap-2 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
              >
                <Key className="w-4 h-4" />
                <span>Join with Invite Code</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setViewMode("chat")}
                className="h-11 px-4 rounded-xl font-semibold shadow-xs flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/10"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Open Chat Stage</span>
              </Button>
              <Button
                size="lg"
                onClick={() => setIsCreateGroupOpen(true)}
                className="h-11 px-5 rounded-xl font-semibold shadow-md flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Chat Group</span>
              </Button>
            </div>
          </div>

          {/* Search Bar & View Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search input: typing automatically searches all available groups */}
              <div className="relative w-full sm:max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
                <Input
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  placeholder="Search & discover all available chat groups..."
                  className="pl-10 pr-9 h-10 text-xs rounded-xl bg-card"
                />
                {directorySearch && (
                  <button
                    onClick={() => setDirectorySearch("")}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* View Switcher: My Groups vs Explore All */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setDirectoryTab("my_groups");
                    setDirectorySearch("");
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    effectiveTab === "my_groups"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>My Groups</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    effectiveTab === "my_groups" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {myGroupsCount}
                  </span>
                </button>

                <button
                  onClick={() => setDirectoryTab("all_groups")}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    effectiveTab === "all_groups"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Explore All Available</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    effectiveTab === "all_groups" ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {totalGroupsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills (Shown in Explore mode or when searching) */}
            {(effectiveTab === "all_groups" || isSearching) && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs animate-in fade-in-50">
                <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px] mr-1">
                  <Filter className="w-3 h-3" /> Topic:
                </span>
                {["All", "Anxiety Recovery", "Sleep Improvement", "Academic Pressure", "Stress Management"].map((topic) => (
                  <button
                    key={topic}
                    onClick={() => setSelectedTopicFilter(topic)}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all text-xs whitespace-nowrap ${
                      selectedTopicFilter === topic
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {isSearching
                    ? `Search Results across All Groups (${filteredDirectoryGroups.length})`
                    : effectiveTab === "my_groups"
                    ? "My Chat Groups"
                    : "All Available Chat Groups to Join"}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isSearching
                    ? `Showing all groups matching "${directorySearch}"`
                    : effectiveTab === "my_groups"
                    ? "Chat rooms you have joined. Click to open conversation."
                    : "Select any support room to join or request access."}
                </p>
              </div>

              {effectiveTab === "my_groups" && totalGroupsCount > myGroupsCount && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDirectoryTab("all_groups")}
                  className="text-xs h-8 gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Browse More Groups ({totalGroupsCount - myGroupsCount})</span>
                </Button>
              )}
            </div>

            {loadingGroups ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse p-6 space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredDirectoryGroups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredDirectoryGroups.map((group) => (
                  <Card
                    key={group.id}
                    onClick={() => handleOpenGroup(group)}
                    className="p-5 flex flex-col justify-between hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group bg-card"
                  >
                    <div className="space-y-3">
                      {/* Top Row: Avatar & Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 border flex items-center justify-center text-2xl group-hover:scale-105 transition-transform flex-shrink-0">
                          {group.avatarEmoji || "💬"}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {group.isHidden && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center gap-1">
                              <EyeOff className="w-2.5 h-2.5" /> Hidden
                            </span>
                          )}
                          {group.isInviteOnly && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1">
                              <Key className="w-2.5 h-2.5" /> Invite Only
                            </span>
                          )}
                          {group.requiresApproval && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Approval Req
                            </span>
                          )}
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-muted text-muted-foreground border">
                            {group.topic}
                          </span>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {group.groupName}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {group.description || "A safe haven to chat with peers and share recovery tips."}
                        </p>
                      </div>

                      {/* Latest Message Preview */}
                      {group.latestMessage && (
                        <div className="p-2.5 rounded-xl bg-muted/40 border border-dashed text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground/80 block truncate">
                            {group.latestMessage.sender}:
                          </span>
                          <p className="truncate italic">&ldquo;{group.latestMessage.text}&rdquo;</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Metadata & Action CTA */}
                    <div className="mt-5 pt-3 border-t flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>{group.memberCount} active peers</span>
                      </div>

                      {group.isMember ? (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-xs text-muted-foreground hover:text-rose-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedGroupId(group.id);
                              setIsLeaveGroupDialogOpen(true);
                            }}
                            title="Leave this group"
                          >
                            <LogOut className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-3 text-xs rounded-lg gap-1.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenGroup(group);
                            }}
                          >
                            <span>Open Chat</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : group.isPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-lg gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                          }}
                        >
                          <Clock className="w-3 h-3" />
                          <span>Request Pending</span>
                        </Button>
                      ) : group.isInviteOnly ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-lg gap-1.5 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                          }}
                        >
                          <Key className="w-3 h-3" />
                          <span>Join with Invite</span>
                        </Button>
                      ) : group.requiresApproval ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-lg gap-1.5 group-hover:border-primary group-hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                          }}
                        >
                          <Lock className="w-3 h-3" />
                          <span>Request to Join</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-xs rounded-lg gap-1.5 group-hover:border-primary group-hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenGroup(group);
                          }}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Join & Chat</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : effectiveTab === "my_groups" ? (
              /* Empty state when user hasn't joined any group yet */
              <Card className="p-12 text-center text-xs text-muted-foreground space-y-4">
                <div className="w-14 h-14 rounded-3xl bg-primary/10 text-primary border flex items-center justify-center mx-auto text-2xl">
                  💬
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <p className="font-bold text-sm text-foreground">You haven&apos;t joined any chat groups yet</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Search for topics in the search bar above or explore all available support communities to connect with peers.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    size="sm"
                    onClick={() => setDirectoryTab("all_groups")}
                    className="text-xs gap-1.5"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore Available Groups ({totalGroupsCount})</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create a Group</span>
                  </Button>
                </div>
              </Card>
            ) : (
              /* Empty state for search results */
              <Card className="p-12 text-center text-xs text-muted-foreground space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto opacity-30" />
                <p className="font-semibold text-sm text-foreground">No chat groups found</p>
                <p className="max-w-sm mx-auto text-muted-foreground">
                  No groups match your current search query. Try another keyword or create a new group.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDirectorySearch("");
                      setSelectedTopicFilter("All");
                    }}
                    className="text-xs"
                  >
                    Reset Search
                  </Button>
                  <Button size="sm" onClick={() => setIsCreateGroupOpen(true)} className="text-xs">
                    + Create Chat Group
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: HYPERSPCE-INSPIRED ULTRA-PREMIUM CHAT STAGE
            - Futuristic dark glassmorphic 3-column architecture
            - Floating action capsules (Members, Persona, Approvals, Leave, Details)
            - Elevated floating chat dock with supportive reactions and quick reply
            - Integrated Room Details, safe guidelines & peer roster
            ========================================================================= */
        <div className="relative rounded-[2rem] border border-white/10 bg-slate-950/80 backdrop-blur-2xl text-slate-100 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col h-full min-h-0 select-none animate-in fade-in-50 duration-300">
          {/* Ambient luminous glow orbs */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Stage Navigation Ribbon (matching top bar in reference) */}
          <header className="relative z-10 h-14 px-5 border-b border-white/10 bg-slate-950/60 backdrop-blur-xl flex items-center justify-between text-xs flex-shrink-0">
            {/* Left: Brand Cadence & Hub Switcher */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/30 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Healer Space
                  </span>
                  <span className="hidden sm:inline-block ml-2 text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Live Peer Network
                  </span>
                </div>
              </div>

              {/* Navigation Pill Switcher */}
              <div className="hidden md:flex items-center p-1 rounded-full bg-slate-900/80 border border-white/10 text-xs">
                <button
                  type="button"
                  className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 shadow-xs flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Chat Rooms</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("directory")}
                  className="px-3 py-1 rounded-full text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Directory Hub</span>
                </button>
              </div>
            </div>

            {/* Right: User Identity & Action Pills */}
            <div className="flex items-center gap-2.5">
              {/* Back to directory button for mobile */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("directory")}
                className="md:hidden h-8 px-2.5 text-xs text-slate-300 hover:bg-white/10"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> All Groups
              </Button>

              {/* Toggle Room Details Drawer */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRightPanel((prev) => !prev)}
                className={`h-8 px-3 rounded-full border text-xs gap-1.5 transition-all shadow-xs ${
                  showRightPanel
                    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                    : "bg-slate-900/80 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white"
                }`}
                title={showRightPanel ? "Hide room details" : "Show room details"}
              >
                {showRightPanel ? (
                  <PanelRightClose className="w-3.5 h-3.5" />
                ) : (
                  <PanelRightOpen className="w-3.5 h-3.5" />
                )}
                <span>Details</span>
                {activeGroup?.isGroupAdmin && activeGroup.pendingRequestsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </Button>
            </div>
          </header>

          {/* Main 3-Column Stage Area */}
          <div className="relative z-10 flex flex-1 min-h-0">
            {/* =========================================================================
                COLUMN 1: CHANNELS & ROOMS RAIL (Left Panel)
                ========================================================================= */}
            <aside className="w-72 xl:w-80 border-r border-white/10 flex flex-col bg-slate-950/50 backdrop-blur-xl flex-shrink-0 min-h-0">
              {/* Search Channels & + New Room Button */}
              <div className="p-3.5 border-b border-white/10 flex items-center gap-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <Input
                    value={chatSearchFilter}
                    onChange={(e) => setChatSearchFilter(e.target.value)}
                    placeholder="Search rooms..."
                    className="pl-8 h-8 text-xs bg-slate-900/80 border-white/10 text-slate-100 placeholder:text-slate-500 rounded-full focus-visible:ring-emerald-500"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="h-8 px-2.5 rounded-full border-white/15 bg-slate-900/80 hover:bg-white/10 text-slate-200 hover:text-white text-xs gap-1 font-semibold shadow-xs"
                  title="Create new room"
                >
                  <Plus className="w-3 h-3 text-emerald-400" />
                  <span>Add</span>
                </Button>
              </div>

              {/* Channels List */}
              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                {filteredChatGroups.map((g) => {
                  const isActive = activeGroupId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGroupId(g.id);
                        setReplyingTo(null);
                      }}
                      className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all duration-200 ${
                        isActive
                          ? "bg-slate-900/95 border border-emerald-500/40 shadow-lg shadow-emerald-500/10 text-white"
                          : "hover:bg-white/5 border border-transparent text-slate-300 hover:text-white"
                      }`}
                    >
                      {/* Avatar Circle with Online Glow */}
                      <div className="relative flex-shrink-0 w-11 h-11 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                        {g.avatarEmoji || "💬"}
                        {g.isMember && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-950 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                        )}
                        {g.isPending && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-amber-400 border-2 border-slate-950 rounded-full" />
                        )}
                      </div>

                      {/* Room Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className={`text-xs font-semibold truncate ${isActive ? "text-white" : "text-slate-200"}`}>
                            {g.groupName}
                          </h3>
                          {g.latestMessage && (
                            <span className="text-[9px] text-slate-400 flex-shrink-0">
                              {new Date(g.latestMessage.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {g.isPending
                            ? "⏳ Approval pending"
                            : g.latestMessage
                            ? `${g.latestMessage.sender}: ${g.latestMessage.text}`
                            : g.topic}
                        </p>
                      </div>

                      {/* Active Indicator Pill */}
                      {isActive && (
                        <div className="w-1.5 h-6 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* =========================================================================
                COLUMN 2: MAIN CHAT STAGE (Center Box)
                ========================================================================= */}
            <section className="flex-1 flex flex-col min-w-0 min-h-0 bg-slate-950/20 backdrop-blur-xs relative">
              {activeGroup ? (
                <>
                  {/* Chat Stage Header Bar */}
                  <div className="py-2.5 px-4 flex items-center justify-between border-b border-white/10 bg-slate-950/40 backdrop-blur-md flex-shrink-0">
                    {/* Room Identity Left */}
                    <div
                      onClick={() => setShowRightPanel((prev) => !prev)}
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer select-none group"
                      title="Click to toggle room details"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-lg flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                        {activeGroup.avatarEmoji || "💬"}
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {activeGroup.groupName}
                        </h2>
                        <p className="text-[11px] text-slate-400 truncate">
                          {members?.length || activeGroup.memberCount} members • {activeGroup.topic}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Crisis Guidance Banner */}
                  {crisisAlert && (
                    <div className="p-3 bg-rose-500/15 border-b border-rose-500/30 text-xs flex items-center justify-between gap-3 text-rose-200 backdrop-blur-md">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                        <span>{crisisAlert}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-rose-200 hover:bg-rose-500/30"
                        onClick={() => setCrisisAlert(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {/* Room State Handling */}
                  {activeGroup.isPending ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
                        <Clock className="w-8 h-8 animate-pulse" />
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h3 className="text-base font-bold text-white">Membership Request Under Review</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          This support room is protected and requires administrator approval before new members can enter. Your request has been queued for moderation.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewMode("directory")}
                          className="text-xs rounded-full border-white/15 bg-white/5 hover:bg-white/10 text-white"
                        >
                          Explore Other Groups
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => leaveGroupMutation.mutate(activeGroup.id)}
                          className="text-xs text-rose-400 hover:bg-rose-500/10 rounded-full"
                        >
                          Cancel Request
                        </Button>
                      </div>
                    </div>
                  ) : !activeGroup.isMember ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-lg">
                        {activeGroup.avatarEmoji || "💬"}
                      </div>
                      <div className="max-w-md space-y-1.5">
                        <h3 className="text-base font-bold text-white">Join #{activeGroup.groupName}</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {activeGroup.description || "Join this room to participate in safe, anonymous peer conversations."}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (activeGroup.isInviteOnly) {
                            setInviteCodeInput(activeGroup.inviteCode || "");
                            setIsJoinByCodeOpen(true);
                          } else {
                            joinGroupMutation.mutate({ groupId: activeGroup.id });
                          }
                        }}
                        disabled={joinGroupMutation.isPending}
                        className="text-xs px-6 h-9 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-lg shadow-emerald-500/20"
                      >
                        {activeGroup.isInviteOnly
                          ? "Enter Invite Code to Join"
                          : activeGroup.requiresApproval
                          ? "Request to Join Group"
                          : "Join & Enter Chat"}
                      </Button>
                    </div>
                  ) : (
                    /* Active Chat Stream */
                    <>
                      <div
                        ref={messagesContainerRef}
                        className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scroll-smooth"
                      >
                        {/* Centered Date / Safe Space Divider Pill */}
                        <div className="flex justify-center my-2">
                          <div className="px-4 py-1 rounded-full bg-slate-900/90 border border-white/10 text-[10px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Confidential Peer Sanctuary</span>
                            <span className="opacity-40">•</span>
                            <span>{new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                          </div>
                        </div>

                        {loadingMessages ? (
                          <div className="flex items-center justify-center py-16 text-xs text-slate-400">
                            Loading secure messages...
                          </div>
                        ) : messages && messages.length > 0 ? (
                          messages.map((msg) => {
                            if (msg.messageType === "system") {
                              return (
                                <div key={msg.id} className="flex justify-center my-3 animate-in fade-in-50">
                                  <div className="px-4 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-[11px] text-slate-300 flex items-center gap-2 shadow-xs">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                    <span>{msg.messageText}</span>
                                    <span className="text-[10px] text-slate-500 border-l border-white/10 pl-2">
                                      {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                </div>
                              );
                            }

                            const isMe = msg.userId === currentUserId;
                            const colorStyle = COLOR_CLASSES[msg.avatarColor] || COLOR_CLASSES.sky;
                            const senderMember = members?.find((m) => m.userId === msg.userId);

                            return (
                              <div
                                key={msg.id}
                                className={`group flex items-end gap-2.5 ${
                                  isMe ? "justify-end" : "justify-start"
                                }`}
                              >
                                {/* Left Avatar for Peer Messages */}
                                {!isMe && (
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border border-white/10 flex-shrink-0 shadow-sm ${colorStyle.bg} ${colorStyle.text}`}
                                    title={msg.anonymousName}
                                  >
                                    {msg.anonymousName.charAt(0)}
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                  className={`relative max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-xs shadow-md space-y-1.5 transition-all ${
                                    isMe
                                      ? "bg-gradient-to-br from-emerald-600/90 to-teal-700/90 text-white border border-emerald-400/30 rounded-br-xs"
                                      : "bg-slate-900/85 border border-white/10 text-slate-100 rounded-bl-xs"
                                  }`}
                                >
                                  {/* Peer Header Row */}
                                  {!isMe && (
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`font-bold text-[11px] ${colorStyle.text}`}>
                                        {msg.anonymousName}
                                      </span>
                                      {senderMember?.isCreator ? (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                                          <Crown className="w-2 h-2" /> Creator
                                        </span>
                                      ) : senderMember?.role === "admin" ? (
                                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                                          <ShieldCheck className="w-2 h-2" /> Admin
                                        </span>
                                      ) : null}
                                    </div>
                                  )}

                                  {/* Reply Quote Banner */}
                                  {msg.replyToText && (
                                    <div
                                      className={`p-2 rounded-xl text-[11px] border-l-2 mb-1.5 ${
                                        isMe
                                          ? "bg-white/15 border-white/60 text-white/95"
                                          : "bg-slate-950/60 border-emerald-400/60 text-slate-300"
                                      }`}
                                    >
                                      <span className="font-semibold block truncate">
                                        Replying to {msg.replyToSender || "peer"}
                                      </span>
                                      <p className="truncate italic text-[10px] opacity-80">{msg.replyToText}</p>
                                    </div>
                                  )}

                                  {/* Message Text */}
                                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.messageText}</p>

                                  {/* Timestamp & Delivery Status */}
                                  <div
                                    className={`flex items-center justify-end gap-1 text-[10px] pt-0.5 ${
                                      isMe ? "text-white/80" : "text-slate-400"
                                    }`}
                                  >
                                    <span>
                                      {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {isMe && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                                  </div>
                                </div>

                                {/* Right Avatar for Me Messages */}
                                {isMe && (
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border border-white/20 flex-shrink-0 shadow-sm ${
                                      activeGroup.myAvatarColor && COLOR_CLASSES[activeGroup.myAvatarColor]
                                        ? COLOR_CLASSES[activeGroup.myAvatarColor].badge
                                        : "bg-emerald-500"
                                    } text-white`}
                                    title="You"
                                  >
                                    {(activeGroup.myAnonymousName || "Me").charAt(0).toUpperCase()}
                                  </div>
                                )}

                                {/* Hover Action Controls */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setReplyingTo(msg)}
                                    className="p-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                                    title="Reply to message"
                                  >
                                    <Reply className="w-3 h-3" />
                                  </button>

                                  {activeGroup?.isGroupAdmin && !isMe && senderMember && (
                                    <>
                                      {senderMember.role !== "admin" && !senderMember.isCreator && (
                                        <button
                                          type="button"
                                          onClick={() => setMemberToPromote(senderMember)}
                                          className="p-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors"
                                          title={`Promote ${senderMember.anonymousName} to Admin`}
                                        >
                                          <Crown className="w-3 h-3 text-amber-400" />
                                        </button>
                                      )}

                                      {!senderMember.isCreator && (
                                        <button
                                          type="button"
                                          onClick={() => setMemberToKick(senderMember)}
                                          className="p-1.5 rounded-full bg-slate-900/80 border border-white/10 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                                          title={`Kick ${senderMember.anonymousName}`}
                                        >
                                          <UserX className="w-3 h-3 text-rose-400" />
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-20 text-slate-400 text-xs space-y-2">
                            <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-emerald-400" />
                            <p className="text-sm font-semibold text-slate-300">Quiet room so far</p>
                            <p className="text-xs text-slate-500 max-w-xs mx-auto">
                              Be the first to share an anonymous message, question, or gentle check-in.
                            </p>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Floating Bottom Chat Dock (Matching reference design) */}
                      <div className="p-4 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl flex-shrink-0 space-y-2.5">
                        {/* Replying banner */}
                        {replyingTo && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-slate-300 shadow-sm animate-in fade-in-50">
                            <div className="flex items-center gap-2 truncate">
                              <Reply className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                              <span className="truncate">
                                Replying to <strong className="text-white">{replyingTo.anonymousName}</strong>: &ldquo;{replyingTo.messageText}&rdquo;
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Quick Supportive Reactions Strip */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-sm scrollbar-none">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1 font-semibold">
                            <Smile className="w-3 h-3 text-emerald-400" /> Support:
                          </span>
                          {SUPPORTIVE_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setInputText((prev) => `${prev} ${emoji}`.trim())}
                              className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-white/10 border border-white/5 transition-transform active:scale-90 text-sm"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {/* Elevated Capsule Dock */}
                        <form
                          onSubmit={handleSendMessage}
                          className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/15 shadow-xl shadow-black/40"
                        >
                          <div className="pl-2 pr-1 text-slate-400">
                            <MessageCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                          <Input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={`Message #${activeGroup.groupName}...`}
                            className="flex-1 h-9 text-xs bg-transparent border-0 focus-visible:ring-0 focus-visible:outline-none text-white placeholder:text-slate-500 shadow-none"
                            disabled={sendMessageMutation.isPending}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            disabled={!inputText.trim() || sendMessageMutation.isPending}
                            className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Send</span>
                          </Button>
                        </form>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                  Select a chat group to start messaging.
                </div>
              )}
            </section>

            {/* =========================================================================
                COLUMN 3: ROOM DETAILS & ACTIVE MEMBERS (Profile / Details Panel)
                ========================================================================= */}
            {activeGroup && showRightPanel && (
              <aside className="w-72 xl:w-80 border-l border-white/10 flex flex-col bg-slate-950/40 backdrop-blur-xl flex-shrink-0 min-h-0 animate-in fade-in duration-200">
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Room Details</span>
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRightPanel(false)}
                    className="h-7 w-7 p-0 rounded-full hover:bg-white/10 text-slate-400"
                    title="Collapse details"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-white/10">
                  {/* Room Profile Card */}
                  <div className="text-center p-4 rounded-2xl bg-slate-900/70 border border-white/10 shadow-inner space-y-2.5">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/30 border border-emerald-500/30 mx-auto flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                      {activeGroup.avatarEmoji || "💬"}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{activeGroup.groupName}</h4>
                      <p className="text-[11px] text-emerald-400 font-medium mt-0.5">{activeGroup.topic}</p>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-white/10 text-[10px] text-slate-400">
                        <Lock className="w-3 h-3 text-emerald-400" />
                        <span>Anonymous</span>
                      </div>
                      {activeGroup.isHidden && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] text-purple-300">
                          <EyeOff className="w-3 h-3 text-purple-400" />
                          <span>Hidden Room</span>
                        </div>
                      )}
                      {activeGroup.isInviteOnly && (
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] text-indigo-300">
                          <Key className="w-3 h-3 text-indigo-400" />
                          <span>Invite Only</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Capsules Cluster (Members, Persona, Approvals, Settings, Leave) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                      Room Controls & Actions
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Action 1: Members */}
                      <button
                        type="button"
                        onClick={() => setIsMembersDialogOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium shadow-sm hover:border-emerald-500/30"
                        title="View active room members"
                      >
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Members</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-bold text-slate-300">
                          {members?.length || activeGroup.memberCount}
                        </span>
                      </button>

                      {/* Action 2: Persona Customizer */}
                      {activeGroup.isMember && (
                        <button
                          type="button"
                          onClick={handleOpenProfileModal}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium shadow-sm hover:border-indigo-500/30"
                          title="Customize your anonymous persona"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Persona</span>
                        </button>
                      )}

                      {/* Action 3: Approvals (Admin) */}
                      {activeGroup.isGroupAdmin && (
                        <button
                          type="button"
                          onClick={() => setIsPendingRequestsDialogOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium shadow-sm"
                          title="Review pending member requests"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          <span>Approvals</span>
                          {activeGroup.pendingRequestsCount > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold animate-pulse">
                              {activeGroup.pendingRequestsCount}
                            </span>
                          )}
                        </button>
                      )}

                      {/* Action 4: Room Privacy & Settings (Admin) */}
                      {activeGroup.isGroupAdmin && (
                        <button
                          type="button"
                          onClick={handleOpenGroupSettings}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 text-slate-200 hover:text-white transition-all text-xs font-medium shadow-sm hover:border-slate-400/40"
                          title="Configure room visibility & settings"
                        >
                          <Settings className="w-3.5 h-3.5 text-slate-400" />
                          <span>Settings</span>
                        </button>
                      )}

                      {/* Action 5: Leave Room */}
                      {activeGroup.isMember && (
                        <button
                          type="button"
                          onClick={() => setIsLeaveGroupDialogOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-300 transition-all text-xs font-medium shadow-sm hover:border-rose-500/30"
                          title="Leave this group"
                        >
                          <LogOut className="w-3.5 h-3.5 text-rose-400" />
                          <span>Leave</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Private Invite Link & Access Code Card */}
                  {activeGroup.inviteCode && (
                    <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Key className="w-3 h-3 text-amber-400" /> Invite Access Code
                        </span>
                        {activeGroup.isGroupAdmin && (
                          <button
                            type="button"
                            onClick={() => setIsRegenerateCodeOpen(true)}
                            className="text-[10px] text-slate-400 hover:text-amber-300 transition-colors"
                            title="Regenerate invite code"
                          >
                            Reset Code
                          </button>
                        )}
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950/80 border border-white/10 flex items-center justify-between gap-2">
                        <code className="font-mono text-xs font-bold text-amber-300 tracking-wider">
                          {activeGroup.inviteCode}
                        </code>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyInviteCode(activeGroup.inviteCode!)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Copy invite code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(activeGroup.inviteCode!)}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                            title="Copy invite link"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {activeGroup.isHidden
                          ? "This room is hidden from the directory. Peers can only discover and join using this invite code."
                          : activeGroup.isInviteOnly
                          ? "This room is invite-only. Peers need this code to enter."
                          : "Share this invite code or link with peers to invite them to this room."}
                      </p>
                    </div>
                  )}

                  {/* Connected Peers Stack */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Peers Connected ({members?.length || activeGroup.memberCount})
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsMembersDialogOpen(true)}
                        className="text-[10px] text-emerald-400 hover:underline"
                      >
                        View All
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(members || []).slice(0, 8).map((m) => {
                        const style = COLOR_CLASSES[m.avatarColor] || COLOR_CLASSES.sky;
                        return (
                          <div
                            key={m.id}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold border border-white/10 ${style.bg} ${style.text}`}
                            title={`${m.anonymousName} (${m.role})`}
                          >
                            {m.anonymousName.charAt(0)}
                          </div>
                        );
                      })}
                      {(members?.length || 0) > 8 && (
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          +{(members?.length || 0) - 8}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Room Topic & Description Card */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Community Objective
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed italic">
                      &ldquo;{activeGroup.description || "A safe haven to chat with peers, share coping strategies, and heal together."}&rdquo;
                    </p>
                  </div>

                  {/* Safe Space Safeguards */}
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-slate-950/80 border border-indigo-500/20 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Peer Space Safeguards
                    </span>
                    <ul className="text-[11px] text-slate-400 space-y-1.5 leading-normal">
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Real-time AI toxicity & crisis moderation</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>No personal identifying records revealed</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>Supportive peer dialogue only</span>
                      </li>
                    </ul>
                  </div>

                  {/* Other Available Rooms (matching bottom "Groups" in reference image) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Other Rooms
                    </span>
                    <div className="space-y-1.5">
                      {(groups || [])
                        .filter((g) => g.id !== activeGroupId)
                        .slice(0, 3)
                        .map((g) => (
                          <div
                            key={g.id}
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              setReplyingTo(null);
                            }}
                            className="p-2.5 rounded-xl bg-slate-900/50 hover:bg-white/10 border border-white/5 flex items-center justify-between cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-base">{g.avatarEmoji || "💬"}</span>
                              <div className="truncate">
                                <p className="text-xs font-semibold text-slate-200 truncate">{g.groupName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{g.topic}</p>
                              </div>
                            </div>
                            <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE CHAT GROUP DIALOG (WITH ADMIN APPROVAL TOGGLE)
          ========================================================================= */}
      <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <span>Create New Peer Chat Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Start an anonymous, supportive chat room. You can require admin approval for private discussions.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateGroupSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Group Name *</label>
              <Input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Workplace Burnout & Balance"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topic Category *</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setNewGroupTopic(topic)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      newGroupTopic === topic
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <Input
                value={newGroupTopic}
                onChange={(e) => setNewGroupTopic(e.target.value)}
                placeholder="Or type a custom topic..."
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Room Icon</label>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl border bg-muted flex items-center justify-center text-xl flex-shrink-0">
                  {newGroupEmoji}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto p-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewGroupEmoji(emoji)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                        newGroupEmoji === emoji ? "bg-primary/20 scale-110 border border-primary" : "hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Group Description (Optional)</label>
              <textarea
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                placeholder="Briefly describe what members can share or discuss in this group..."
                rows={3}
                className="w-full rounded-md border border-input bg-card p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Admin Approval Requirement Checkbox */}
            <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
              <input
                id="requiresApproval"
                type="checkbox"
                checked={newGroupRequiresApproval}
                onChange={(e) => setNewGroupRequiresApproval(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="requiresApproval" className="text-xs cursor-pointer select-none space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-amber-500" /> Require Admin Approval to Join
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Only approved peers can view chat messages and participate. You will receive member join requests to review.
                </p>
              </label>
            </div>

            {/* Hidden Group Checkbox */}
            <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
              <input
                id="isHidden"
                type="checkbox"
                checked={newGroupIsHidden}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setNewGroupIsHidden(checked);
                  if (checked) {
                    setNewGroupIsInviteOnly(true);
                  }
                }}
                className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isHidden" className="text-xs cursor-pointer select-none space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <EyeOff className="w-3.5 h-3.5 text-purple-500" /> Hidden Group (Unlisted)
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Completely hide this room from the community directory and search. Only peers who receive an invite link or code can discover and join.
                </p>
              </label>
            </div>

            {/* Invite-Only Checkbox */}
            <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
              <input
                id="isInviteOnly"
                type="checkbox"
                checked={newGroupIsInviteOnly}
                onChange={(e) => {
                  if (newGroupIsHidden && !e.target.checked) {
                    toast.info("Hidden groups must remain invite-only.");
                    return;
                  }
                  setNewGroupIsInviteOnly(e.target.checked);
                }}
                className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
              />
              <label htmlFor="isInviteOnly" className="text-xs cursor-pointer select-none space-y-0.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-500" /> Require Invite Code to Join
                </span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Peers can only join if they possess a valid invite code or private invitation link.
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateGroupOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createGroupMutation.isPending}>
                {createGroupMutation.isPending ? "Creating..." : "Create & Enter Chat"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 2: CONFIRM LEAVE GROUP DIALOG
          ========================================================================= */}
      <Dialog open={isLeaveGroupDialogOpen} onOpenChange={setIsLeaveGroupDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span>Leave Chat Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to leave <strong>#{activeGroup?.groupName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2 py-2">
            <p>
              You will be removed from this room. If this group requires administrator approval, you will have to request permission again to rejoin.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsLeaveGroupDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={leaveGroupMutation.isPending || !activeGroupId}
              onClick={() => activeGroupId && leaveGroupMutation.mutate(activeGroupId)}
            >
              {leaveGroupMutation.isPending ? "Leaving..." : "Leave Group"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 3: ADMIN PENDING MEMBER APPROVALS DIALOG
          ========================================================================= */}
      <Dialog open={isPendingRequestsDialogOpen} onOpenChange={setIsPendingRequestsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              <span>Pending Join Requests</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review and approve peers requesting to join <strong>#{activeGroup?.groupName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y max-h-72 overflow-y-auto py-1">
            {loadingPendingRequests ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Loading pending requests...</div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary border flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {req.anonymousName ? req.anonymousName.charAt(0) : "P"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {req.anonymousName || "Anonymous Patient"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Requested {new Date(req.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 border-emerald-500/30 gap-1"
                      disabled={approveMemberMutation.isPending}
                      onClick={() => approveMemberMutation.mutate({ groupId: req.groupId, memberId: req.id })}
                    >
                      <Check className="w-3 h-3" />
                      <span>Approve</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                      disabled={rejectMemberMutation.isPending}
                      onClick={() => rejectMemberMutation.mutate({ groupId: req.groupId, memberId: req.id })}
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-1">
                <CheckCheck className="w-6 h-6 mx-auto text-emerald-500" />
                <p className="font-medium text-foreground">No pending requests</p>
                <p className="text-[11px]">All requests for this group have been processed.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPendingRequestsDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 4: CUSTOMIZE ANONYMOUS PSEUDONYM DIALOG
          ========================================================================= */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Customize Anonymous Identity</DialogTitle>
            <DialogDescription className="text-xs">
              Choose the pseudonym and avatar accent peers will see when you chat in this room.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Your Pseudonym</label>
              <div className="flex gap-2">
                <Input
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  placeholder="e.g. Gentle Willow"
                  className="text-xs"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRollRandomName}
                  className="text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Roll
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Avatar Color Accent</label>
              <div className="flex items-center gap-2">
                {Object.keys(COLOR_CLASSES).map((colorKey) => {
                  const c = COLOR_CLASSES[colorKey];
                  const isSelected = customColorInput === colorKey;
                  return (
                    <button
                      key={colorKey}
                      type="button"
                      onClick={() => setCustomColorInput(colorKey)}
                      className={`w-7 h-7 rounded-full ${c.badge} border-2 transition-all ${
                        isSelected ? "scale-110 border-foreground shadow-md" : "border-transparent opacity-80"
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsProfileModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={updateProfileMutation.isPending}>
                Save Identity
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 5: GROUP MEMBERS ROSTER & ADMIN CONTROLS DIALOG
          ========================================================================= */}
      <Dialog open={isMembersDialogOpen} onOpenChange={setIsMembersDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Group Members</span>
              {members && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {members.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeGroup?.isGroupAdmin
                ? `Manage members in #${activeGroup?.groupName}. As an admin, you can kick disruptive users or choose other users as admins.`
                : `Connected anonymous peers in #${activeGroup?.groupName}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Search/filter member in dialog */}
          <div className="relative pt-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3.5 text-muted-foreground" />
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members by pseudonym..."
              className="pl-8 h-8 text-xs bg-muted/30"
            />
            {memberSearch && (
              <button
                onClick={() => setMemberSearch("")}
                className="absolute right-2.5 top-3 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Members List */}
          <div className="divide-y max-h-80 overflow-y-auto py-1">
            {loadingMembers ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading members...
              </div>
            ) : filteredMembers && filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const colorStyle = COLOR_CLASSES[member.avatarColor] || COLOR_CLASSES.sky;
                const canManageThisMember = activeGroup?.isGroupAdmin && !member.isMe;

                return (
                  <div
                    key={member.id}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border flex-shrink-0 ${colorStyle.bg} ${colorStyle.text}`}
                      >
                        {member.anonymousName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-foreground truncate">
                            {member.anonymousName}
                          </p>
                          {member.isMe && (
                            <span className="text-[10px] text-muted-foreground font-medium">
                              (You)
                            </span>
                          )}
                          {member.isCreator ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Crown className="w-2.5 h-2.5" /> Creator
                            </span>
                          ) : member.role === "admin" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> Admin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border">
                              Member
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Joined {new Date(member.joinedDate || member.createdAt).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Admin Actions */}
                    {canManageThisMember && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Choose / Assign Admin */}
                        {member.role !== "admin" && !member.isCreator ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-primary hover:bg-primary/10 border-primary/30 gap-1.5"
                            onClick={() => setMemberToPromote(member)}
                            title="Choose as Group Admin"
                          >
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span className="hidden sm:inline">Choose as Admin</span>
                            <span className="sm:hidden">Admin</span>
                          </Button>
                        ) : member.role === "admin" && !member.isCreator ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:bg-muted"
                            onClick={() => setMemberToDemote(member)}
                            title="Remove Admin role"
                          >
                            Demote
                          </Button>
                        ) : null}

                        {/* Kick from group */}
                        {!member.isCreator && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 gap-1"
                            onClick={() => setMemberToKick(member)}
                            title="Kick user from group"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Kick</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No members found matching &ldquo;{memberSearch}&rdquo;.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMembersDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 6: CONFIRM KICK USER DIALOG
          ========================================================================= */}
      <Dialog open={!!memberToKick} onOpenChange={(open) => !open && setMemberToKick(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <UserX className="w-4 h-4" />
              <span>Kick User from Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to kick <strong>{memberToKick?.anonymousName}</strong> from #{activeGroup?.groupName}?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2 py-2">
            <p>
              This user will be immediately removed from the chat group and will no longer be able to read messages or participate in conversations in this room.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMemberToKick(null)}
              disabled={kickMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={kickMemberMutation.isPending || !activeGroupId || !memberToKick}
              onClick={() => {
                if (activeGroupId && memberToKick) {
                  kickMemberMutation.mutate({
                    groupId: activeGroupId,
                    memberId: memberToKick.id,
                  });
                }
              }}
            >
              {kickMemberMutation.isPending ? "Kicking..." : "Kick User"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 7: CONFIRM CHOOSE AS ADMIN DIALOG
          ========================================================================= */}
      <Dialog open={!!memberToPromote} onOpenChange={(open) => !open && setMemberToPromote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Choose User as Group Admin</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Promote <strong>{memberToPromote?.anonymousName}</strong> to Administrator in #{activeGroup?.groupName}?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2 py-2">
            <p className="leading-relaxed">
              As a group admin, this member will receive privileges to:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-foreground/85">
              <li>Kick disruptive users from the chat room</li>
              <li>Choose and assign other members as group admins</li>
              <li>Review and approve or reject join requests</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMemberToPromote(null)}
              disabled={updateMemberRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updateMemberRoleMutation.isPending || !activeGroupId || !memberToPromote}
              onClick={() => {
                if (activeGroupId && memberToPromote) {
                  updateMemberRoleMutation.mutate({
                    groupId: activeGroupId,
                    memberId: memberToPromote.id,
                    role: "admin",
                  });
                }
              }}
              className="gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>{updateMemberRoleMutation.isPending ? "Assigning..." : "Assign as Admin"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 8: CONFIRM DEMOTE ADMIN DIALOG
          ========================================================================= */}
      <Dialog open={!!memberToDemote} onOpenChange={(open) => !open && setMemberToDemote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-muted-foreground" />
              <span>Remove Admin Privileges</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Demote <strong>{memberToDemote?.anonymousName}</strong> back to regular member?
            </DialogDescription>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2 py-2">
            <p>
              This user will no longer have administrative permissions to moderate members or review requests.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMemberToDemote(null)}
              disabled={updateMemberRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={updateMemberRoleMutation.isPending || !activeGroupId || !memberToDemote}
              onClick={() => {
                if (activeGroupId && memberToDemote) {
                  updateMemberRoleMutation.mutate({
                    groupId: activeGroupId,
                    memberId: memberToDemote.id,
                    role: "member",
                  });
                }
              }}
            >
              {updateMemberRoleMutation.isPending ? "Updating..." : "Remove Admin Privileges"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 9: JOIN GROUP VIA INVITE CODE / LINK DIALOG
          ========================================================================= */}
      <Dialog open={isJoinByCodeOpen} onOpenChange={setIsJoinByCodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>Join Private Group</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter an invite code or private link to preview and join hidden or invite-only recovery groups.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Group Invite Code</label>
              <div className="relative">
                <Input
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 7A4D9B12"
                  className="font-mono uppercase tracking-wider text-xs pr-8"
                  maxLength={16}
                />
                {inviteCodeInput && (
                  <button
                    type="button"
                    onClick={() => setInviteCodeInput("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Invite codes are 8-character identifiers provided by group creators or administrators.
              </p>
            </div>

            {/* Live Group Preview */}
            {cleanInviteCode.length >= 4 && (
              <div className="space-y-2">
                {loadingInvitePreview ? (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground animate-pulse">
                    Looking up group details...
                  </div>
                ) : invitePreviewGroup ? (
                  <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-card border flex items-center justify-center text-xl flex-shrink-0 shadow-xs">
                          {invitePreviewGroup.avatarEmoji || "🌿"}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            #{invitePreviewGroup.groupName}
                          </h4>
                          <span className="inline-block text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full mt-0.5">
                            {invitePreviewGroup.topic}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{invitePreviewGroup.memberCount} members</span>
                        </span>
                      </div>
                    </div>

                    {invitePreviewGroup.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {invitePreviewGroup.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                      {invitePreviewGroup.isHidden && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md">
                          <EyeOff className="w-3 h-3" /> Hidden Group
                        </span>
                      )}
                      {invitePreviewGroup.isInviteOnly && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                          <Key className="w-3 h-3" /> Invite Only
                        </span>
                      )}
                      {invitePreviewGroup.requiresApproval ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md">
                          <Lock className="w-3 h-3" /> Admin Approval Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Instant Join
                        </span>
                      )}
                    </div>

                    {invitePreviewGroup.isMember ? (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCheck className="w-4 h-4 text-emerald-600" /> You are already a member of this group.
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs bg-card"
                          onClick={() => {
                            setSelectedGroupId(invitePreviewGroup.id);
                            setViewMode("chat");
                            setIsJoinByCodeOpen(false);
                          }}
                        >
                          Open Chat
                        </Button>
                      </div>
                    ) : invitePreviewGroup.isPending ? (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Your join request has been submitted and is waiting for approval by group admins.</span>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-border/60">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                            <span>Your Anonymous Pseudonym (Optional)</span>
                            <button
                              type="button"
                              onClick={() => {
                                const random = RANDOM_PSEUDONYMS[Math.floor(Math.random() * RANDOM_PSEUDONYMS.length)];
                                setInviteCustomName(random);
                              }}
                              className="text-[11px] text-primary hover:underline flex items-center gap-1"
                            >
                              <RefreshCw className="w-2.5 h-2.5" /> Roll Random
                            </button>
                          </label>
                          <Input
                            value={inviteCustomName}
                            onChange={(e) => setInviteCustomName(e.target.value)}
                            placeholder="e.g. HopefulVoyager"
                            className="text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground">Avatar Accent</label>
                          <div className="flex items-center gap-2">
                            {Object.keys(COLOR_CLASSES).map((colorKey) => {
                              const c = COLOR_CLASSES[colorKey];
                              const isSelected = inviteCustomColor === colorKey;
                              return (
                                <button
                                  key={colorKey}
                                  type="button"
                                  onClick={() => setInviteCustomColor(colorKey)}
                                  className={`w-6 h-6 rounded-full ${c.badge} border-2 transition-all ${
                                    isSelected ? "scale-110 border-foreground shadow-xs" : "border-transparent opacity-80"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : cleanInviteCode.length >= 6 ? (
                  <div className="p-3.5 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-xs space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Invalid or Expired Invite Code
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      No group was found matching &ldquo;{cleanInviteCode}&rdquo;. Please verify the code or ask the group administrator for a fresh invite link.
                    </p>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsJoinByCodeOpen(false);
                  setInviteCodeInput("");
                }}
              >
                Cancel
              </Button>
              {(!invitePreviewGroup || !invitePreviewGroup.isMember) && (
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    joinGroupByCodeMutation.isPending ||
                    !cleanInviteCode ||
                    !invitePreviewGroup ||
                    invitePreviewGroup.isPending
                  }
                  onClick={() => {
                    joinGroupByCodeMutation.mutate({
                      inviteCode: cleanInviteCode,
                      anonymousName: inviteCustomName.trim() || undefined,
                      avatarColor: inviteCustomColor,
                    });
                  }}
                  className="gap-1.5"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>
                    {joinGroupByCodeMutation.isPending
                      ? "Joining..."
                      : invitePreviewGroup?.requiresApproval
                      ? "Submit Join Request"
                      : "Accept Invite & Join"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 10: GROUP SETTINGS & PRIVACY DIALOG (ADMIN)
          ========================================================================= */}
      <Dialog open={isGroupSettingsOpen} onOpenChange={setIsGroupSettingsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              <span>Group Settings & Privacy</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage details, directory visibility, and invite access for #{activeGroup?.groupName}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveGroupSettings} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Group Name *</label>
              <Input
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="e.g. Anxiety & Mindfulness Circle"
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Topic Category *</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {SUGGESTED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setEditGroupTopic(topic)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                      editGroupTopic === topic
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
              <Input
                value={editGroupTopic}
                onChange={(e) => setEditGroupTopic(e.target.value)}
                placeholder="Or type custom topic..."
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Room Icon</label>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl border bg-muted flex items-center justify-center text-xl flex-shrink-0">
                  {editGroupEmoji}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto p-1">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setEditGroupEmoji(emoji)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                        editGroupEmoji === emoji ? "bg-primary/20 scale-110 border border-primary" : "hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Group Description</label>
              <textarea
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
                placeholder="Briefly describe what members can share or discuss in this group..."
                rows={3}
                className="w-full rounded-md border border-input bg-card p-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Privacy & Access Controls */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-semibold text-foreground">Privacy & Membership Rules</h4>

              {/* Require Admin Approval */}
              <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
                <input
                  id="editRequiresApproval"
                  type="checkbox"
                  checked={editRequiresApproval}
                  onChange={(e) => setEditRequiresApproval(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editRequiresApproval" className="text-xs cursor-pointer select-none space-y-0.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-500" /> Require Admin Approval to Join
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    New peers must be reviewed and approved by an admin before they can view chat history or post messages.
                  </p>
                </label>
              </div>

              {/* Hidden Group Checkbox */}
              <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
                <input
                  id="editIsHidden"
                  type="checkbox"
                  checked={editIsHidden}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setEditIsHidden(checked);
                    if (checked) {
                      setEditIsInviteOnly(true);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editIsHidden" className="text-xs cursor-pointer select-none space-y-0.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5 text-purple-500" /> Hidden Group (Unlisted)
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Completely omit this group from the public directory and search. Only existing members and invited people can view or join.
                  </p>
                </label>
              </div>

              {/* Invite-Only Checkbox */}
              <div className="p-3 rounded-xl border bg-muted/30 flex items-start gap-3 cursor-pointer">
                <input
                  id="editIsInviteOnly"
                  type="checkbox"
                  checked={editIsInviteOnly}
                  onChange={(e) => {
                    if (editIsHidden && !e.target.checked) {
                      toast.info("Hidden groups must remain invite-only.");
                      return;
                    }
                    setEditIsInviteOnly(e.target.checked);
                  }}
                  className="mt-0.5 h-4 w-4 rounded-sm border-input text-primary focus:ring-primary cursor-pointer"
                />
                <label htmlFor="editIsInviteOnly" className="text-xs cursor-pointer select-none space-y-0.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-500" /> Require Invite Code to Join
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Only users who enter a valid invite code or use an invite link can request access to join.
                  </p>
                </label>
              </div>
            </div>

            {/* Invite Code & Link Management */}
            {activeGroup?.inviteCode && (
              <div className="p-3 rounded-xl border bg-muted/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-primary" /> Active Invite Code
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => setIsRegenerateCodeOpen(true)}
                  >
                    <RefreshCw className="w-3 h-3" /> Regenerate Code
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-card border rounded-lg px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-foreground">
                    {activeGroup.inviteCode}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleCopyInviteCode(activeGroup.inviteCode!)}
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => handleCopyInviteLink(activeGroup.inviteCode!)}
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share Link
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsGroupSettingsOpen(false)}
                disabled={updateGroupSettingsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateGroupSettingsMutation.isPending || !editGroupName.trim()}
              >
                {updateGroupSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 11: REGENERATE INVITE CODE CONFIRMATION DIALOG (ADMIN)
          ========================================================================= */}
      <Dialog open={isRegenerateCodeOpen} onOpenChange={setIsRegenerateCodeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <RefreshCw className="w-4 h-4 text-amber-500" />
              <span>Regenerate Invite Code?</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a new private invite code for #{activeGroup?.groupName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Important Warning
              </p>
              <p className="text-[11px] leading-relaxed">
                Regenerating the code will immediately invalidate all previously shared invite links and codes. Existing members will remain in the group, but anyone using previous invite links will no longer be able to join.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsRegenerateCodeOpen(false)}
              disabled={regenerateInviteCodeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={regenerateInviteCodeMutation.isPending || !activeGroupId}
              onClick={() => {
                regenerateInviteCodeMutation.mutate();
              }}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerateInviteCodeMutation.isPending ? "animate-spin" : ""}`} />
              <span>{regenerateInviteCodeMutation.isPending ? "Generating..." : "Generate New Code"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL 12: ROOM INFORMATION & PRIVACY DIALOG
          ========================================================================= */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Room Information</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Topic categorization, privacy settings, and access rules for #{activeGroup?.groupName}.
            </DialogDescription>
          </DialogHeader>

          {activeGroup && (
            <div className="space-y-3.5 pt-1 text-xs">
              {/* Header Card */}
              <div className="p-3 rounded-2xl bg-muted/40 border flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-card border flex items-center justify-center text-2xl flex-shrink-0 shadow-xs">
                  {activeGroup.avatarEmoji || "💬"}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-foreground truncate">
                    {activeGroup.groupName}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground text-[11px]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-emerald-500" />
                      {members?.length || activeGroup.memberCount} active members
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Anonymous chat
                    </span>
                  </div>
                </div>
              </div>

              {/* Topic Category */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Topic Category
                </span>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/25">
                    {activeGroup.topic}
                  </span>
                </div>
              </div>

              {/* Privacy: Hidden vs Public */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Visibility
                </span>
                <div className="space-y-1">
                  {activeGroup.isHidden ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold text-xs border border-purple-500/25">
                        <EyeOff className="w-3.5 h-3.5 text-purple-500" />
                        Hidden Group (Unlisted)
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This group is omitted from the community directory and search. Only existing members and users with an invite code or link can discover and join.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold text-xs border border-sky-500/25">
                        <Eye className="w-3.5 h-3.5 text-sky-500" />
                        Public Directory Group
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        This group is publicly listed in the community directory and can be found by anyone browsing recovery topics.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Access: Invite-Only vs Open */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Join Access
                </span>
                <div className="space-y-1.5">
                  {activeGroup.isInviteOnly ? (
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold text-xs border border-indigo-500/25">
                        <Key className="w-3.5 h-3.5 text-indigo-500" />
                        Invite Only Access
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        A unique 8-character invite code or private invitation link is required to join this group.
                      </p>

                      {/* Display invite code if user is a member */}
                      {activeGroup.inviteCode && (
                        <div className="p-2.5 rounded-lg bg-card border flex items-center justify-between gap-2 mt-1">
                          <code className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wider">
                            {activeGroup.inviteCode}
                          </code>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1"
                              onClick={() => handleCopyInviteCode(activeGroup.inviteCode!)}
                            >
                              <Copy className="w-3 h-3" /> Copy Code
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] gap-1"
                              onClick={() => handleCopyInviteLink(activeGroup.inviteCode!)}
                            >
                              <Share2 className="w-3 h-3" /> Share Link
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/25">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Open Access
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Any authenticated peer can join this group directly without an invite code.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Membership Approval Policy */}
              <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Membership Approval
                </span>
                <div className="space-y-1">
                  {activeGroup.requiresApproval ? (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-xs border border-amber-500/25">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Admin Approval Required
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        New peers must be reviewed and approved by a group admin before they can read or send messages in this room.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs border border-emerald-500/25">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Instant Join
                      </span>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Peers receive immediate participation access upon joining.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Group Description */}
              {activeGroup.description && (
                <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Group Objective
                  </span>
                  <p className="text-xs text-foreground/80 leading-relaxed italic">
                    &ldquo;{activeGroup.description}&rdquo;
                  </p>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                {activeGroup.isGroupAdmin ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      setIsInfoDialogOpen(false);
                      handleOpenGroupSettings();
                    }}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Edit Group Settings</span>
                  </Button>
                ) : (
                  <div />
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsInfoDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

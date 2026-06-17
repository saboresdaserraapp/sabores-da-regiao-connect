import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ActorRole } from "@/hooks/useSupportTickets";

export type ChatStatus = "waiting" | "active" | "closed";

export interface SupportChat {
  id: string;
  user_id: string;
  establishment_id: string | null;
  topic: string | null;
  status: ChatStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  closed_at: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface SupportChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: ActorRole;
  message: string;
  created_at: string;
}

export function useMyOpenChat() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    enabled: !!user,
    queryKey: ["my_open_support_chat", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_chats")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as SupportChat | null;
    },
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`my_chats_${user.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "support_chats", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["my_open_support_chat", user.id] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  return query;
}

export function useChatQueuePosition(chat: SupportChat | null | undefined) {
  const qc = useQueryClient();
  const enabled = !!chat && chat.status === "waiting";
  const query = useQuery({
    enabled,
    queryKey: ["support_chat_queue_position", chat?.id],
    queryFn: async () => {
      if (!chat) return null;
      const { count, error } = await supabase
        .from("support_chats")
        .select("id", { count: "exact", head: true })
        .eq("status", "waiting")
        .lte("created_at", chat.created_at);
      if (error) throw error;
      return Math.max(1, count ?? 1);
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!enabled) return;
    const ch = supabase
      .channel(`support_queue_${chat!.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => qc.invalidateQueries({ queryKey: ["support_chat_queue_position", chat!.id] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [enabled, chat?.id, qc]);

  return query;
}

export function useAdminChats() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["admin_support_chats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_chats")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("last_message_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportChat[];
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin_support_chats")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "support_chats" },
        () => qc.invalidateQueries({ queryKey: ["admin_support_chats"] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function useChatMessages(chatId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    enabled: !!chatId,
    queryKey: ["support_chat_messages", chatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_chat_messages")
        .select("*")
        .eq("chat_id", chatId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportChatMessage[];
    },
  });

  useEffect(() => {
    if (!chatId) return;
    const ch = supabase
      .channel(`support_chat_${chatId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "support_chat_messages", filter: `chat_id=eq.${chatId}` },
        () => qc.invalidateQueries({ queryKey: ["support_chat_messages", chatId] })
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [chatId, qc]);

  return query;
}

export function useOpenChat() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { topic?: string; establishment_id?: string | null }) => {
      const { data, error } = await supabase.from("support_chats").insert({
        user_id: user!.id,
        topic: args.topic ?? null,
        establishment_id: args.establishment_id ?? null,
      }).select("*").single();
      if (error) throw error;
      return data as SupportChat;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my_open_support_chat"] }),
  });
}

export function useSendChatMessage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (args: { chat_id: string; message: string; sender_role: ActorRole; attachments?: unknown[] }) => {
      const { error } = await supabase.from("support_chat_messages").insert({
        chat_id: args.chat_id,
        sender_id: user!.id,
        sender_role: args.sender_role,
        message: args.message,
        attachments: (args.attachments ?? []) as never,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["support_chat_messages", vars.chat_id] }),
  });
}

export function useClaimChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.rpc("claim_support_chat", { _chat_id: chatId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_support_chats"] }),
  });
}

export function useCloseChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      const { error } = await supabase.from("support_chats")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", chatId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_support_chats"] });
      qc.invalidateQueries({ queryKey: ["my_open_support_chat"] });
    },
  });
}
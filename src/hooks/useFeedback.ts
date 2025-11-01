import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Feedback {
  id: string;
  target_user_id: string;
  author_user_id: string;
  author_role: "user" | "leader";
  work_date: string;
  job_rule?: string;
  grade: number;
  review_subject: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackWithAuthor extends Feedback {
  author_username?: string;
  target_username?: string;
}

export const useFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFeedbacks = async (filters?: {
    target_user_id?: string;
    author_user_id?: string;
    work_date?: string;
    author_role?: "user" | "leader";
  }) => {
    setLoading(true);
    try {
      let query = supabase.from("feedback").select("*").order("work_date", { ascending: false });

      if (filters?.target_user_id) {
        query = query.eq("target_user_id", filters.target_user_id);
      }
      if (filters?.author_user_id) {
        query = query.eq("author_user_id", filters.author_user_id);
      }
      if (filters?.work_date) {
        query = query.eq("work_date", filters.work_date);
      }
      if (filters?.author_role) {
        query = query.eq("author_role", filters.author_role);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch usernames
      const feedbacksWithUsernames = await Promise.all(
        (data || []).map(async (feedback) => {
          const { data: authorProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", feedback.author_user_id)
            .single();

          const { data: targetProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", feedback.target_user_id)
            .single();

          return {
            ...feedback,
            author_username: authorProfile?.username,
            target_username: targetProfile?.username,
          };
        }),
      );

      setFeedbacks(feedbacksWithUsernames);
      return feedbacksWithUsernames;
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch feedbacks");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createFeedback = async (feedback: Omit<Feedback, "id" | "created_at" | "updated_at">) => {
    try {
      const { data, error } = await supabase.from("feedback").insert(feedback).select().single();

      if (error) {
        if (error.message.includes("duplicate")) {
          throw new Error("Feedback already exists for this date");
        }
        throw error;
      }

      toast.success("Feedback created successfully");
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message || "Failed to create feedback");
      return { data: null, error };
    }
  };

  const updateFeedback = async (id: string, updates: Partial<Feedback>) => {
    try {
      const { data, error } = await supabase.from("feedback").update(updates).eq("id", id).select().single();

      if (error) throw error;

      toast.success("Feedback updated successfully");
      return { data, error: null };
    } catch (error: any) {
      toast.error(error.message || "Failed to update feedback");
      return { data: null, error };
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      const { error } = await supabase.from("feedback").delete().eq("id", id);

      if (error) throw error;

      toast.success("Feedback deleted successfully");
      return { error: null };
    } catch (error: any) {
      toast.error(error.message || "Failed to delete feedback");
      return { error };
    }
  };

  const findCounterpart = async (
    targetUserId: string,
    workDate: string,
    authorRole: "user" | "leader",
  ): Promise<Feedback | null> => {
    try {
      // Find the opposite role's feedback
      const counterpartRole = authorRole === "user" ? "leader" : "user";

      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("target_user_id", targetUserId)
        .eq("work_date", workDate)
        .eq("author_role", counterpartRole)
        .maybeSingle();

      if (error) throw error;

      return data;
    } catch (error: any) {
      console.error("Failed to find counterpart:", error);
      return null;
    }
  };

  return {
    feedbacks,
    loading,
    fetchFeedbacks,
    createFeedback,
    updateFeedback,
    deleteFeedback,
    findCounterpart,
  };
};

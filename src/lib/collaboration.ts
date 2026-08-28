import { supabase } from "@/integrations/supabase/client";

/**
 * Call after a collaboration_requests row's status has already been set to 'accepted'
 * (either by the influencer accepting a pending request, or the business accepting a
 * countered offer) — creates the conversation and links it. Shared by both accept flows
 * so this two-step sequence isn't duplicated.
 */
export async function acceptCollaborationRequest(request: {
  id: string;
  business_id: string;
  influencer_id: string;
}): Promise<{ error: string | null }> {
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      party_a_type: "business",
      party_a_id: request.business_id,
      party_b_type: "influencer",
      party_b_id: request.influencer_id,
    })
    .select("id")
    .single();
  if (conversationError || !conversation) {
    return { error: conversationError?.message ?? "Could not start a conversation." };
  }

  const { error: linkError } = await supabase
    .from("collaboration_requests")
    .update({ conversation_id: conversation.id })
    .eq("id", request.id);
  if (linkError) return { error: linkError.message };

  return { error: null };
}

import { supabase } from "@/integrations/supabase/client";

/**
 * Call after a collaboration_requests row's status has already been set to 'accepted'
 * (either by the influencer accepting a pending request, or the business accepting a
 * countered offer) — creates the conversation and links it. Shared by both accept flows
 * so this two-step sequence isn't duplicated.
 *
 * The conversation id is generated client-side and the insert is NOT chained with
 * `.select()`. Chaining `.select()` turns the insert into `INSERT ... RETURNING`, and
 * conversations' SELECT policy is function-based (`in_conversation()`, which itself
 * queries `conversations`) — evaluating that against the row this same statement is
 * still inserting is unreliable and throws "new row violates row-level security policy
 * for table conversations" even though the insert's own WITH CHECK is satisfied. A bare
 * insert (no RETURNING) followed by the separate update below avoids the issue.
 */
export async function acceptCollaborationRequest(request: {
  id: string;
  business_id: string;
  influencer_id: string;
}): Promise<{ error: string | null }> {
  const conversationId = crypto.randomUUID();
  const { error: conversationError } = await supabase.from("conversations").insert({
    id: conversationId,
    party_a_type: "business",
    party_a_id: request.business_id,
    party_b_type: "influencer",
    party_b_id: request.influencer_id,
  });
  if (conversationError) {
    return { error: conversationError.message };
  }

  const { error: linkError } = await supabase
    .from("collaboration_requests")
    .update({ conversation_id: conversationId })
    .eq("id", request.id);
  if (linkError) return { error: linkError.message };

  return { error: null };
}

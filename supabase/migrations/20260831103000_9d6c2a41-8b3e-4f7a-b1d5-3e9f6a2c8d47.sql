-- Chat identification fix (audit): conversation lists/panels on both the customer and
-- business dashboards had no way to show *who* a conversation was with — chats.tsx rendered
-- the raw conversation id, and requirements.tsx/leads.tsx hardcoded the static label
-- "Conversation" on every ChatPanel. Resolving "the other party's name" needs to work for all
-- three party types (customer/business/influencer), but public.profiles only grants
-- "own profile read" (auth.uid() = id) — a business or influencer legitimately chatting with a
-- customer has no RLS path to that customer's name (businesses and influencer_profiles are
-- separately public for live/approved rows, so those two cases already resolve client-side;
-- only the customer-name case was blocked).
--
-- Rather than widening profiles' RLS (which would also hand every chat partner the customer's
-- email/phone), this adds one narrow, single-purpose function: given conversation ids the
-- caller is already a real participant in (reusing in_conversation()'s exact ownership check),
-- return just the other party's display name. SECURITY DEFINER lets it read across
-- businesses/influencer_profiles/profiles for that one purpose without changing any table's
-- RLS or exposing any other column.
create or replace function public.get_conversation_partner_names(_conversation_ids uuid[])
returns table(conversation_id uuid, partner_name text)
language sql stable security definer set search_path = public as $$
  select
    c.id,
    case
      when (c.party_a_type = 'customer' and c.party_a_id = auth.uid())
        or (c.party_a_type = 'business' and exists (select 1 from public.businesses b where b.id = c.party_a_id and b.owner_id = auth.uid()))
        or (c.party_a_type = 'influencer' and exists (select 1 from public.influencer_profiles ip where ip.id = c.party_a_id and ip.user_id = auth.uid()))
      then (
        case c.party_b_type
          when 'business' then (select b.name from public.businesses b where b.id = c.party_b_id)
          when 'influencer' then (select ip.display_name from public.influencer_profiles ip where ip.id = c.party_b_id)
          when 'customer' then (select p.name from public.profiles p where p.id = c.party_b_id)
        end
      )
      else (
        case c.party_a_type
          when 'business' then (select b.name from public.businesses b where b.id = c.party_a_id)
          when 'influencer' then (select ip.display_name from public.influencer_profiles ip where ip.id = c.party_a_id)
          when 'customer' then (select p.name from public.profiles p where p.id = c.party_a_id)
        end
      )
    end as partner_name
  from public.conversations c
  where c.id = any(_conversation_ids)
    and public.in_conversation(c.id)
$$;
revoke execute on function public.get_conversation_partner_names(uuid[]) from anon;

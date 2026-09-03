-- Smart Lead Engine V1: enrich the existing lead-notification trigger with the real match
-- score/reasons the matching engine now persists, instead of a bare "New lead" + raw category.
-- Same trigger, same notifications table, no second notification system — just a richer
-- title/body built from data that already exists on the leads row.
create or replace function public.notify_on_new_lead()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req record;
  reason jsonb;
  reason_texts text[] := '{}';
  reason_text text;
  title_text text;
  body_text text;
begin
  select category, title, urgent, city, budget into req
  from public.requirements where id = new.requirement_id;

  title_text := case
    when new.match_score >= 85 then 'Excellent match'
    when new.match_score >= 70 then 'Strong match'
    else 'Relevant match'
  end;

  for reason in select * from jsonb_array_elements(coalesce(new.match_reasons, '[]'::jsonb))
  loop
    reason_text := case reason->>'code'
      when 'category_match' then reason->>'detail'
      when 'speciality_match' then (reason->>'detail') || ' speciality'
      when 'service_match' then reason->>'detail'
      when 'intent_match' then replace(reason->>'detail', '_', ' ')
      when 'location_match' then 'serves ' || (reason->>'detail')
      when 'delivery_match' then reason->>'detail'
      else reason->>'detail'
    end;
    if reason_text is not null then
      reason_texts := reason_texts || reason_text;
    end if;
  end loop;

  body_text := coalesce(req.title, req.category, 'A new requirement');
  if array_length(reason_texts, 1) > 0 then
    body_text := body_text || ' — ' || array_to_string(reason_texts, ', ');
  end if;
  if req.budget is not null then
    body_text := body_text || ' · Budget ₹' || req.budget::text;
  end if;
  if req.urgent then
    body_text := 'Urgent: ' || body_text;
  end if;

  insert into public.notifications (recipient_type, recipient_id, type, title, body, link)
  values ('business', new.matched_business_id, 'new_lead', title_text, body_text, '/business/dashboard/leads');
  return new;
end;
$$;
revoke execute on function public.notify_on_new_lead() from public, anon, authenticated;

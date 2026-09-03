-- Smart Lead Engine V1: the exact phrase-level spelling-variant pair named in the approved
-- plan's synonym example ("'bridal jewellery'/'bridal jewelry' can normalize", §11) — the
-- single-word 'jewelry'/'jewellery' entries from part 4 don't cover this on their own, since
-- speciality canonicalization matches whole terms, not individual words within a phrase.
insert into public.keyword_synonyms (term, canonical) values
  ('bridal jewelry', 'bridal jewellery'),
  ('bridal jewellery', 'bridal jewellery')
on conflict (term) do nothing;

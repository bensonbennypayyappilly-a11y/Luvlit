
create type public.app_role as enum ('admin','moderator','user');
create type public.account_role as enum ('business','customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'customer',
  name text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::public.account_role, 'customer'),
    new.raw_user_meta_data->>'name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_approved boolean not null default false,
  suggested_by_business_id uuid,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "approved categories public" on public.categories for select using (is_approved = true);
create policy "admins read all categories" on public.categories for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "authenticated suggest category" on public.categories for insert to authenticated with check (is_approved = false);
create policy "admins manage categories" on public.categories for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins delete categories" on public.categories for delete to authenticated using (public.has_role(auth.uid(),'admin'));

insert into public.categories (name, is_approved) values
 ('Salons & Spa', true), ('Home Décor', true), ('Bakers & Patisserie', true),
 ('Fashion & Boutiques', true), ('Photography', true), ('Fitness & Wellness', true),
 ('Jewellery', true), ('Event Planning', true), ('Handmade', true), ('Gifts', true);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text unique,
  description text,
  categories text[] not null default '{}',
  business_types text[] not null default '{}',
  instagram_url text,
  whatsapp text,
  contact_email text,
  main_video_url text,
  short_video_urls text[] not null default '{}',
  brand_accent_color text,
  is_eco_friendly boolean not null default false,
  is_live boolean not null default false,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.businesses to anon, authenticated;
grant insert, update, delete on public.businesses to authenticated;
grant all on public.businesses to service_role;
alter table public.businesses enable row level security;
create policy "live businesses public" on public.businesses for select using (is_live = true);
create policy "owners read own business" on public.businesses for select to authenticated using (auth.uid() = owner_id);
create policy "admins read businesses" on public.businesses for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "owners insert business" on public.businesses for insert to authenticated with check (auth.uid() = owner_id);
create policy "owners update business" on public.businesses for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners delete business" on public.businesses for delete to authenticated using (auth.uid() = owner_id);

create or replace function public.owns_business(_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.businesses b where b.id = _business_id and b.owner_id = auth.uid())
$$;

create or replace function public.increment_business_views(_business_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  update public.businesses set view_count = view_count + 1 where id = _business_id and is_live = true;
$$;
grant execute on function public.increment_business_views(uuid) to anon, authenticated;

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  address text,
  city text not null,
  state text,
  is_primary boolean not null default false
);
grant select on public.locations to anon, authenticated;
grant insert, update, delete on public.locations to authenticated;
grant all on public.locations to service_role;
alter table public.locations enable row level security;
create policy "locations public" on public.locations for select using (true);
create policy "owners manage locations" on public.locations for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  city text,
  is_pan_india boolean not null default false
);
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;
grant all on public.delivery_areas to service_role;
alter table public.delivery_areas enable row level security;
create policy "delivery public" on public.delivery_areas for select using (true);
create policy "owners manage delivery" on public.delivery_areas for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  specializations text[] not null default '{}',
  working_hours jsonb not null default '{"start":"10:00","end":"19:00","days":[1,2,3,4,5,6]}'::jsonb,
  slot_duration_minutes int not null default 30
);
grant select on public.staff to anon, authenticated;
grant insert, update, delete on public.staff to authenticated;
grant all on public.staff to service_role;
alter table public.staff enable row level security;
create policy "staff public" on public.staff for select using (true);
create policy "owners manage staff" on public.staff for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id) on delete cascade,
  date date not null,
  start_time time not null,
  status text not null default 'open',
  unique (staff_id, date, start_time)
);
grant select, update on public.slots to anon, authenticated;
grant insert, delete on public.slots to authenticated;
grant all on public.slots to service_role;
alter table public.slots enable row level security;
create policy "slots public" on public.slots for select using (true);
create policy "guests can book slot" on public.slots for update using (status = 'open') with check (status in ('booked','open'));
create policy "owners manage slots" on public.slots for all to authenticated
  using (exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id)))
  with check (exists (select 1 from public.staff s where s.id = staff_id and public.owns_business(s.business_id)));

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  customer_user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  status text not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now()
);
grant insert on public.bookings to anon, authenticated;
grant select, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "anyone can create booking" on public.bookings for insert with check (true);
create policy "owners read bookings" on public.bookings for select to authenticated using (public.owns_business(business_id));
create policy "customers read own bookings" on public.bookings for select to authenticated using (auth.uid() = customer_user_id);
create policy "owners update bookings" on public.bookings for update to authenticated using (public.owns_business(business_id));

create table public.items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  image_url text,
  is_active boolean not null default true
);
grant select on public.items to anon, authenticated;
grant insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "items public" on public.items for select using (is_active = true);
create policy "owners manage items" on public.items for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  posted_by_type text not null check (posted_by_type in ('customer','business')),
  posted_by_user_id uuid references auth.users(id) on delete set null,
  posted_by_business_id uuid references public.businesses(id) on delete set null,
  category text not null,
  description text not null,
  city text,
  budget numeric,
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select, insert on public.requirements to authenticated;
grant all on public.requirements to service_role;
alter table public.requirements enable row level security;
create policy "poster reads own requirement" on public.requirements for select to authenticated using (auth.uid() = posted_by_user_id);
create policy "authenticated post requirement" on public.requirements for insert to authenticated with check (auth.uid() = posted_by_user_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  matched_business_id uuid not null references public.businesses(id) on delete cascade,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "business reads own leads" on public.leads for select to authenticated using (public.owns_business(matched_business_id));
create policy "poster reads leads on own requirement" on public.leads for select to authenticated
  using (exists (select 1 from public.requirements r where r.id = requirement_id and r.posted_by_user_id = auth.uid()));
create policy "business updates own leads" on public.leads for update to authenticated using (public.owns_business(matched_business_id));

create policy "matched businesses read requirement" on public.requirements for select to authenticated
  using (exists (select 1 from public.leads l where l.requirement_id = requirements.id and public.owns_business(l.matched_business_id)));

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  party_a_type text not null check (party_a_type in ('customer','business','influencer')),
  party_a_id uuid not null,
  party_b_type text not null check (party_b_type in ('customer','business','influencer')),
  party_b_id uuid not null,
  requirement_id uuid references public.requirements(id) on delete set null,
  created_at timestamptz not null default now()
);
grant select, insert on public.conversations to authenticated;
grant all on public.conversations to service_role;
alter table public.conversations enable row level security;

create or replace function public.in_conversation(_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations c
    where c.id = _conversation_id
      and (
        (c.party_a_type = 'customer' and c.party_a_id = auth.uid())
        or (c.party_b_type = 'customer' and c.party_b_id = auth.uid())
        or (c.party_a_type in ('business','influencer') and exists (select 1 from public.businesses b where b.id = c.party_a_id and b.owner_id = auth.uid()))
        or (c.party_b_type in ('business','influencer') and exists (select 1 from public.businesses b where b.id = c.party_b_id and b.owner_id = auth.uid()))
      )
  )
$$;

create policy "participants read conversations" on public.conversations for select to authenticated using (public.in_conversation(id));
create policy "authenticated create conversation" on public.conversations for insert to authenticated with check (true);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_type text not null,
  sender_id uuid not null,
  content text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "participants read messages" on public.messages for select to authenticated using (public.in_conversation(conversation_id));
create policy "participants send messages" on public.messages for insert to authenticated with check (public.in_conversation(conversation_id));
alter publication supabase_realtime add table public.messages;

create table public.influencer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  display_name text not null,
  city text,
  instagram_handle text not null,
  follower_count integer,
  engagement_rate numeric,
  categories text[] not null default '{}',
  rate_card jsonb,
  is_verified boolean not null default false,
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select on public.influencer_profiles to anon, authenticated;
grant insert, update on public.influencer_profiles to authenticated;
grant all on public.influencer_profiles to service_role;
alter table public.influencer_profiles enable row level security;
create policy "approved influencers public" on public.influencer_profiles for select using (approval_status = 'approved');
create policy "own influencer profile" on public.influencer_profiles for select to authenticated using (auth.uid() = user_id);
create policy "admins read influencers" on public.influencer_profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "create own influencer profile" on public.influencer_profiles for insert to authenticated with check (auth.uid() = user_id and approval_status = 'pending');
create policy "update own influencer profile" on public.influencer_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins review influencers" on public.influencer_profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.featured_placements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  scope text not null check (scope in ('city','all_india')),
  city text,
  category text,
  start_date date not null default current_date,
  end_date date not null,
  plan_tier text not null,
  created_at timestamptz not null default now()
);
grant select on public.featured_placements to anon, authenticated;
grant insert, update, delete on public.featured_placements to authenticated;
grant all on public.featured_placements to service_role;
alter table public.featured_placements enable row level security;
create policy "featured public" on public.featured_placements for select using (true);
create policy "owners manage featured" on public.featured_placements for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'base',
  status text not null default 'active',
  is_intro_month boolean not null default false,
  razorpay_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "owners read subscription" on public.subscriptions for select to authenticated using (public.owns_business(business_id));
create policy "admins read subscriptions" on public.subscriptions for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "owners manage subscription" on public.subscriptions for all to authenticated using (public.owns_business(business_id)) with check (public.owns_business(business_id));

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "own favorites" on public.favorites for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

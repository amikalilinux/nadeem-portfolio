create table if not exists public.portfolio_content (
  id bigint primary key generated always as identity,
  slug text not null unique default 'main',
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.portfolio_content enable row level security;

drop policy if exists "Published portfolio content is readable" on public.portfolio_content;
drop policy if exists "Authenticated admins can update portfolio content" on public.portfolio_content;
drop policy if exists "Authenticated admins can insert portfolio content" on public.portfolio_content;

create policy "Published portfolio content is readable"
  on public.portfolio_content for select
  using (true);

create policy "Authenticated admins can update portfolio content"
  on public.portfolio_content for update
  to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) = 'asha03400932@gmail.com')
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'asha03400932@gmail.com');

create policy "Authenticated admins can insert portfolio content"
  on public.portfolio_content for insert
  to authenticated
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) = 'asha03400932@gmail.com');

insert into public.portfolio_content (slug, content)
values ('main', '{}'::jsonb)
on conflict (slug) do nothing;

create or replace function public.set_portfolio_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists portfolio_content_updated_at on public.portfolio_content;
create trigger portfolio_content_updated_at
before update on public.portfolio_content
for each row execute function public.set_portfolio_updated_at();

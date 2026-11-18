-- Pick One database schema and migration
-- Safe to run in Supabase SQL Editor on both new and existing projects.
create extension if not exists pgcrypto;

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null check (char_length(question) between 1 and 120),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  created_at timestamptz not null default now()
);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

-- Add names to existing votes. Existing votes receive a generated display label.
alter table public.votes add column if not exists voter_name text;
update public.votes
set voter_name = 'Voter-' || left(replace(voter_id::text, '-', ''), 8)
where voter_name is null;
alter table public.votes alter column voter_name set not null;

-- One case-insensitive, trimmed display name per poll.
create unique index if not exists votes_poll_voter_name_unique
on public.votes (poll_id, lower(btrim(voter_name)));

alter table public.polls enable row level security;
alter table public.votes enable row level security;
revoke all on public.polls, public.votes from anon, authenticated;

create or replace function public.create_poll(p_question text, p_options jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if p_question is null or char_length(trim(p_question)) not between 1 and 120 then raise exception 'Question must be 1–120 characters'; end if;
  if p_options is null or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 8 then raise exception 'Add between 2 and 8 options'; end if;
  if exists (select 1 from jsonb_array_elements_text(p_options) x where char_length(trim(x)) not between 1 and 80) then raise exception 'Each option must be 1–80 characters'; end if;
  insert into polls(question, options)
  values (trim(p_question), (select jsonb_agg(jsonb_build_object('id', gen_random_uuid(), 'label', trim(value))) from jsonb_array_elements_text(p_options)))
  returning id into new_id;
  return new_id;
end; $$;

create or replace function public.get_poll(p_poll_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'id', p.id,
    'question', p.question,
    'options', p.options,
    'created_at', p.created_at,
    'total_votes', (select count(*) from votes v where v.poll_id = p.id),
    'results', coalesce((
      select jsonb_agg(jsonb_build_object(
        'option_id', o.value->>'id',
        'label', o.value->>'label',
        'votes', (select count(*) from votes v where v.poll_id=p.id and v.option_id=(o.value->>'id')::uuid),
        'voters', coalesce((
          select jsonb_agg(v.voter_name order by v.created_at)
          from votes v
          where v.poll_id=p.id and v.option_id=(o.value->>'id')::uuid
        ), '[]'::jsonb)
      ))
      from jsonb_array_elements(p.options) o
    ), '[]'::jsonb)
  ) into result
  from polls p where p.id = p_poll_id;
  if result is null then raise exception 'Poll not found'; end if;
  return result;
end; $$;

-- Recreate the voting RPC with a display name and update-in-place behavior.
drop function if exists public.cast_vote(uuid, uuid, uuid);
create or replace function public.cast_vote(p_poll_id uuid, p_option_id uuid, p_voter_id uuid, p_voter_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_voter_name is null or char_length(trim(p_voter_name)) not between 1 and 40 then
    raise exception 'Enter a name between 1 and 40 characters';
  end if;
  if not exists (
    select 1 from polls p, jsonb_array_elements(p.options) o
    where p.id=p_poll_id and o.value->>'id'=p_option_id::text
  ) then raise exception 'Invalid poll option'; end if;

  insert into votes(poll_id, option_id, voter_id, voter_name)
  values (p_poll_id, p_option_id, p_voter_id, trim(p_voter_name))
  on conflict (poll_id, voter_id)
  do update set option_id=excluded.option_id, voter_name=excluded.voter_name;
exception
  when unique_violation then raise exception 'That name is already being used in this poll. Choose another name.';
end; $$;

revoke all on function public.create_poll(text, jsonb) from public;
revoke all on function public.get_poll(uuid) from public;
revoke all on function public.cast_vote(uuid, uuid, uuid, text) from public;
grant execute on function public.create_poll(text, jsonb) to anon, authenticated;
grant execute on function public.get_poll(uuid) to anon, authenticated;
grant execute on function public.cast_vote(uuid, uuid, uuid, text) to anon, authenticated;

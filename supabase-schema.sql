create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists role text not null default 'student';
alter table public.profiles
  add column if not exists last_seen_at timestamptz;
alter table public.profiles
  add column if not exists avatar_path text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('student', 'admin'));
  end if;
end;
$$;

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select (id, full_name, role, last_seen_at, avatar_path)
  on table public.profiles to authenticated;
grant update (full_name, last_seen_at, avatar_path)
  on table public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Authenticated users can read student names" on public.profiles;
create policy "Authenticated users can read student names"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) is not null);

drop policy if exists "Users can update their own presence" on public.profiles;
create policy "Users can update their own presence"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

insert into storage.buckets (
  id, name, public, file_size_limit, allowed_mime_types
)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own profile pictures"
  on storage.objects;
create policy "Users can upload their own profile pictures"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own profile pictures"
  on storage.objects;
create policy "Users can delete their own profile pictures"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-pictures'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case
      when lower(new.email) = 'joemarjoemarresmondo@gmail.com' then 'admin'
      else 'student'
    end
  )
  on conflict (id) do update
  set role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, role)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'full_name', ''),
  case
    when lower(users.email) = 'joemarjoemarresmondo@gmail.com' then 'admin'
    else 'student'
  end
from auth.users as users
on conflict (id) do update
set role = excluded.role;

create table if not exists public.activity_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('login', 'logout')),
  session_id uuid,
  login_at timestamptz not null default now(),
  logout_at timestamptz,
  full_name text not null default '',
  role text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.activity_logs
  add column if not exists session_id uuid;
alter table public.activity_logs
  add column if not exists login_at timestamptz;
alter table public.activity_logs
  add column if not exists logout_at timestamptz;
update public.activity_logs
set login_at = created_at
where login_at is null;
alter table public.activity_logs
  alter column login_at set default now(),
  alter column login_at set not null;
do $$
declare
  logout_log record;
  login_log_id bigint;
begin
  for logout_log in
    select id, user_id, created_at
    from public.activity_logs
    where event_type = 'logout'
      and session_id is null
    order by created_at, id
  loop
    login_log_id := null;

    select id
    into login_log_id
    from public.activity_logs
    where user_id = logout_log.user_id
      and event_type = 'login'
      and session_id is null
      and logout_at is null
      and created_at <= logout_log.created_at
    order by created_at desc, id desc
    limit 1;

    if login_log_id is not null then
      update public.activity_logs
      set logout_at = logout_log.created_at
      where id = login_log_id;

      delete from public.activity_logs
      where id = logout_log.id;
    end if;
  end loop;
end;
$$;
create unique index if not exists activity_logs_session_id_key
  on public.activity_logs (session_id)
  where session_id is not null;

alter table public.activity_logs
  add column if not exists full_name text not null default '';
alter table public.activity_logs
  add column if not exists email text;
alter table public.activity_logs
  add column if not exists role text;

alter table public.activity_logs enable row level security;
revoke all on table public.activity_logs from anon, authenticated;
grant insert (user_id, event_type, session_id) on table public.activity_logs to authenticated;
grant update (logout_at) on table public.activity_logs to authenticated;
grant select on table public.activity_logs to authenticated;

create or replace function public.capture_activity_log_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select
    coalesce(
      nullif(profiles.full_name, ''),
      users.raw_user_meta_data ->> 'full_name',
      ''
    ),
    profiles.role,
    users.email
  into new.full_name, new.role, new.email
  from auth.users as users
  left join public.profiles as profiles on profiles.id = users.id
  where users.id = (select auth.uid());

  if not found then
    raise exception 'An authenticated user is required to record activity.';
  end if;

  return new;
end;
$$;

drop trigger if exists capture_activity_log_identity on public.activity_logs;
create trigger capture_activity_log_identity
  before insert on public.activity_logs
  for each row execute function public.capture_activity_log_identity();

update public.activity_logs as logs
set
  full_name = coalesce(
    nullif(profiles.full_name, ''),
    users.raw_user_meta_data ->> 'full_name',
    ''
  ),
  role = profiles.role,
  email = users.email
from auth.users as users
left join public.profiles as profiles on profiles.id = users.id
where logs.user_id = users.id;

drop policy if exists "Users can record their own login and logout" on public.activity_logs;
create policy "Users can record their own login and logout"
  on public.activity_logs
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can close their own activity sessions" on public.activity_logs;
create policy "Users can close their own activity sessions"
  on public.activity_logs
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.close_activity_session(p_session_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.activity_logs
  set logout_at = now()
  where user_id = (select auth.uid())
    and session_id = p_session_id
    and logout_at is null;
$$;

revoke all on function public.close_activity_session(uuid) from public, anon;
grant execute on function public.close_activity_session(uuid) to authenticated;

drop policy if exists "Users can read their own activity logs" on public.activity_logs;
create policy "Users can read their own activity logs"
  on public.activity_logs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins can read activity logs" on public.activity_logs;
create policy "Admins can read activity logs"
  on public.activity_logs
  for select
  to authenticated
  using ((select public.is_admin()));

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 120),
  subject text not null default 'General',
  description text not null default '',
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  is_published boolean not null default true,
  revision integer not null default 1
);

alter table public.quizzes
  add column if not exists subject text not null default 'General';
alter table public.quizzes
  add column if not exists revision integer not null default 1;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null check (position > 0),
  prompt text not null check (length(btrim(prompt)) between 1 and 500),
  choices jsonb not null check (
    case
      when jsonb_typeof(choices) = 'array' then jsonb_array_length(choices) = 4
      else false
    end
  ),
  answer_index smallint not null check (answer_index between 0 and 3),
  unique (quiz_id, position)
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score integer not null check (score >= 0),
  total integer not null check (total > 0 and score <= total),
  submitted_at timestamptz not null default now(),
  quiz_revision integer not null default 1,
  unique (quiz_id, user_id)
);

alter table public.quiz_attempts
  add column if not exists quiz_revision integer not null default 1;

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;

revoke all on table public.quizzes, public.quiz_questions, public.quiz_attempts
  from anon, authenticated;

grant select (id, title, subject, description, created_by, created_at, is_published)
  on public.quizzes to authenticated;
grant select (revision) on public.quizzes to authenticated;
grant insert (title, subject, description, created_by)
  on public.quizzes to authenticated;
grant update (title, description, is_published)
  on public.quizzes to authenticated;
grant delete on public.quizzes to authenticated;

grant select (id, quiz_id, position, prompt, choices)
  on public.quiz_questions to authenticated;
grant insert (quiz_id, position, prompt, choices, answer_index)
  on public.quiz_questions to authenticated;
grant update (position, prompt, choices, answer_index)
  on public.quiz_questions to authenticated;
grant delete on public.quiz_questions to authenticated;

grant select (quiz_id, user_id, score, total, submitted_at)
  on public.quiz_attempts to authenticated;
grant select (quiz_revision) on public.quiz_attempts to authenticated;

drop policy if exists "Users can read published quizzes and admins all quizzes"
  on public.quizzes;
create policy "Users can read published quizzes and admins all quizzes"
  on public.quizzes for select to authenticated
  using (is_published or (select public.is_admin()));

drop policy if exists "Admins can create quizzes" on public.quizzes;
create policy "Admins can create quizzes"
  on public.quizzes for insert to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

drop policy if exists "Admins can update quizzes" on public.quizzes;
create policy "Admins can update quizzes"
  on public.quizzes for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete quizzes" on public.quizzes;
create policy "Admins can delete quizzes"
  on public.quizzes for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "Users can read questions for published quizzes"
  on public.quiz_questions;
create policy "Users can read questions for published quizzes"
  on public.quiz_questions for select to authenticated
  using (
    exists (
      select 1 from public.quizzes
      where quizzes.id = quiz_questions.quiz_id
        and (quizzes.is_published or (select public.is_admin()))
    )
  );

drop policy if exists "Admins can create quiz questions" on public.quiz_questions;
create policy "Admins can create quiz questions"
  on public.quiz_questions for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update quiz questions" on public.quiz_questions;
create policy "Admins can update quiz questions"
  on public.quiz_questions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can delete quiz questions" on public.quiz_questions;
create policy "Admins can delete quiz questions"
  on public.quiz_questions for delete to authenticated
  using ((select public.is_admin()));

drop function if exists public.get_admin_quiz_questions(uuid);
create function public.get_admin_quiz_questions(p_quiz_id uuid)
returns table (
  question_position integer,
  prompt text,
  choices jsonb,
  answer_index smallint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can view quiz answers.';
  end if;

  return query
  select questions.position, questions.prompt, questions.choices, questions.answer_index
  from public.quiz_questions as questions
  where questions.quiz_id = p_quiz_id
  order by questions.position;
end;
$$;

revoke all on function public.get_admin_quiz_questions(uuid) from public, anon;
grant execute on function public.get_admin_quiz_questions(uuid) to authenticated;

create or replace function public.update_admin_quiz(
  p_quiz_id uuid,
  p_title text,
  p_subject text,
  p_description text,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can update quizzes.';
  end if;

  if p_title is null or length(btrim(p_title)) not between 1 and 120 then
    raise exception 'Quiz title must be between 1 and 120 characters.';
  end if;

  if p_subject is null or length(btrim(p_subject)) not between 1 and 120 then
    raise exception 'Quiz subject must be between 1 and 120 characters.';
  end if;

  if length(coalesce(p_description, '')) > 500 then
    raise exception 'Quiz description must not exceed 500 characters.';
  end if;

  if p_questions is null or jsonb_typeof(p_questions) is distinct from 'array' then
    raise exception 'Quiz questions must be provided as an array.';
  end if;

  if jsonb_array_length(p_questions) = 0 then
    raise exception 'A quiz must contain at least one question.';
  end if;

  update public.quizzes
  set
    title = btrim(p_title),
    subject = btrim(p_subject),
    description = coalesce(p_description, ''),
    revision = revision + 1
  where id = p_quiz_id;

  if not found then
    raise exception 'Quiz not found.';
  end if;

  delete from public.quiz_questions
  where quiz_id = p_quiz_id;

  insert into public.quiz_questions (
    quiz_id, position, prompt, choices, answer_index
  )
  select
    p_quiz_id,
    questions.question_position,
    questions.prompt,
    questions.choices,
    questions.answer_index
  from jsonb_to_recordset(p_questions) as questions(
    question_position integer,
    prompt text,
    choices jsonb,
    answer_index smallint
  );
end;
$$;

revoke all on function public.update_admin_quiz(uuid, text, text, text, jsonb)
  from public, anon;
grant execute on function public.update_admin_quiz(uuid, text, text, text, jsonb)
  to authenticated;

drop policy if exists "Users can read their own quiz attempts and admins all"
  on public.quiz_attempts;
create policy "Users can read their own quiz attempts and admins all"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create or replace function public.submit_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_total integer;
  v_answer_count integer;
  v_score integer := 0;
  v_previous_score integer;
  v_previous_total integer;
  v_previous_revision integer;
  v_quiz_revision integer;
  v_question record;
  v_answer text;
begin
  if v_user_id is null then
    raise exception 'Sign in before submitting a quiz.';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'student'
  ) then
    raise exception 'Only student accounts can submit quizzes.';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Quiz answers must be provided as an object.';
  end if;

  select revision
  into v_quiz_revision
  from public.quizzes
  where id = p_quiz_id and is_published
  for update;

  if not found then
    raise exception 'This quiz is unavailable.';
  end if;

  select score, total, quiz_revision
  into v_previous_score, v_previous_total, v_previous_revision
  from public.quiz_attempts
  where quiz_id = p_quiz_id
    and user_id = v_user_id;

  if found and v_previous_score = v_previous_total
    and v_previous_revision = v_quiz_revision then
    raise exception 'You already earned a perfect score on this quiz version.';
  end if;

  select count(*) into v_total
  from public.quiz_questions
  where quiz_id = p_quiz_id;

  select count(*) into v_answer_count
  from jsonb_object_keys(p_answers);

  if v_total = 0 or v_answer_count <> v_total then
    raise exception 'Submit one answer for every quiz question.';
  end if;

  for v_question in
    select id, answer_index
    from public.quiz_questions
    where quiz_id = p_quiz_id
  loop
    v_answer := p_answers ->> v_question.id::text;
    if v_answer is null or v_answer !~ '^[0-3]$' then
      raise exception 'A quiz answer is missing or invalid.';
    end if;
    if v_answer::smallint = v_question.answer_index then
      v_score := v_score + 1;
    end if;
  end loop;

  insert into public.quiz_attempts (
    quiz_id, user_id, score, total, quiz_revision
  )
  values (p_quiz_id, v_user_id, v_score, v_total, v_quiz_revision)
  on conflict (quiz_id, user_id) do update
  set score = excluded.score,
      total = excluded.total,
      quiz_revision = excluded.quiz_revision,
      submitted_at = now();

  return jsonb_build_object('score', v_score, 'total', v_total);
end;
$$;

revoke all on function public.submit_quiz_attempt(uuid, jsonb) from public, anon;
grant execute on function public.submit_quiz_attempt(uuid, jsonb) to authenticated;

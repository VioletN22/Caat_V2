-- Seed essay_prompts (run once in Supabase SQL Editor if the table is empty)
-- id, created_at, updated_at are set by defaults

insert into public.essay_prompts (slug, title, description, tips, sort_order)
values
  (
    'personal-statement',
    'Personal Statement',
    'Common App main essay (650 words).',
    'Focus on a specific moment or theme that reveals your character. Show, don''t tell. Be authentic—admissions officers read thousands of essays; yours should sound like you. Start with a hook that draws the reader in.',
    0
  ),
  (
    'why-this-college',
    'Why This College?',
    'Why do you want to attend this school?',
    'Research specific programs, professors, or opportunities. Avoid generic praise. Tie your academic and career goals to what the school offers. Mention 2–3 concrete examples (e.g. a lab, a club, a course).',
    1
  ),
  (
    'why-this-major',
    'Why This Major?',
    'Why are you interested in this field of study?',
    'Connect your past experiences (courses, projects, reading) to your chosen major. Discuss what you hope to learn and how it fits your long-term goals. Be specific to the department, not just the discipline.',
    2
  ),
  (
    'community-contribution',
    'Community / Contribution',
    'How will you contribute to our community?',
    'Highlight unique perspectives, skills, or experiences you''ll bring. Mention clubs, initiatives, or campus culture you''re excited to join. Balance what you''ll give with what you hope to gain.',
    3
  )
on conflict (slug) do nothing;

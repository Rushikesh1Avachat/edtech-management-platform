INSERT INTO "categories" ("name", "slug", "description", "icon")
VALUES
  ('AI', 'ai', 'Artificial intelligence, generative AI, machine learning, and intelligent applications', 'Sparkles'),
  ('Mobile Apps', 'mobile-apps', 'iOS, Android, Flutter, React Native, and cross-platform mobile development', 'Smartphone')
ON CONFLICT DO NOTHING;

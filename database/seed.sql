INSERT INTO domains (id, name, url) VALUES
(1, 'Tech Blog (Domain A)', 'https://techblog.example.com'),
(2, 'Lifestyle (Domain B)', 'https://lifestyle.example.com')
ON CONFLICT DO NOTHING;

-- Regions use country ISO codes as slugs.
-- These map directly to URL prefixes via Next.js i18n:
--   example.com/us  → United States
--   example.com/in  → India
--   example.com/eu  → Europe
INSERT INTO regions (id, domain_id, name, slug) VALUES
(1, 1, 'United States', 'us'),
(2, 1, 'India', 'in'),
(3, 1, 'Europe', 'eu'),
(4, 2, 'United States', 'us'),
(5, 2, 'India', 'in'),
(6, 2, 'Europe', 'eu')
ON CONFLICT DO NOTHING;

INSERT INTO posts (id, domain_id, region_id, title, content, created_at) VALUES
(1, 1, 1, 'Hello World: Our First Post', '# Welcome\n\nThis is our first post written in **Markdown**.\n\nEnjoy the multi-domain blog manager!', NOW())
ON CONFLICT DO NOTHING;

SELECT setval('domains_id_seq', (SELECT MAX(id) FROM domains));
SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions));
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));

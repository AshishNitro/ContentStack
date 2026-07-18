INSERT INTO domains (id, name, url) VALUES
(1, 'Tech Blog (Domain A)', 'https://techblog.example.com'),
(2, 'Lifestyle (Domain B)', 'https://lifestyle.example.com')
ON CONFLICT DO NOTHING;

INSERT INTO regions (id, domain_id, name, slug) VALUES
(1, 1, 'Software Engineering', 'software-engineering'),
(2, 1, 'Hardware', 'hardware'),
(3, 2, 'Travel', 'travel')
ON CONFLICT DO NOTHING;

INSERT INTO posts (id, domain_id, region_id, title, content, created_at) VALUES
(1, 1, 1, 'Hello World: Our First Post', '# Welcome\n\nThis is our first post written in **Markdown**.\n\nEnjoy the multi-domain blog manager!', NOW())
ON CONFLICT DO NOTHING;

SELECT setval('domains_id_seq', (SELECT MAX(id) FROM domains));
SELECT setval('regions_id_seq', (SELECT MAX(id) FROM regions));
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));

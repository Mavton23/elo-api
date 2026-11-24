-- Grafia oficial usada em Moçambique (alinha a estrutura com a app).
UPDATE "hierarchy_nodes" SET "name" = REPLACE("name", 'Proteção', 'Protecção'), "description" = REPLACE("description", 'Proteção', 'Protecção')
WHERE "name" LIKE '%Proteção%' OR "description" LIKE '%Proteção%';

-- Nome da plataforma nas configurações do sistema.
UPDATE "system_settings" SET "value" = '"ELO — Espaço de Ligação Operacional"'::jsonb, "defaultValue" = '"ELO — Espaço de Ligação Operacional"'::jsonb
WHERE "name" = 'system_name';

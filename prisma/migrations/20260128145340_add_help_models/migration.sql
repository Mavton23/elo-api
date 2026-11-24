-- CreateEnum
CREATE TYPE "HelpCategory" AS ENUM ('GERAL', 'AUTENTICACAO', 'PERFIL', 'HIERARQUIA', 'MEMBROS', 'NOTIFICACOES', 'CONFIGURACOES', 'SOCIAL', 'ADMINISTRACAO', 'SEGURANCA');

-- CreateEnum
CREATE TYPE "HelpType" AS ENUM ('MANUAL', 'TUTORIAL', 'FAQ', 'VIDEO', 'GUIA_RAPIDO', 'ARTIGO');

-- CreateEnum
CREATE TYPE "HelpStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'ARQUIVADO', 'EM_REVISAO');

-- CreateEnum
CREATE TYPE "HelpAudience" AS ENUM ('TODOS_USUARIOS', 'MEMBROS', 'COMANDANTES', 'ADMINISTRADORES', 'NOVOS_USUARIOS');

-- CreateTable
CREATE TABLE "help_articles" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(200) NOT NULL,
    "excerpt" VARCHAR(500) NOT NULL,
    "category" "HelpCategory" NOT NULL,
    "type" "HelpType" NOT NULL,
    "tags" TEXT[],
    "audience" "HelpAudience" NOT NULL DEFAULT 'TODOS_USUARIOS',
    "content" TEXT NOT NULL,
    "videoUrl" VARCHAR(500),
    "featuredImage" VARCHAR(500),
    "status" "HelpStatus" NOT NULL DEFAULT 'RASCUNHO',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "readingTime" INTEGER,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "authorId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_sections" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" VARCHAR(50),
    "isExpanded" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "help_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_attachments" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500),
    "type" VARCHAR(50) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "size" INTEGER,
    "downloads" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "help_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_user_interactions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hasViewed" BOOLEAN NOT NULL DEFAULT false,
    "viewedAt" TIMESTAMP(3),
    "wasHelpful" BOOLEAN,
    "votedAt" TIMESTAMP(3),
    "isBookmarked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarkedAt" TIMESTAMP(3),
    "comment" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_user_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_faqs" (
    "id" TEXT NOT NULL,
    "question" VARCHAR(500) NOT NULL,
    "answer" TEXT NOT NULL,
    "category" "HelpCategory" NOT NULL,
    "tags" TEXT[],
    "audience" "HelpAudience" NOT NULL DEFAULT 'TODOS_USUARIOS',
    "order" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "helpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulVotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_search_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" VARCHAR(500) NOT NULL,
    "resultsCount" INTEGER NOT NULL,
    "clickedResultId" TEXT,
    "searchTime" INTEGER,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "help_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_article_related" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "relatedArticleId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "help_article_related_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "help_articles_slug_key" ON "help_articles"("slug");

-- CreateIndex
CREATE INDEX "help_articles_category_idx" ON "help_articles"("category");

-- CreateIndex
CREATE INDEX "help_articles_type_idx" ON "help_articles"("type");

-- CreateIndex
CREATE INDEX "help_articles_status_idx" ON "help_articles"("status");

-- CreateIndex
CREATE INDEX "help_articles_authorId_idx" ON "help_articles"("authorId");

-- CreateIndex
CREATE INDEX "help_articles_isFeatured_idx" ON "help_articles"("isFeatured");

-- CreateIndex
CREATE INDEX "help_articles_isPinned_idx" ON "help_articles"("isPinned");

-- CreateIndex
CREATE INDEX "help_articles_audience_idx" ON "help_articles"("audience");

-- CreateIndex
CREATE INDEX "help_articles_slug_idx" ON "help_articles"("slug");

-- CreateIndex
CREATE INDEX "help_sections_articleId_order_idx" ON "help_sections"("articleId", "order");

-- CreateIndex
CREATE INDEX "help_attachments_articleId_idx" ON "help_attachments"("articleId");

-- CreateIndex
CREATE INDEX "help_user_interactions_articleId_idx" ON "help_user_interactions"("articleId");

-- CreateIndex
CREATE INDEX "help_user_interactions_userId_idx" ON "help_user_interactions"("userId");

-- CreateIndex
CREATE INDEX "help_user_interactions_wasHelpful_idx" ON "help_user_interactions"("wasHelpful");

-- CreateIndex
CREATE INDEX "help_user_interactions_isBookmarked_idx" ON "help_user_interactions"("isBookmarked");

-- CreateIndex
CREATE UNIQUE INDEX "help_user_interactions_articleId_userId_key" ON "help_user_interactions"("articleId", "userId");

-- CreateIndex
CREATE INDEX "help_faqs_category_idx" ON "help_faqs"("category");

-- CreateIndex
CREATE INDEX "help_faqs_isFeatured_idx" ON "help_faqs"("isFeatured");

-- CreateIndex
CREATE INDEX "help_faqs_audience_idx" ON "help_faqs"("audience");

-- CreateIndex
CREATE INDEX "help_search_logs_userId_idx" ON "help_search_logs"("userId");

-- CreateIndex
CREATE INDEX "help_search_logs_query_idx" ON "help_search_logs"("query");

-- CreateIndex
CREATE INDEX "help_search_logs_createdAt_idx" ON "help_search_logs"("createdAt");

-- CreateIndex
CREATE INDEX "help_search_logs_clickedResultId_idx" ON "help_search_logs"("clickedResultId");

-- CreateIndex
CREATE INDEX "help_article_related_articleId_idx" ON "help_article_related"("articleId");

-- CreateIndex
CREATE INDEX "help_article_related_relatedArticleId_idx" ON "help_article_related"("relatedArticleId");

-- CreateIndex
CREATE UNIQUE INDEX "help_article_related_articleId_relatedArticleId_key" ON "help_article_related"("articleId", "relatedArticleId");

-- AddForeignKey
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_articles" ADD CONSTRAINT "help_articles_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_sections" ADD CONSTRAINT "help_sections_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "help_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_attachments" ADD CONSTRAINT "help_attachments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "help_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_user_interactions" ADD CONSTRAINT "help_user_interactions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "help_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_user_interactions" ADD CONSTRAINT "help_user_interactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_search_logs" ADD CONSTRAINT "help_search_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_search_logs" ADD CONSTRAINT "help_search_logs_clickedResultId_fkey" FOREIGN KEY ("clickedResultId") REFERENCES "help_articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_article_related" ADD CONSTRAINT "help_article_related_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "help_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_article_related" ADD CONSTRAINT "help_article_related_relatedArticleId_fkey" FOREIGN KEY ("relatedArticleId") REFERENCES "help_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

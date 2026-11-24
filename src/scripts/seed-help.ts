/**
 * Publica (ou atualiza) os guias e perguntas frequentes oficiais do ELO.
 * Idempotente: identifica artigos pelo slug e FAQs pela pergunta.
 *   pnpm seed:help
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { HELP_ARTICLES, HELP_FAQS } from './help-content/articles';

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const author =
      (await prisma.adminProfile.findFirst({ where: { adminLevel: 'SUPER_ADMIN' }, select: { userId: true } }))?.userId ??
      (await prisma.user.findFirst({ select: { id: true } }))?.id;
    if (!author) throw new Error('Não existe nenhum utilizador para assinar os guias. Crie primeiro o administrador.');

    let order = 0;
    for (const a of HELP_ARTICLES) {
      const data = {
        title: a.title, excerpt: a.excerpt, category: a.category, type: a.type, tags: a.tags,
        audience: a.audience ?? 'TODOS_USUARIOS', content: a.content, status: 'PUBLICADO' as const,
        isFeatured: !!a.featured, isPinned: !!a.pinned, order: order++, readingTime: a.readingTime,
        difficulty: 1, authorId: author, publishedAt: new Date(),
      };
      await prisma.helpArticle.upsert({ where: { slug: a.slug }, update: { ...data, publishedAt: undefined }, create: { slug: a.slug, ...data } });
    }
    let faqOrder = 0;
    for (const f of HELP_FAQS) {
      const existing = await prisma.helpFAQ.findFirst({ where: { question: f.question } });
      const data = { answer: f.answer, category: f.category, tags: f.tags, isFeatured: !!f.featured, order: faqOrder++ };
      if (existing) await prisma.helpFAQ.update({ where: { id: existing.id }, data });
      else await prisma.helpFAQ.create({ data: { question: f.question, ...data } });
    }
    console.log(`✔ ${HELP_ARTICLES.length} guias e ${HELP_FAQS.length} perguntas frequentes publicados.`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

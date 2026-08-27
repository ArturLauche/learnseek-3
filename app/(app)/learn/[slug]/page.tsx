import { db } from "@/lib/db";
import {
  contentItems,
  contentItemSources,
  generatedArtifacts,
  quizzes,
  quizQuestions,
  sources,
  topics,
  transcripts,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge } from "@appica/ui-react/badge";
import { QuizForm } from "@/components/learn/quiz-form";
import { LearningFrame } from "@/components/sandbox/learning-frame";
import { getEnv } from "@/lib/env";
import Link from "next/link";
import { buttonVariants } from "@appica/ui-react/button";
import { isPubliclyVisible } from "@/lib/content/visibility";
import { getCurrentSession } from "@/lib/auth/permissions";

export default async function LearnPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getCurrentSession();
  const [item] = await db.select().from(contentItems).where(eq(contentItems.slug, slug)).limit(1);
  if (!item || item.deletedAt) notFound();
  const visible = isPubliclyVisible(item) || item.ownerUserId === session?.user.id;
  if (!visible) notFound();

  const topic = item.primaryTopicId
    ? (await db.select().from(topics).where(eq(topics.id, item.primaryTopicId)).limit(1))[0]
    : null;
  const itemSources = await db
    .select({ source: sources, citation: contentItemSources.citation })
    .from(contentItemSources)
    .innerJoin(sources, eq(contentItemSources.sourceId, sources.id))
    .where(eq(contentItemSources.contentItemId, item.id));
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.contentItemId, item.id)).limit(1);
  const questions = quiz
    ? await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id))
    : [];
  const [artifact] = await db
    .select()
    .from(generatedArtifacts)
    .where(and(eq(generatedArtifacts.contentItemId, item.id), eq(generatedArtifacts.compileState, "compiled")))
    .limit(1);
  const sandboxOrigin = getEnv().SANDBOX_ORIGIN;
  const transcriptRows = item.uploadId
    ? await db.select().from(transcripts).where(eq(transcripts.uploadId, item.uploadId)).limit(1)
    : [];

  return (
    <article className="mx-auto max-w-2xl px-4 py-8">
      <p className="text-xs tracking-[0.2em] text-foreground-subtle uppercase">Learning item</p>
      <h1 className="mt-2 font-serif text-4xl">{item.title}</h1>
      <p className="mt-3 text-foreground-muted">{item.learningObjective}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="outline">{item.format.replaceAll("_", " ")}</Badge>
        <Badge variant="soft">{item.durationSeconds}s</Badge>
        <Badge variant="secondary">{item.origin.replaceAll("_", " ")}</Badge>
        {topic ? <Badge variant="info">{topic.name}</Badge> : null}
      </div>
      <div className="prose-oriel mt-8 space-y-4 leading-7">
        {item.bodyText.split("\n\n").map((para) => (
          <p key={para.slice(0, 32)}>{para}</p>
        ))}
      </div>
      {artifact ? (
        <div className="mt-8">
          <h2 className="mb-3 font-serif text-2xl">Interactive scene</h2>
          <LearningFrame
            src={`${sandboxOrigin}/sandbox/${artifact.id}`}
            title={`Sandboxed experience for ${item.title}`}
            fallbackText={item.bodyText}
          />
        </div>
      ) : null}
      {quiz && questions.length > 0 ? (
        <QuizForm
          quizId={quiz.id}
          questions={questions.map((q) => ({ id: q.id, prompt: q.prompt, choices: q.choices }))}
        />
      ) : null}
      {transcriptRows[0]?.fullText ? (
        <section className="mt-10">
          <h2 className="font-serif text-2xl">Transcript</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{transcriptRows[0].fullText}</p>
        </section>
      ) : null}
      <section className="mt-10">
        <h2 className="font-serif text-2xl">Sources</h2>
        <ul className="mt-3 space-y-2">
          {itemSources.map(({ source, citation }) => (
            <li key={source.id}>
              <a className="underline" href={source.canonicalUrl ?? undefined} rel="noreferrer">
                {source.title}
              </a>
              <p className="text-sm text-foreground-muted">{citation}</p>
            </li>
          ))}
        </ul>
      </section>
      <div className="mt-8 flex gap-3">
        <Link href="/home" className={buttonVariants({ variant: "primary" })}>
          Back to feed
        </Link>
        <Link href={`/share/${item.slug}`} className={buttonVariants({ variant: "outline" })}>
          Public page
        </Link>
      </div>
    </article>
  );
}

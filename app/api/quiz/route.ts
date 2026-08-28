import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { quizAttempts, quizQuestions, quizzes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { recordProgress } from "@/lib/progress";

const schema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.number().int().min(0).max(12)).max(40),
});

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, parsed.data.quizId)).limit(1);
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
  const questions = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quiz.id));
  let correct = 0;
  questions.forEach((question, index) => {
    if (parsed.data.answers[index] === question.correctIndex) correct += 1;
  });
  const score = questions.length === 0 ? 0 : correct / questions.length;
  await db.insert(quizAttempts).values({
    quizId: quiz.id,
    userId: session.user.id,
    answers: parsed.data.answers,
    score,
  });
  if (quiz.contentItemId) {
    await recordProgress({
      userId: session.user.id,
      contentItemId: quiz.contentItemId,
      completed: score >= 0.67,
      seconds: 90,
    });
  }
  return NextResponse.json({
    ok: true,
    score,
    correct,
    total: questions.length,
    explanations: questions.map((q, i) => ({
      prompt: q.prompt,
      correct: parsed.data.answers[i] === q.correctIndex,
      explanation: q.explanation,
    })),
  });
}

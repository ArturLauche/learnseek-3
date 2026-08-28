"use client";

import { useState } from "react";
import { Button } from "@appica/ui-react/button";
import { Alert, AlertDescription } from "@appica/ui-react/alert";

export function QuizForm({
  quizId,
  questions,
}: {
  quizId: string;
  questions: { id: string; prompt: string; choices: string[] }[];
}) {
  const [answers, setAnswers] = useState<number[]>(() => questions.map(() => -1));
  const [result, setResult] = useState<{ score: number; explanations: { prompt: string; correct: boolean; explanation: string | null }[] } | null>(
    null,
  );

  return (
    <form
      className="mt-6 space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const res = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, answers }),
        });
        if (res.status === 401) return;
        const json = (await res.json()) as typeof result;
        setResult(json);
      }}
    >
      {questions.map((question, index) => (
        <fieldset key={question.id} className="space-y-2">
          <legend className="font-medium">{question.prompt}</legend>
          {question.choices.map((choice, choiceIndex) => (
            <label key={choice} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={question.id}
                checked={answers[index] === choiceIndex}
                onChange={() =>
                  setAnswers((current) => {
                    const next = [...current];
                    next[index] = choiceIndex;
                    return next;
                  })
                }
              />
              {choice}
            </label>
          ))}
        </fieldset>
      ))}
      <Button type="submit">Check answers</Button>
      {result ? (
        <Alert variant={result.score >= 0.67 ? "success" : "info"}>
          <AlertDescription>
            Score {(result.score * 100).toFixed(0)}%. Wrong answers stay available to revisit — no streak pressure.
            {result.explanations.map((row) => (
              <p key={row.prompt} className="mt-2">
                {row.correct ? "Matched." : row.explanation ?? "Review the item text."}
              </p>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}

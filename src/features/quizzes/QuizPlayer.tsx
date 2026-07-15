import { useState } from 'react';
import { submitQuizAttempt } from '../../services/quizzes';
import type { Quiz } from '../../types';
import type { QuizAnswers } from '../../services/quizzes';

interface QuizPlayerProps {
  quiz: Quiz;
  uid: string;
  milestoneId: string;
  careerPathId: string;
  alreadyPassed: boolean;
  onPassed: () => void;
  onSubmitted?: () => void;
}

export function QuizPlayer({ quiz, uid, milestoneId, careerPathId, alreadyPassed, onPassed, onSubmitted }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setSingleAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setResult(null);
  }

  function setTextAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setResult(null);
  }

  function toggleMultiAnswer(questionId: string, option: string) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
    setResult(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const outcome = await submitQuizAttempt(uid, milestoneId, careerPathId, quiz, answers);
      setResult(outcome);
      onSubmitted?.();
      if (outcome.passed) {
        onPassed();
      }
    } finally {
      setSubmitting(false);
    }
  }

  function isAnswered(questionId: string, type: string) {
    const value = answers[questionId];
    if (type === 'multi') return Array.isArray(value) && value.length > 0;
    return typeof value === 'string' && value.trim() !== '';
  }

  const allAnswered = quiz.questions.every((q) => isAnswered(q.id, q.type));

  if (alreadyPassed) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        ✓ You've already passed this quiz. Milestone is complete.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {quiz.questions.map((question, i) => (
        <div key={question.id}>
          <p className="font-medium text-slate-900">
            {i + 1}. {question.prompt}
            {question.type === 'multi' && (
              <span className="ml-2 text-xs font-normal text-slate-400">(select all that apply)</span>
            )}
          </p>

          {question.type === 'single' && (
            <div className="mt-2 space-y-1">
              {(question.options ?? []).map((option) => (
                <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name={question.id}
                    value={option}
                    checked={answers[question.id] === option}
                    onChange={(e) => setSingleAnswer(question.id, e.target.value)}
                    className="h-4 w-4"
                  />
                  {option}
                </label>
              ))}
            </div>
          )}

          {question.type === 'multi' && (
            <div className="mt-2 space-y-1">
              {(question.options ?? []).map((option) => {
                const selected = Array.isArray(answers[question.id]) && (answers[question.id] as string[]).includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleMultiAnswer(question.id, option)}
                      className="h-4 w-4"
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          )}

          {question.type === 'text' && (
            <input
              type="text"
              value={typeof answers[question.id] === 'string' ? (answers[question.id] as string) : ''}
              onChange={(e) => setTextAnswer(question.id, e.target.value)}
              placeholder="Type your answer…"
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Submitting…' : 'Submit Quiz'}
      </button>

      {result && (
        <div
          className={`rounded-md px-4 py-3 text-sm ${
            result.passed
              ? 'border border-green-200 bg-green-50 text-green-800'
              : 'border border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {result.passed
            ? `✓ Passed with ${result.score}%! Milestone marked complete.`
            : `Scored ${result.score}% — need ${quiz.passingScorePct}% to pass. Review and try again.`}
        </div>
      )}
    </div>
  );
}

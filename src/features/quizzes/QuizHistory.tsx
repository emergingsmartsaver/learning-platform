import { useEffect, useState } from 'react';
import { getQuizAttempts } from '../../services/quizzes';
import type { QuizAttempt } from '../../types';

interface QuizHistoryProps {
  uid: string;
  quizId: string;
  /** Bumped by the parent after a new attempt is submitted, to trigger a refresh. */
  refreshKey: number;
}

export function QuizHistory({ uid, quizId, refreshKey }: QuizHistoryProps) {
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getQuizAttempts(uid, quizId).then((result) => {
      if (!cancelled) {
        setAttempts(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid, quizId, refreshKey]);

  if (loading) return null;
  if (attempts.length === 0) return null;

  return (
    <div className="mt-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Attempt history</p>
      <ul className="mt-1 space-y-1">
        {attempts.map((attempt) => (
          <li key={attempt.id} className="flex items-center justify-between text-xs text-slate-400">
            <span>{new Date(attempt.attemptedAt).toLocaleString()}</span>
            <span className={attempt.passed ? 'text-emerald-400' : 'text-red-400'}>
              {attempt.score}% {attempt.passed ? '· Passed' : '· Failed'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

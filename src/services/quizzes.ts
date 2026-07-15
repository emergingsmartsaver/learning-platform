import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Quiz, QuizAttempt } from '../types';

export type QuizAnswers = Record<string, string | string[]>;

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function isCorrect(question: Quiz['questions'][number], given: string | string[] | undefined): boolean {
  if (given === undefined) return false;

  if (question.type === 'single') {
    return given === question.correctAnswer;
  }

  if (question.type === 'multi') {
    const correct = new Set(Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer]);
    const givenArr = Array.isArray(given) ? given : [given];
    return givenArr.length === correct.size && givenArr.every((g) => correct.has(g));
  }

  // text — substring match rather than exact, since phrasing like "CI" vs
  // "ci pipeline" or "scale to zero" vs "scaling to zero" should both count.
  const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
  const givenText = normalizeText((Array.isArray(given) ? given[0] : given) ?? '');
  if (givenText === '') return false;
  return correctAnswers.some((c) => {
    const correctText = normalizeText(c);
    return givenText.includes(correctText) || correctText.includes(givenText);
  });
}

export function scoreQuiz(quiz: Quiz, answers: QuizAnswers): { score: number; passed: boolean } {
  const total = quiz.questions.length;
  const correctCount = quiz.questions.filter((q) => isCorrect(q, answers[q.id])).length;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { score, passed: score >= quiz.passingScorePct };
}

export async function submitQuizAttempt(
  uid: string,
  milestoneId: string,
  careerPathId: string,
  quiz: Quiz,
  answers: QuizAnswers
): Promise<{ score: number; passed: boolean }> {
  const { score, passed } = scoreQuiz(quiz, answers);

  await addDoc(collection(db, 'quizAttempts'), {
    uid,
    quizId: quiz.id,
    milestoneId,
    careerPathId,
    score,
    passed,
    answers,
    attemptedAt: new Date().toISOString(),
  });

  return { score, passed };
}

export async function getQuizAttempts(uid: string, quizId: string): Promise<QuizAttempt[]> {
  const q = query(
    collection(db, 'quizAttempts'),
    where('uid', '==', uid),
    where('quizId', '==', quizId),
    orderBy('attemptedAt', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizAttempt);
}

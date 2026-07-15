import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { QuizAttempt } from '../types';

/**
 * Recent quiz attempts across all milestones in a career path, for the
 * dashboard's "recent activity" widget. Distinct from getQuizAttempts in
 * quizzes.ts, which scopes to a single quiz for the milestone detail page.
 */
export async function getRecentQuizAttempts(
  uid: string,
  careerPathId: string,
  count = 5
): Promise<QuizAttempt[]> {
  const q = query(
    collection(db, 'quizAttempts'),
    where('uid', '==', uid),
    where('careerPathId', '==', careerPathId),
    orderBy('attemptedAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as QuizAttempt);
}

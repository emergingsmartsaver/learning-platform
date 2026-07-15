import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from './firebase';
import type { Progress } from '../types';

function progressDocId(uid: string, careerPathId: string) {
  return `${uid}_${careerPathId}`;
}

export async function getProgress(uid: string, careerPathId: string): Promise<Progress | null> {
  const snap = await getDoc(doc(db, 'progress', progressDocId(uid, careerPathId)));
  return snap.exists() ? (snap.data() as Progress) : null;
}

/**
 * Ensures a progress doc exists for this user + career path, defaulting
 * to zero completion. Called when the roadmap first loads for a user.
 */
export async function ensureProgressDoc(
  uid: string,
  careerPathId: string,
  firstStageId: string,
  firstMilestoneId: string
): Promise<Progress> {
  const ref = doc(db, 'progress', progressDocId(uid, careerPathId));
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as Progress;
  }

  const initial: Progress = {
    uid,
    careerPathId,
    completedMilestoneIds: [],
    completedSkillIds: [],
    currentStageId: firstStageId,
    currentMilestoneId: firstMilestoneId,
    percentComplete: 0,
  };
  await setDoc(ref, initial);
  return initial;
}

/**
 * Marks a milestone complete (or incomplete) and recomputes percentComplete
 * against the total milestone count for the career path.
 */
export async function setMilestoneComplete(
  uid: string,
  careerPathId: string,
  milestoneId: string,
  skillIds: string[],
  totalMilestoneCount: number,
  complete: boolean
): Promise<void> {
  const ref = doc(db, 'progress', progressDocId(uid, careerPathId));

  await setDoc(
    ref,
    {
      uid,
      careerPathId,
      completedMilestoneIds: complete ? arrayUnion(milestoneId) : arrayRemove(milestoneId),
      completedSkillIds: complete ? arrayUnion(...skillIds) : arrayRemove(...skillIds),
    },
    { merge: true }
  );

  // Recompute percentComplete from the freshly written doc, since arrayUnion
  // dedupes server-side and we don't have the resulting array client-side yet.
  const snap = await getDoc(ref);
  const data = snap.data() as Progress;
  const percentComplete = totalMilestoneCount > 0
    ? Math.round((data.completedMilestoneIds.length / totalMilestoneCount) * 100)
    : 0;

  await setDoc(ref, { percentComplete }, { merge: true });
}

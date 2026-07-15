import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { ProjectProgress, ProjectStatus } from '../types';

function projectProgressDocId(uid: string, projectId: string) {
  return `${uid}_${projectId}`;
}

export async function getProjectProgress(uid: string, projectId: string): Promise<ProjectProgress | null> {
  const snap = await getDoc(doc(db, 'projectProgress', projectProgressDocId(uid, projectId)));
  return snap.exists() ? (snap.data() as ProjectProgress) : null;
}

export async function upsertProjectProgress(
  uid: string,
  projectId: string,
  careerPathId: string,
  updates: Partial<Pick<ProjectProgress, 'status' | 'githubLink' | 'notes' | 'verification'>>
): Promise<void> {
  const ref = doc(db, 'projectProgress', projectProgressDocId(uid, projectId));
  const existing = await getDoc(ref);

  const base: ProjectProgress = existing.exists()
    ? (existing.data() as ProjectProgress)
    : { uid, projectId, careerPathId, status: 'not_started', githubLink: null, notes: '', verification: null };

  await setDoc(ref, { ...base, ...updates }, { merge: true });
}

export function nextStatus(current: ProjectStatus): ProjectStatus {
  const order: ProjectStatus[] = ['not_started', 'in_progress', 'submitted', 'completed'];
  const idx = order.indexOf(current);
  return order[Math.min(idx + 1, order.length - 1)];
}

/**
 * All project progress docs for a user within a career path — used by the
 * dashboard's project status summary. Equality-only filters, so no
 * composite index is required.
 */
export async function getAllProjectProgress(uid: string, careerPathId: string): Promise<ProjectProgress[]> {
  const q = query(
    collection(db, 'projectProgress'),
    where('uid', '==', uid),
    where('careerPathId', '==', careerPathId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ProjectProgress);
}

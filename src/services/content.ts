import { collection, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { CareerPath, Milestone, Stage, Skill, Quiz, ProjectDef } from '../types';

export async function getStage(stageId: string): Promise<Stage | null> {
  const snap = await getDoc(doc(db, 'stages', stageId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Stage) : null;
}

export async function getMilestoneCountForCareerPath(careerPathId: string): Promise<number> {
  // Equality-only filter — no composite index needed.
  const q = query(collection(db, 'milestones'), where('careerPathId', '==', careerPathId));
  const snap = await getDocs(q);
  return snap.size;
}

export async function getPublishedCareerPaths(): Promise<CareerPath[]> {
  const q = query(collection(db, 'careerPaths'), where('isPublished', '==', true), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CareerPath);
}

export async function getStagesForCareerPath(careerPathId: string): Promise<Stage[]> {
  const q = query(
    collection(db, 'stages'),
    where('careerPathId', '==', careerPathId),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Stage);
}

export async function getMilestonesForStage(stageId: string): Promise<Milestone[]> {
  const q = query(
    collection(db, 'milestones'),
    where('stageId', '==', stageId),
    orderBy('order')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Milestone);
}

export async function getMilestone(milestoneId: string): Promise<Milestone | null> {
  const snap = await getDoc(doc(db, 'milestones', milestoneId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Milestone) : null;
}

export async function getSkillsByIds(skillIds: string[]): Promise<Skill[]> {
  if (skillIds.length === 0) return [];
  const results = await Promise.all(skillIds.map((id) => getDoc(doc(db, 'skills', id))));
  return results.filter((s) => s.exists()).map((s) => ({ id: s.id, ...s.data() }) as Skill);
}

export async function getQuiz(quizId: string): Promise<Quiz | null> {
  const snap = await getDoc(doc(db, 'quizzes', quizId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Quiz) : null;
}

export async function getProjectsByIds(projectIds: string[]): Promise<ProjectDef[]> {
  if (projectIds.length === 0) return [];
  const results = await Promise.all(projectIds.map((id) => getDoc(doc(db, 'projects', id))));
  return results.filter((p) => p.exists()).map((p) => ({ id: p.id, ...p.data() }) as ProjectDef);
}

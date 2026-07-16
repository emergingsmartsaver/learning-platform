/**
 * Seeds Firestore content collections (careerPaths, stages, milestones,
 * skills, quizzes, projects) from ./content/*.json using the Firebase
 * Admin SDK. Safe to re-run — uses deterministic doc IDs derived from
 * slugs/keys, so re-seeding overwrites rather than duplicates.
 *
 * Usage:
 *   1. Firebase console > Project Settings > Service Accounts >
 *      "Generate new private key". Save the JSON somewhere OUTSIDE
 *      the repo (or gitignored) — never commit it.
 *   2. export SERVICE_ACCOUNT_PATH=/path/to/serviceAccountKey.json
 *   3. npx tsx scripts/seed/seed.ts scripts/seed/content/ai-infra-engineer.json
 */

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;
const contentPath = process.argv[2];

if (!serviceAccountPath) {
  throw new Error('Set SERVICE_ACCOUNT_PATH to your Firebase service account JSON file.');
}
if (!contentPath) {
  throw new Error('Usage: npx tsx scripts/seed/seed.ts <path-to-content.json>');
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount;
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

interface ContentQuizQuestion {
  type: 'single' | 'multi' | 'text';
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
}

interface ContentQuiz {
  title: string;
  passingScorePct: number;
  questions: ContentQuizQuestion[];
}

interface ContentProject {
  title: string;
  description: string;
  requirements: string[];
  rubric: string[];
  requiresGithubLink: boolean;
}

interface ContentResource {
  title: string;
  url: string;
}

interface ContentSkill {
  title: string;
  description: string;
  resources?: ContentResource[];
}

interface ContentMilestone {
  key: string;
  title: string;
  order: number;
  description: string;
  skills: ContentSkill[];
  quiz?: ContentQuiz;
  projects: ContentProject[];
}

interface ContentStage {
  key: string;
  title: string;
  order: number;
  description: string;
  milestones: ContentMilestone[];
}

interface ContentFile {
  careerPath: {
    slug: string;
    title: string;
    description: string;
    icon: string;
    order: number;
    isPublished: boolean;
  };
  stages: ContentStage[];
}

function slugId(...parts: string[]) {
  return parts.join('__').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

async function seed() {
  const content = JSON.parse(readFileSync(contentPath, 'utf-8')) as ContentFile;
  const careerPathId = content.careerPath.slug;
  const batch = db.batch();

  batch.set(db.collection('careerPaths').doc(careerPathId), content.careerPath);

  let stageCount = 0;
  let milestoneCount = 0;
  let skillCount = 0;
  let quizCount = 0;
  let projectCount = 0;

  for (const stage of content.stages) {
    const stageId = slugId(careerPathId, stage.key);
    stageCount++;
    batch.set(db.collection('stages').doc(stageId), {
      careerPathId,
      title: stage.title,
      order: stage.order,
      description: stage.description,
    });

    for (const milestone of stage.milestones) {
      const milestoneId = slugId(careerPathId, milestone.key);
      milestoneCount++;

      const skillIds: string[] = [];
      for (const skill of milestone.skills) {
        const skillId = slugId(careerPathId, milestone.key, skill.title);
        skillIds.push(skillId);
        skillCount++;
        batch.set(db.collection('skills').doc(skillId), {
          title: skill.title,
          description: skill.description,
          careerPathId,
          resources: skill.resources ?? [],
        });
      }

      let quizId: string | null = null;
      if (milestone.quiz) {
        quizId = slugId(careerPathId, milestone.key, 'quiz');
        quizCount++;
        batch.set(db.collection('quizzes').doc(quizId), {
          milestoneId,
          careerPathId,
          title: milestone.quiz.title,
          passingScorePct: milestone.quiz.passingScorePct,
          questions: milestone.quiz.questions.map((q, i) => ({ id: `q${i + 1}`, ...q })),
        });
      }

      const projectIds: string[] = [];
      for (const [i, project] of milestone.projects.entries()) {
        const projectId = slugId(careerPathId, milestone.key, `project-${i + 1}`);
        projectIds.push(projectId);
        projectCount++;
        batch.set(db.collection('projects').doc(projectId), {
          milestoneId,
          careerPathId,
          ...project,
        });
      }

      batch.set(db.collection('milestones').doc(milestoneId), {
        stageId,
        careerPathId,
        title: milestone.title,
        order: milestone.order,
        description: milestone.description,
        skillIds,
        quizId,
        projectIds,
      });
    }
  }

  await batch.commit();
  console.log(
    `Seeded "${content.careerPath.title}": ${stageCount} stages, ${milestoneCount} milestones, ` +
      `${skillCount} skills, ${quizCount} quizzes, ${projectCount} projects.`
  );
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

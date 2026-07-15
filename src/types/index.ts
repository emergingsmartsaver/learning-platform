// Types mirror the Firestore schema defined in
// Learning_Platform_Implementation_Plan_v2.md, section 2.

export interface CareerPath {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon: string;
  order: number;
  isPublished: boolean;
}

export interface Stage {
  id: string;
  careerPathId: string;
  title: string;
  order: number;
  description: string;
}

export interface Milestone {
  id: string;
  stageId: string;
  careerPathId: string;
  title: string;
  order: number;
  description: string;
  skillIds: string[];
  quizId: string | null;
  projectIds: string[];
}

export interface Skill {
  id: string;
  title: string;
  description: string;
  careerPathId: string;
}

export type QuestionType = 'single' | 'multi' | 'text';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options?: string[];
  correctAnswer: string | string[];
}

export interface Quiz {
  id: string;
  milestoneId: string;
  careerPathId: string;
  title: string;
  passingScorePct: number;
  questions: QuizQuestion[];
}

export interface ProjectDef {
  id: string;
  milestoneId: string;
  careerPathId: string;
  title: string;
  description: string;
  requirements: string[];
  rubric: string[];
  requiresGithubLink: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  activeCareerPathId: string | null;
}

export interface Progress {
  uid: string;
  careerPathId: string;
  completedMilestoneIds: string[];
  completedSkillIds: string[];
  currentStageId: string;
  currentMilestoneId: string;
  percentComplete: number;
}

export interface QuizAttempt {
  id: string;
  uid: string;
  quizId: string;
  milestoneId: string;
  careerPathId: string;
  score: number;
  passed: boolean;
  answers: Record<string, string | string[]>;
  attemptedAt: string;
}

export type ProjectStatus = 'not_started' | 'in_progress' | 'submitted' | 'completed';

export interface ProjectVerificationCheck {
  label: string;
  passed: boolean;
}

export interface ProjectVerification {
  checkedAt: string;
  checks: ProjectVerificationCheck[];
  allPassed: boolean;
}

export interface ProjectProgress {
  uid: string;
  projectId: string;
  careerPathId: string;
  status: ProjectStatus;
  githubLink: string | null;
  notes: string;
  verification?: ProjectVerification | null;
}

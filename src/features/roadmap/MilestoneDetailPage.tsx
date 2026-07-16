import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getMilestone,
  getSkillsByIds,
  getProjectsByIds,
  getQuiz,
  getMilestoneCountForCareerPath,
  getStagesForCareerPath,
  getMilestonesForStage,
} from '../../services/content';
import { getProgress, setMilestoneComplete } from '../../services/progress';
import { useAuth } from '../auth/AuthContext';
import { QuizPlayer } from '../quizzes/QuizPlayer';
import { QuizHistory } from '../quizzes/QuizHistory';
import { ProjectCard } from '../projects/ProjectCard';
import { celebrateMilestoneComplete } from '../../lib/confetti';
import { Badge } from '../../components/Badge';
import type { Milestone, Skill, ProjectDef, Quiz } from '../../types';

export function MilestoneDetailPage() {
  const { milestoneId } = useParams<{ milestoneId: string }>();
  const { user } = useAuth();

  const [milestone, setMilestone] = useState<Milestone | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<ProjectDef[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [alreadyPassed, setAlreadyPassed] = useState(false);
  const [totalMilestoneCount, setTotalMilestoneCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (!milestoneId || !user) return;
    let cancelled = false;
    setQuizStarted(false);

    async function load() {
      const m = await getMilestone(milestoneId!);
      if (!m) {
        if (!cancelled) setLoading(false);
        return;
      }

      const [s, p, q, progress, total] = await Promise.all([
        getSkillsByIds(m.skillIds),
        getProjectsByIds(m.projectIds),
        m.quizId ? getQuiz(m.quizId) : Promise.resolve(null),
        getProgress(user!.uid, m.careerPathId),
        getMilestoneCountForCareerPath(m.careerPathId),
      ]);

      // Find the next milestone to tackle after this one, in roadmap order —
      // treating this milestone as done for the purposes of this lookup so
      // it's useful both before and after the quiz is actually passed.
      const completedPlusThis = new Set([...(progress?.completedMilestoneIds ?? []), m.id]);
      const rawStages = await getStagesForCareerPath(m.careerPathId);
      let next: Milestone | null = null;
      outer: for (const stage of rawStages) {
        const stageMilestones = await getMilestonesForStage(stage.id);
        for (const candidate of stageMilestones) {
          if (!completedPlusThis.has(candidate.id)) {
            next = candidate;
            break outer;
          }
        }
      }

      if (!cancelled) {
        setMilestone(m);
        setSkills(s);
        setProjects(p);
        setQuiz(q);
        setAlreadyPassed(progress?.completedMilestoneIds.includes(m.id) ?? false);
        setTotalMilestoneCount(total);
        setNextMilestone(next);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [milestoneId, user]);

  async function handleQuizPassed() {
    if (!milestone || !user) return;
    await setMilestoneComplete(
      user.uid,
      milestone.careerPathId,
      milestone.id,
      milestone.skillIds,
      totalMilestoneCount,
      true
    );
    setAlreadyPassed(true);
    celebrateMilestoneComplete();
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!milestone) return <p className="text-red-600">Milestone not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/roadmap" className="text-sm text-slate-500 hover:underline">
        ← Back to roadmap
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{milestone.title}</h2>
          <p className="mt-1 text-slate-600">{milestone.description}</p>
        </div>
        {alreadyPassed && <Badge title="Milestone complete" size="lg" />}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Skills</h3>
        <ul className="mt-2 space-y-2">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded-md border border-slate-200 bg-white px-4 py-3">
              <p className="font-medium text-slate-900">{skill.title}</p>
              {skill.description && (
                <p className="mt-0.5 text-sm text-slate-600">{skill.description}</p>
              )}
              {skill.resources && skill.resources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {skill.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      📖 {r.title} ↗
                    </a>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {quiz && user && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Quiz — pass to complete this milestone
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · Passing score: {quiz.passingScorePct}%
          </p>

          {alreadyPassed ? (
            <div className="mt-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              ✓ You've already passed this quiz. Milestone is complete.
            </div>
          ) : !quizStarted ? (
            <div className="mt-3 rounded-md border border-slate-200 bg-white px-4 py-4">
              <p className="text-sm text-slate-600">
                Review the skills above before starting — questions won't be shown until you're ready.
              </p>
              <button
                onClick={() => setQuizStarted(true)}
                className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Start Quiz
              </button>
            </div>
          ) : (
            <div className="mt-3">
              <QuizPlayer
                quiz={quiz}
                uid={user.uid}
                milestoneId={milestone.id}
                careerPathId={milestone.careerPathId}
                alreadyPassed={alreadyPassed}
                onPassed={handleQuizPassed}
                onSubmitted={() => setHistoryRefreshKey((k) => k + 1)}
              />
              <QuizHistory uid={user.uid} quizId={quiz.id} refreshKey={historyRefreshKey} />
            </div>
          )}
        </section>
      )}

      {projects.length > 0 && user && (
        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Projects</h3>
          <ul className="mt-2 space-y-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} uid={user.uid} />
            ))}
          </ul>
        </section>
      )}

      {alreadyPassed && (
        <section className="mt-6 rounded-md border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">🎉 Milestone complete — where next?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {nextMilestone ? (
              <Link
                to={`/roadmap/milestones/${nextMilestone.id}`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Next: {nextMilestone.title} →
              </Link>
            ) : (
              <span className="rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-800">
                🏁 All milestones complete!
              </span>
            )}
            <Link
              to="/dashboard"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              View Dashboard
            </Link>
            <Link
              to="/roadmap"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Back to Roadmap
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

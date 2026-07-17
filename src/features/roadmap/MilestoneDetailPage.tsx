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

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!milestone) return <p className="text-red-400">Milestone not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/roadmap" className="rounded text-sm text-slate-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
        ← Back to roadmap
      </Link>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{milestone.title}</h2>
          <p className="mt-1 text-slate-400">{milestone.description}</p>
        </div>
        {alreadyPassed && <Badge title="Milestone complete" size="lg" />}
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Skills</h3>
        <ul className="mt-2 space-y-2">
          {skills.map((skill) => (
            <li key={skill.id} className="rounded-md border border-slate-800 bg-slate-900 px-4 py-3">
              <p className="font-medium text-slate-100">{skill.title}</p>
              {skill.description && (
                <p className="mt-0.5 text-sm text-slate-400">{skill.description}</p>
              )}
              {skill.resources && skill.resources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {skill.resources.map((r) => (
                    <a
                      key={r.url}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Quiz — pass to complete this milestone
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · Passing score: {quiz.passingScorePct}%
          </p>

          {alreadyPassed ? (
            <div className="mt-3 rounded-md border border-emerald-800 bg-emerald-950/50 px-4 py-3 text-sm text-emerald-300">
              ✓ You've already passed this quiz. Milestone is complete.
            </div>
          ) : !quizStarted ? (
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-900 px-4 py-4">
              <p className="text-sm text-slate-400">
                Review the skills above before starting — questions won't be shown until you're ready.
              </p>
              <button
                onClick={() => setQuizStarted(true)}
                className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Projects</h3>
          <ul className="mt-2 space-y-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} uid={user.uid} />
            ))}
          </ul>
        </section>
      )}

      {alreadyPassed && (
        <section className="mt-6 rounded-md border border-slate-800 bg-slate-900 p-4">
          <p className="text-sm font-medium text-slate-100">🎉 Milestone complete — where next?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {nextMilestone ? (
              <Link
                to={`/roadmap/milestones/${nextMilestone.id}`}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Next: {nextMilestone.title} →
              </Link>
            ) : (
              <span className="rounded-md bg-emerald-900/50 px-4 py-2 text-sm font-medium text-emerald-300">
                🏁 All milestones complete!
              </span>
            )}
            <Link
              to="/dashboard"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              View Dashboard
            </Link>
            <Link
              to="/roadmap"
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              Back to Roadmap
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

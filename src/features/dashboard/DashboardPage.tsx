import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getPublishedCareerPaths, getStagesForCareerPath, getMilestonesForStage, getMilestone } from '../../services/content';
import { getProgress } from '../../services/progress';
import { getRecentQuizAttempts } from '../../services/dashboard';
import { getAllProjectProgress } from '../../services/projects';
import { Badge } from '../../components/Badge';
import type { CareerPath, Progress, QuizAttempt, Stage, Milestone, ProjectProgress } from '../../types';

interface StageWithMilestones extends Stage {
  milestones: Milestone[];
}

export function DashboardPage() {
  const { user } = useAuth();
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [currentStage, setCurrentStage] = useState<Stage | null>(null);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [allStages, setAllStages] = useState<StageWithMilestones[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<QuizAttempt[]>([]);
  const [projectProgress, setProjectProgress] = useState<ProjectProgress[]>([]);
  const [attemptMilestoneTitles, setAttemptMilestoneTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      try {
        const paths = await getPublishedCareerPaths();
        const active = paths[0] ?? null;
        if (!active) {
          if (!cancelled) {
            setError('No published career path found yet.');
            setLoading(false);
          }
          return;
        }

        const [p, rawStages, attempts, allProjectProgress] = await Promise.all([
          getProgress(user!.uid, active.id),
          getStagesForCareerPath(active.id),
          getRecentQuizAttempts(user!.uid, active.id, 5),
          getAllProjectProgress(user!.uid, active.id),
        ]);

        const stagesWithMilestones: StageWithMilestones[] = await Promise.all(
          rawStages.map(async (stage) => ({ ...stage, milestones: await getMilestonesForStage(stage.id) }))
        );

        const completed = new Set(p?.completedMilestoneIds ?? []);

        // "Current focus" = first milestone, in roadmap order, not yet
        // completed — computed fresh each load rather than trusted from a
        // stored field, since progress.currentMilestoneId is only set once
        // at doc-creation time and never advances.
        let nextStage: Stage | null = null;
        let nextMilestone: Milestone | null = null;
        outer: for (const stage of stagesWithMilestones) {
          for (const milestone of stage.milestones) {
            if (!completed.has(milestone.id)) {
              nextStage = stage;
              nextMilestone = milestone;
              break outer;
            }
          }
        }

        const uniqueMilestoneIds = Array.from(new Set(attempts.map((a) => a.milestoneId)));
        const titles: Record<string, string> = {};
        await Promise.all(
          uniqueMilestoneIds.map(async (id) => {
            const m = await getMilestone(id);
            if (m) titles[id] = m.title;
          })
        );

        if (!cancelled) {
          setCareerPath(active);
          setProgress(p);
          setCurrentStage(nextStage);
          setCurrentMilestone(nextMilestone);
          setAllStages(stagesWithMilestones);
          setRecentAttempts(attempts);
          setProjectProgress(allProjectProgress);
          setAttemptMilestoneTitles(titles);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) return <p className="text-slate-400">Loading dashboard…</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  const totalMilestoneCount = allStages.reduce((sum, s) => sum + s.milestones.length, 0);
  const completedCount = progress?.completedMilestoneIds.length ?? 0;
  const completedIdsSet = new Set(progress?.completedMilestoneIds ?? []);
  const earnedBadges = allStages
    .flatMap((s) => s.milestones)
    .filter((m) => completedIdsSet.has(m.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Your Dashboard</h2>
        <p className="mt-1 text-slate-400">{careerPath?.title}</p>
      </div>

      {/* Hero: progress + current focus merged into one clear "what's next" moment */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="p-5">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Overall progress</span>
            <span>{progress?.percentComplete ?? 0}%</span>
          </div>

          <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
              style={{ width: `${progress?.percentComplete ?? 0}%` }}
            />
            {totalMilestoneCount > 1 &&
              Array.from({ length: totalMilestoneCount - 1 }, (_, i) => i + 1).map((i) => (
                <div
                  key={i}
                  className="absolute top-0 h-full w-px bg-slate-900/70"
                  style={{ left: `${(i / totalMilestoneCount) * 100}%` }}
                />
              ))}
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {completedCount} of {totalMilestoneCount} milestone{totalMilestoneCount === 1 ? '' : 's'} completed
          </p>
        </div>

        {currentStage && currentMilestone ? (
          <Link
            to={`/roadmap/milestones/${currentMilestone.id}`}
            className="flex flex-col gap-3 border-t border-indigo-900/50 bg-gradient-to-r from-indigo-950 to-cyan-950 p-5 hover:from-indigo-900 hover:to-cyan-900 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                {currentStage.title} · Continue where you left off
              </p>
              <p className="mt-0.5 text-lg font-bold text-slate-100">{currentMilestone.title}</p>
            </div>
            <span className="shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white">
              Continue →
            </span>
          </Link>
        ) : (
          <div className="border-t border-emerald-900/50 bg-emerald-950/50 p-5 text-center">
            <p className="font-medium text-emerald-300">
              {progress && progress.percentComplete === 100
                ? '🎉 All milestones complete!'
                : 'No active milestone yet.'}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-900/60 text-sm">🏆</span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Badges {earnedBadges.length > 0 && `(${earnedBadges.length})`}
            </h3>
          </div>
          {earnedBadges.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Pass your first quiz to earn a badge.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {earnedBadges.map((m) => (
                <Link key={m.id} to={`/roadmap/milestones/${m.id}`}>
                  <Badge title={m.title} />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-900/60 text-sm">📝</span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Quizzes</h3>
          </div>
          {recentAttempts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No quiz attempts yet — take a quiz from the roadmap.</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-800">
              {recentAttempts.map((attempt) => (
                <li key={attempt.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-300">
                    {attemptMilestoneTitles[attempt.milestoneId] ?? attempt.milestoneId}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      attempt.passed ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                    }`}
                  >
                    {attempt.score}% {attempt.passed ? '· Passed' : '· Failed'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-900/60 text-sm">🚀</span>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Projects</h3>
          </div>
          {projectProgress.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">No projects started yet — find one on the roadmap.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {(['not_started', 'in_progress', 'submitted', 'completed'] as const).map((status) => {
                const count = projectProgress.filter((p) => p.status === status).length;
                if (count === 0) return null;
                return (
                  <span key={status} className="text-slate-400">
                    <span className="font-semibold text-slate-100">{count}</span> {status.replace('_', ' ')}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Link to="/roadmap" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
        View full roadmap →
      </Link>
    </div>
  );
}

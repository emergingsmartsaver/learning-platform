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

  if (loading) return <p className="text-slate-500">Loading dashboard…</p>;
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
        <h2 className="text-2xl font-bold text-slate-900">Your Dashboard</h2>
        <p className="mt-1 text-slate-600">{careerPath?.title}</p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Overall progress</span>
          <span>{progress?.percentComplete ?? 0}%</span>
        </div>

        <div className="relative mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
            style={{ width: `${progress?.percentComplete ?? 0}%` }}
          />
          {/* Tick marks dividing the bar into one segment per milestone */}
          {totalMilestoneCount > 1 &&
            Array.from({ length: totalMilestoneCount - 1 }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className="absolute top-0 h-full w-px bg-white/70"
                style={{ left: `${(i / totalMilestoneCount) * 100}%` }}
              />
            ))}
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {completedCount} of {totalMilestoneCount} milestone{totalMilestoneCount === 1 ? '' : 's'} completed
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Current Focus</h3>
            {currentStage && currentMilestone ? (
              <Link
                to={`/roadmap/milestones/${currentMilestone.id}`}
                className="mt-2 block rounded-md border border-slate-200 px-4 py-3 hover:border-indigo-300"
              >
                <p className="text-xs text-slate-500">{currentStage.title}</p>
                <p className="font-medium text-slate-900">{currentMilestone.title}</p>
              </Link>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {progress && progress.percentComplete === 100
                  ? '🎉 All milestones complete!'
                  : 'No active milestone yet.'}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Badges Earned {earnedBadges.length > 0 && `(${earnedBadges.length})`}
            </h3>
            {earnedBadges.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Pass your first quiz to earn a badge.</p>
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
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Quiz Activity</h3>
            {recentAttempts.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No quiz attempts yet — take a quiz from the roadmap.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {recentAttempts.map((attempt) => (
                  <li key={attempt.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-700">
                      {attemptMilestoneTitles[attempt.milestoneId] ?? attempt.milestoneId}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        attempt.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {attempt.score}% {attempt.passed ? '· Passed' : '· Failed'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Project Status</h3>
            {projectProgress.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No projects started yet — find one on the roadmap.</p>
            ) : (
              <div className="mt-2 flex gap-4 text-sm">
                {(['not_started', 'in_progress', 'submitted', 'completed'] as const).map((status) => {
                  const count = projectProgress.filter((p) => p.status === status).length;
                  if (count === 0) return null;
                  return (
                    <span key={status} className="text-slate-600">
                      <span className="font-semibold text-slate-900">{count}</span>{' '}
                      {status.replace('_', ' ')}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Link to="/roadmap" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
        View full roadmap →
      </Link>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublishedCareerPaths, getStagesForCareerPath, getMilestonesForStage } from '../../services/content';
import { useProgress } from '../../hooks/useProgress';
import type { CareerPath, Stage, Milestone } from '../../types';

interface StageWithMilestones extends Stage {
  milestones: Milestone[];
}

export function RoadmapPage() {
  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [stages, setStages] = useState<StageWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // v1: single published career path (AI Infra Engineer). Once more
        // paths exist, this becomes a selector driven by users.activeCareerPathId.
        const paths = await getPublishedCareerPaths();
        const active = paths[0] ?? null;
        if (!active) {
          if (!cancelled) {
            setError('No published career path found. Have you run the seed script?');
            setLoading(false);
          }
          return;
        }

        const rawStages = await getStagesForCareerPath(active.id);
        const stagesWithMilestones = await Promise.all(
          rawStages.map(async (stage) => ({
            ...stage,
            milestones: await getMilestonesForStage(stage.id),
          }))
        );

        if (!cancelled) {
          setCareerPath(active);
          setStages(stagesWithMilestones);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load roadmap.');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalMilestoneCount = useMemo(
    () => stages.reduce((sum, s) => sum + s.milestones.length, 0),
    [stages]
  );
  const firstStageId = stages[0]?.id ?? null;
  const firstMilestoneId = stages[0]?.milestones[0]?.id ?? null;

  const { progress } = useProgress(
    careerPath?.id ?? null,
    firstStageId,
    firstMilestoneId,
    totalMilestoneCount
  );

  if (loading) {
    return <p className="text-slate-400">Loading roadmap…</p>;
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  const completedIds = new Set(progress?.completedMilestoneIds ?? []);

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-2xl font-bold text-slate-100">{careerPath?.title}</h2>
      <p className="mt-1 text-slate-400">{careerPath?.description}</p>

      {progress && (
        <div className="mt-4 max-w-2xl">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>Progress</span>
            <span>{progress.percentComplete}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progress.percentComplete}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall course progress"
            className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {stages.map((stage, stageIndex) => (
          <section key={stage.id}>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-900/60 text-xs font-semibold text-indigo-300">
                {stageIndex + 1}
              </span>
              <h3 className="text-lg font-semibold text-slate-100">{stage.title}</h3>
            </div>
            <p className="ml-8 text-sm text-slate-400">{stage.description}</p>

            <ol className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {stage.milestones.map((milestone) => {
                const isComplete = completedIds.has(milestone.id);
                return (
                  <li key={milestone.id}>
                    <Link
                      to={`/roadmap/milestones/${milestone.id}`}
                      className={`flex h-full items-start gap-3 rounded-md border-l-4 border-y border-r border-slate-800 bg-slate-900 px-4 py-3 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        isComplete ? 'border-l-green-500' : 'border-l-indigo-400 hover:border-l-indigo-600'
                      }`}
                    >
                      <span
                        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                          isComplete ? 'bg-green-500 text-white' : 'border border-slate-700'
                        }`}
                        aria-label={isComplete ? 'Completed' : 'Not completed'}
                      >
                        {isComplete ? '✓' : ''}
                      </span>
                      <span className="flex-1">
                        <span className={`font-medium ${isComplete ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                          {milestone.title}
                        </span>
                        <span className="block text-sm text-slate-400">{milestone.description}</span>
                        {!isComplete && (
                          <span className="mt-1 inline-block text-xs font-medium text-indigo-400">
                            Pass the quiz to complete →
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

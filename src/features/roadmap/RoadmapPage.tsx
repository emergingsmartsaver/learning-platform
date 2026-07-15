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
    return <p className="text-slate-500">Loading roadmap…</p>;
  }

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }

  const completedIds = new Set(progress?.completedMilestoneIds ?? []);

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900">{careerPath?.title}</h2>
      <p className="mt-1 text-slate-600">{careerPath?.description}</p>

      {progress && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Progress</span>
            <span>{progress.percentComplete}%</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-slate-900 transition-all"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {stages.map((stage) => (
          <section key={stage.id}>
            <h3 className="text-lg font-semibold text-slate-900">{stage.title}</h3>
            <p className="text-sm text-slate-500">{stage.description}</p>

            <ol className="mt-3 space-y-2">
              {stage.milestones.map((milestone) => {
                const isComplete = completedIds.has(milestone.id);
                return (
                  <li key={milestone.id}>
                    <Link
                      to={`/roadmap/milestones/${milestone.id}`}
                      className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 hover:border-slate-300 hover:shadow-sm"
                    >
                      <span
                        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                          isComplete ? 'bg-green-500 text-white' : 'border border-slate-300'
                        }`}
                        aria-label={isComplete ? 'Completed' : 'Not completed'}
                      >
                        {isComplete ? '✓' : ''}
                      </span>
                      <span className="flex-1">
                        <span className={`font-medium ${isComplete ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {milestone.title}
                        </span>
                        <span className="block text-sm text-slate-500">{milestone.description}</span>
                        {!isComplete && (
                          <span className="mt-1 inline-block text-xs font-medium text-slate-500">
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

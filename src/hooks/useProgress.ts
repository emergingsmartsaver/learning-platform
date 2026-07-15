import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { ensureProgressDoc, setMilestoneComplete } from '../services/progress';
import type { Progress } from '../types';

/**
 * Loads (and lazily creates) the progress doc for the signed-in user and a
 * given career path, and exposes a toggle to mark milestones complete.
 *
 * `totalMilestoneCount` is needed to compute percentComplete — pass the
 * total number of milestones in the career path (from the roadmap load).
 */
export function useProgress(
  careerPathId: string | null,
  firstStageId: string | null,
  firstMilestoneId: string | null,
  totalMilestoneCount: number
) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !careerPathId || !firstStageId || !firstMilestoneId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function load() {
      const p = await ensureProgressDoc(user!.uid, careerPathId!, firstStageId!, firstMilestoneId!);
      if (!cancelled) {
        setProgress(p);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user, careerPathId, firstStageId, firstMilestoneId]);

  const toggleMilestone = useCallback(
    async (milestoneId: string, skillIds: string[], complete: boolean) => {
      if (!user || !careerPathId) return;

      // Optimistic local update so the UI feels instant.
      setProgress((prev) => {
        if (!prev) return prev;
        const completedMilestoneIds = complete
          ? Array.from(new Set([...prev.completedMilestoneIds, milestoneId]))
          : prev.completedMilestoneIds.filter((id) => id !== milestoneId);
        const percentComplete = totalMilestoneCount > 0
          ? Math.round((completedMilestoneIds.length / totalMilestoneCount) * 100)
          : 0;
        return { ...prev, completedMilestoneIds, percentComplete };
      });

      await setMilestoneComplete(user.uid, careerPathId, milestoneId, skillIds, totalMilestoneCount, complete);
    },
    [user, careerPathId, totalMilestoneCount]
  );

  return { progress, loading, toggleMilestone };
}

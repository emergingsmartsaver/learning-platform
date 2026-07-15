import confetti from 'canvas-confetti';

/**
 * Fires a short celebratory confetti burst. Called once, right when a quiz
 * is newly passed — not on subsequent page loads of an already-complete
 * milestone (see MilestoneDetailPage: only triggered from QuizPlayer's
 * onPassed callback, which only fires on an actual submit).
 */
export function celebrateMilestoneComplete() {
  const duration = 1200;
  const end = Date.now() + duration;

  const colors = ['#0f172a', '#22c55e', '#f59e0b', '#3b82f6'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

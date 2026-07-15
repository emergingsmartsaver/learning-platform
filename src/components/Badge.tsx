interface BadgeProps {
  title?: string;
  size?: 'sm' | 'lg';
}

/**
 * A simple trophy badge, used both as a per-milestone "you earned this"
 * marker and as a repeated element in the Dashboard's badge collection.
 * Emoji-based rather than an icon library, to keep the bundle light and
 * match the existing emoji usage elsewhere in the UI (🎉, 🏁).
 */
export function Badge({ title, size = 'sm' }: BadgeProps) {
  const dimensions = size === 'lg' ? 'h-10 w-10 text-xl' : 'h-7 w-7 text-sm';

  return (
    <span
      title={title}
      className={`flex ${dimensions} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-sm`}
    >
      🏆
    </span>
  );
}

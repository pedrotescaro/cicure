export const brandTimeline = { duration: 2200, exit: 240, letters: ['i', 'c', 'u', 'r', 'e'] } as const;

/** Pure, bounded frames also make Reduce Motion and interrupted starts deterministic. */
export function brandFrame(time: number, letterIndex = 0) {
  'worklet';
  const phase = (start: number, duration: number) => Math.max(0, Math.min(1, (time - start) / duration));
  const ease = (value: number) => 1 - Math.pow(1 - value, 3);
  const draw = ease(phase(50, 900));
  const dot = phase(900, 260);
  return {
    draw,
    fill: phase(820, 180),
    rotation: 360 * (ease(phase(0, 1000)) - 1),
    dot,
    dotScale: dot === 0 ? 0 : 1 - Math.pow(1 - dot, 3) + Math.sin(dot * Math.PI) * 0.13,
    expand: ease(phase(1030, 530)),
    letter: ease(phase(1160 + letterIndex * 105, 360)),
  };
}

export function canDismissBrand(ready: boolean, revealed: boolean) { return ready && revealed; }

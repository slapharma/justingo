import { ArrowUp, ArrowUpLeft, ArrowUpRight, CornerUpLeft, CornerUpRight, Flag, Undo2, type LucideIcon } from '../icons';
import type { TurnDirection } from '../core/types';

const ICONS: Record<TurnDirection, LucideIcon> = {
  left: CornerUpLeft,
  right: CornerUpRight,
  'slight left': ArrowUpLeft,
  'slight right': ArrowUpRight,
  'sharp left': CornerUpLeft,
  'sharp right': CornerUpRight,
  uturn: Undo2,
  straight: ArrowUp,
};

export default function TurnIcon({ direction, size, color }: { direction: TurnDirection | 'finish'; size: number; color: string }) {
  const Icon = direction === 'finish' ? Flag : ICONS[direction];
  return <Icon size={size} color={color} strokeWidth={2.75} />;
}

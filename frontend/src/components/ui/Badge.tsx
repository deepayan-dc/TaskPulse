
import { clsx } from 'clsx';
import { TaskStatus, TaskPriority } from '../../types/task';

interface BadgeProps {
  type: 'status' | 'priority';
  value: TaskStatus | TaskPriority;
  className?: string;
}

export const Badge = ({ type, value, className }: BadgeProps) => {
  const getStyles = () => {
    if (type === 'status') {
      switch (value as TaskStatus) {
        case 'Pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        case 'In Progress': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'Completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'Approved': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
        case 'Returned': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      }
    } else {
      switch (value as TaskPriority) {
        case 'Critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
        case 'High': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
        case 'Medium': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
        case 'Low': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      }
    }
  };

  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-medium border', getStyles(), className)}>
      {value}
    </span>
  );
};

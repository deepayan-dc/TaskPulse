import { Task, TaskStatus } from '../../types/task';
import { Badge } from '../ui/Badge';
import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
  tasks: Task[];
}

export const TaskKanban = ({ tasks }: Props) => {
  const navigate = useNavigate();
  const columns: { title: string; statuses: TaskStatus[] }[] = [
    { title: 'Pending', statuses: ['Pending'] },
    { title: 'In Progress', statuses: ['In Progress'] },
    { title: 'Completed', statuses: ['Completed'] },
    { title: 'Approved / Returned', statuses: ['Approved', 'Returned'] },
  ];

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 min-h-[600px] items-start">
      {columns.map(col => {
        const colTasks = tasks.filter(t => col.statuses.includes(t.status));
        
        return (
          <div key={col.title} className="w-80 flex-shrink-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200">{col.title}</h3>
              <span className="bg-white/10 text-xs py-0.5 px-2 rounded-full text-gray-400">{colTasks.length}</span>
            </div>
            
            <div className="flex flex-col gap-3 min-h-[100px] p-2 -mx-2 rounded-xl border border-transparent hover:border-white/5 transition-colors">
              {colTasks.map(task => {
                const isOverdue = new Date(task.dueDate) < new Date() && !['Completed', 'Approved'].includes(task.status);
                
                return (
                  <div 
                    key={task.id} 
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`glass-panel p-4 cursor-pointer hover:-translate-y-1 transition-all hover:shadow-neon group ${isOverdue ? 'border-red-500/30 shadow-[inset_0_0_15px_rgba(239,68,68,0.1)]' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <Badge type="priority" value={task.priority} />
                      {col.statuses.length > 1 && <Badge type="status" value={task.status} />}
                    </div>
                    
                    <h4 className="font-medium text-white mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors">{task.title}</h4>
                    
                    <div className="flex items-center justify-between mt-4">
                      <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <img 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.name}`} 
                          alt={task.assignee.name}
                          className="w-6 h-6 rounded-full bg-gray-800 border border-white/20"
                          title={task.assignee.name}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {colTasks.length === 0 && (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

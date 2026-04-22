import { useState } from 'react';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/ui/Badge';
import { TaskKanban } from '../components/tasks/TaskKanban';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import { Plus, LayoutGrid, List, Clock, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TaskStatus, TaskPriority } from '../types/task';

const TaskList = () => {
  const { tasks, isLoading } = useTasks();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'All'>('All');

  const filteredTasks = tasks.filter(task => {
    if (statusFilter !== 'All' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false;
    // If employee, maybe filter to their tasks? The prompt says "Sidebar includes: My Tasks". 
    // So if Employee, we might only show their tasks on the 'Tasks' page. Let's do that.
    if (user?.role === 'EMPLOYEE' && task.assignee.id !== user.id) return false;
    return true;
  });

  if (isLoading) return <div className="text-white p-8">Loading tasks...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {user?.role === 'MANAGER' ? 'All Tasks' : 'My Tasks'}
          </h1>
          <p className="text-sm text-gray-400">Manage and track project tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white/5 p-1 rounded-xl flex items-center border border-white/10">
            <button 
              onClick={() => setView('table')} 
              className={`p-1.5 rounded-lg transition-colors ${view === 'table' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setView('kanban')} 
              className={`p-1.5 rounded-lg transition-colors ${view === 'kanban' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          
          {user?.role === 'MANAGER' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/5">
        <Filter className="w-4 h-4 text-gray-400 ml-2" />
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="bg-transparent border-none text-sm text-gray-300 focus:ring-0 cursor-pointer"
        >
          <option value="All" className="bg-gray-900">All Statuses</option>
          <option value="Pending" className="bg-gray-900">Pending</option>
          <option value="In Progress" className="bg-gray-900">In Progress</option>
          <option value="Completed" className="bg-gray-900">Completed</option>
          <option value="Approved" className="bg-gray-900">Approved</option>
          <option value="Returned" className="bg-gray-900">Returned</option>
        </select>
        
        <div className="w-px h-4 bg-white/10"></div>
        
        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="bg-transparent border-none text-sm text-gray-300 focus:ring-0 cursor-pointer"
        >
          <option value="All" className="bg-gray-900">All Priorities</option>
          <option value="Critical" className="bg-gray-900">Critical</option>
          <option value="High" className="bg-gray-900">High</option>
          <option value="Medium" className="bg-gray-900">Medium</option>
          <option value="Low" className="bg-gray-900">Low</option>
        </select>
      </div>

      {view === 'kanban' ? (
        <TaskKanban tasks={filteredTasks} />
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 bg-white/5">
                  <th className="p-4 font-medium">Title</th>
                  <th className="p-4 font-medium">Assignee</th>
                  <th className="p-4 font-medium">Due Date</th>
                  <th className="p-4 font-medium">Priority</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No tasks found.</td>
                  </tr>
                ) : (
                  filteredTasks.map(task => {
                    const isOverdue = new Date(task.dueDate) < new Date() && !['Completed', 'Approved'].includes(task.status);
                    
                    return (
                      <tr 
                        key={task.id} 
                        onClick={() => navigate(`/tasks/${task.id}`)}
                        className={`hover:bg-white/5 transition-colors cursor-pointer group ${isOverdue ? 'bg-red-500/5' : ''}`}
                      >
                        <td className="p-4">
                          <div className={`font-medium group-hover:text-primary-400 transition-colors ${isOverdue ? 'text-red-200' : 'text-gray-200'}`}>
                            {task.title}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.name}`} className="w-6 h-6 rounded-full bg-gray-800" alt="" />
                            <span className="text-sm text-gray-300">{task.assignee.name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`flex items-center gap-1.5 text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                            <Clock className="w-4 h-4" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge type="priority" value={task.priority} />
                        </td>
                        <td className="p-4">
                          <Badge type="status" value={task.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default TaskList;

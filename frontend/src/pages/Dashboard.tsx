import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, Plus, Users, Pause, Calendar, ArrowRight, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../context/TaskContext';
import { useNotifications } from '../context/NotificationContext';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';

const Dashboard = () => {
  const { user } = useAuth();
  const { tasks, pauseTimer, isLoading: isTasksLoading } = useTasks();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter tasks based on role:
  // Employees only see tasks assigned to them. Managers see all tasks.
  const myTasks = tasks.filter(task => {
    if (user?.role === 'MEMBER') {
      return task.assignee.id === user.id;
    }
    return true;
  });

  // Find active task with running timer
  const activeTask = myTasks.find(t => t.timerData.isRunning);
  
  // Active timer ticking state
  const [activeSeconds, setActiveSeconds] = useState(0);

  useEffect(() => {
    if (!activeTask || !activeTask.timerData.isRunning || !activeTask.timerData.startTime) {
      setActiveSeconds(0);
      return;
    }

    const calculateTime = () => {
      const now = Date.now();
      const currentSessionSeconds = Math.floor((now - (activeTask.timerData.startTime ?? 0)) / 1000);
      return activeTask.timerData.elapsedTime + currentSessionSeconds;
    };

    setActiveSeconds(calculateTime());

    const interval = setInterval(() => {
      setActiveSeconds(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask?.id, activeTask?.timerData.isRunning, activeTask?.timerData.startTime, activeTask?.timerData.elapsedTime]);

  // Format total seconds into HH:MM:SS
  const formatStopwatch = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format logged hours sum
  const totalLoggedTime = myTasks.reduce((total, task) => {
    let taskTime = task.timerData.elapsedTime;
    if (task.timerData.isRunning && task.timerData.startTime) {
      const currentSessionSeconds = Math.floor((Date.now() - task.timerData.startTime) / 1000);
      taskTime += currentSessionSeconds;
    }
    return total + taskTime;
  }, 0);

  const formatHours = (totalSeconds: number) => {
    const h = (totalSeconds / 3600).toFixed(1);
    return `${h} hrs`;
  };

  // Statistics calculation
  const totalTasksCount = myTasks.length;
  const inProgressCount = myTasks.filter(t => t.status === 'In Progress').length;
  const completedCount = myTasks.filter(t => t.status === 'Completed' || t.status === 'Approved').length;
  
  const overdueCount = myTasks.filter(t => {
    const isOverdue = new Date(t.dueDate) < new Date() && !['Completed', 'Approved'].includes(t.status);
    return isOverdue;
  }).length;

  // Unique team members across the user's task ecosystem
  const uniqueMembers = new Set<string>();
  myTasks.forEach(t => {
    if (t.assignee.name) uniqueMembers.add(t.assignee.name);
    if (t.createdBy.name) uniqueMembers.add(t.createdBy.name);
  });
  const teamMembersCount = uniqueMembers.size;

  const stats = [
    { title: 'Total Tasks', value: totalTasksCount, icon: ClipboardList, color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { title: 'In Progress', value: inProgressCount, icon: Clock, color: 'text-accent-400', bg: 'bg-accent-500/10' },
    { title: 'Overdue', value: overdueCount, icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { title: 'Team Members', value: teamMembersCount, icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
  ];

  // Dynamic relative time formatting helper
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  // Due date descriptor helper
  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = dDate.getTime() - dNow.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays === -1) return 'Overdue by 1 day';
    if (diffDays < -1) return `Overdue by ${Math.abs(diffDays)} days`;
    return `Due in ${diffDays} days`;
  };

  // Top 3 recent tasks
  const recentTasks = [...myTasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  // Overall task completion progress percentage
  const completionPercentage = totalTasksCount > 0 
    ? Math.round((completedCount / totalTasksCount) * 100) 
    : 0;

  // Handle direct timer pausing from dashboard
  const handlePauseActiveTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // prevent card navigation trigger
    try {
      await pauseTimer(taskId);
    } catch (err) {
      console.error('Failed to pause timer from dashboard', err);
    }
  };

  if (isTasksLoading) {
    return <div className="text-white p-8 animate-pulse">Loading dashboard...</div>;
  }

  if (myTasks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome to TaskPulse</h1>
            <p className="text-sm text-gray-400">Here's your live control center.</p>
          </div>
          {user?.role === 'ADMIN' && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="btn-primary flex items-center gap-2 py-2.5"
            >
              <Plus className="w-5 h-5" />
              <span>New Task</span>
            </button>
          )}
        </div>

        {/* Dynamic design onboarding */}
        <div className="glass-panel p-8 text-center max-w-2xl mx-auto my-12 flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shadow-neon shrink-0 animate-pulse">
            <ClipboardList className="w-8 h-8 text-primary-400" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">No active tasks found</h2>
            {user?.role === 'ADMIN' ? (
              <p className="text-gray-400 max-w-md">
                Start building your project workflow. Create your very first task to assign it to an employee and track real-time progress.
              </p>
            ) : (
              <p className="text-gray-400 max-w-md">
                Your workspace is currently clean! Statistics and live ticking time trackers will appear here as soon as your manager assigns you a task.
              </p>
            )}
          </div>

          {user?.role === 'ADMIN' ? (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="btn-primary flex items-center gap-2 py-2.5 px-6"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Task</span>
            </button>
          ) : (
            <div className="text-sm text-primary-400 font-semibold animate-pulse">
              Awaiting task assignments...
            </div>
          )}
        </div>
        
        <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-gray-400">Welcome back, <span className="text-white font-medium">{user?.name}</span>. Here's your live update center.</p>
        </div>
        
        {user?.role === 'ADMIN' && (
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary flex items-center gap-2 py-2.5"
          >
            <Plus className="w-5 h-5" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Real-time active task banner */}
      {activeTask && (
        <div className="glass-panel p-6 border-l-4 border-l-primary-500 bg-primary-500/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 hover:border-primary-400 transition-all duration-300">
          <div className="absolute inset-0 bg-primary-500/5 animate-pulse pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10 w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center border border-primary-500/20 shadow-neon shrink-0">
              <Clock className="w-6 h-6 text-primary-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs uppercase tracking-wider font-semibold text-primary-400 bg-primary-500/15 px-2 py-0.5 rounded">
                  Running Session
                </span>
                <span className="w-2 h-2 rounded-full bg-primary-400 animate-ping" />
              </div>
              <h3 
                onClick={() => navigate(`/tasks/${activeTask.id}`)}
                className="text-lg font-bold text-white hover:text-primary-300 transition-colors cursor-pointer"
              >
                {activeTask.title}
              </h3>
              <p className="text-xs text-gray-400">Assigned to: {activeTask.assignee.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-3xl font-extrabold text-white tracking-wider font-mono shadow-neon">
                {formatStopwatch(activeSeconds)}
              </div>
              <div className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">Live Ticking</div>
            </div>
            
            <button 
              onClick={(e) => handlePauseActiveTask(e, activeTask.id)}
              className="p-3.5 rounded-xl bg-primary-500 hover:bg-primary-400 text-white shadow-neon hover:-translate-y-0.5 transition-all"
              title="Pause Timer"
            >
              <Pause className="w-5 h-5 fill-white" />
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="glass-panel p-6 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-gray-400 font-medium">{stat.title}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Task Completion Progress */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Task Completion</h3>
            <span className="text-xs font-semibold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-full">
              {completionPercentage}% Done
            </span>
          </div>
          <div>
            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 shadow-neon transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500 mt-2">
              <span>{completedCount} Completed</span>
              <span>{totalTasksCount - completedCount} Remaining</span>
            </div>
          </div>
        </div>

        {/* Time Tracking Progress */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Total Time Tracked</h3>
            <span className="text-xs font-semibold text-accent-400 bg-accent-500/10 px-2.5 py-1 rounded-full">
              Real-time
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{formatHours(totalLoggedTime)}</span>
            <span className="text-sm text-gray-500 font-medium">logged across workspace</span>
          </div>
        </div>
      </div>

      {/* Tasks and Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Recent Tasks</h2>
            <button 
              onClick={() => navigate('/tasks')}
              className="text-sm text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          
          <div className="space-y-4">
            {recentTasks.map((task) => {
              const isOverdue = new Date(task.dueDate) < new Date() && !['Completed', 'Approved'].includes(task.status);
              const isRunning = task.timerData.isRunning;
              
              return (
                <div 
                  key={task.id} 
                  onClick={() => navigate(`/tasks/${task.id}`)}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group relative"
                >
                  {isRunning && (
                    <div className="absolute inset-0 bg-primary-500/5 rounded-xl border border-primary-500/20 animate-pulse pointer-events-none" />
                  )}
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className={`w-2 h-10 rounded-full ${
                      isOverdue ? 'bg-red-500' : task.status === 'Completed' ? 'bg-green-500' : 'bg-primary-500'
                    }`} />
                    <div>
                      <div className="text-white font-medium mb-1 group-hover:text-primary-300 transition-colors">
                        {task.title}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>
                          {formatDueDate(task.dueDate)}
                        </span>
                        <span>•</span>
                        <span className="text-gray-400">{task.priority} Priority</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 relative z-10">
                    {isRunning && (
                      <span className="text-xs font-mono font-bold text-primary-400 bg-primary-500/10 px-2.5 py-1 rounded-full border border-primary-500/20 flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-ping" />
                        Ticking
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <img 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.name}`} 
                        className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-800" 
                        alt="Assignee" 
                        title={`Assigned to ${task.assignee.name}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold text-white mb-6">Activity Feed</h2>
          
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500 italic text-sm">
              No recent notifications.
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {notifications.slice(0, 5).map((activity) => {
                const isComplete = activity.message.toLowerCase().includes('complete') || activity.message.toLowerCase().includes('status changed to completed') || activity.message.toLowerCase().includes('status changed to approved');
                const isAssign = activity.message.toLowerCase().includes('assigned');
                const dotColor = isComplete ? 'bg-green-500 shadow-neon-green' : isAssign ? 'bg-primary-500 shadow-neon-primary' : 'bg-accent-500 shadow-neon-accent';
                
                return (
                  <div 
                    key={activity.id} 
                    onClick={() => activity.taskId && navigate(`/tasks/${activity.taskId}`)}
                    className="relative flex items-start gap-4 cursor-pointer group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-950 bg-gray-900 shrink-0 relative z-10 hover:scale-105 transition-transform">
                      <div className={`w-3 h-3 rounded-full ${dotColor}`} />
                    </div>
                    
                    <div className="flex-1 p-3.5 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/10 transition-colors">
                      <div className="text-sm text-gray-200 mb-1 group-hover:text-primary-300 transition-colors">
                        {activity.message}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateTaskModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};

export default Dashboard;

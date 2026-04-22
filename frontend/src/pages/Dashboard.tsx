import { Clock, CheckCircle2, AlertCircle, Plus, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  
  const stats = [
    { title: 'Total Tasks', value: '42', icon: CheckCircle2, color: 'text-primary-500', bg: 'bg-primary-500/10' },
    { title: 'In Progress', value: '15', icon: Clock, color: 'text-accent-500', bg: 'bg-accent-500/10' },
    { title: 'Overdue', value: '3', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { title: 'Team Members', value: '12', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-gray-400">Here's what's happening with your projects today.</p>
        </div>
        
        {user?.role === 'MANAGER' && (
          <button className="btn-primary flex items-center gap-2 py-2.5">
            <Plus className="w-5 h-5" />
            <span>New Task</span>
          </button>
        )}
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <div className="glass-panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Recent Tasks</h2>
            <button className="text-sm text-primary-400 hover:text-primary-300 transition-colors">View All</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${i === 1 ? 'bg-red-500' : i === 2 ? 'bg-primary-500' : 'bg-green-500'}`} />
                  <div>
                    <div className="text-white font-medium mb-1 group-hover:text-primary-300 transition-colors">
                      {i === 1 ? 'Fix critical payment bug' : i === 2 ? 'Update user profile UI' : 'Write API documentation'}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" /> Due {i === 1 ? 'Today' : i === 2 ? 'Tomorrow' : 'In 3 days'}
                    </div>
                  </div>
                </div>
                <div className="flex -space-x-2">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-800" alt="Assignee" />
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i+10}`} className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-800" alt="Assignee" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-panel p-6">
          <h2 className="text-lg font-bold text-white mb-6">Activity Feed</h2>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {[
              { text: 'Alice assigned a task to Bob', time: '10 min ago', color: 'bg-primary-500' },
              { text: 'Charlie marked task as complete', time: '1 hr ago', color: 'bg-green-500' },
              { text: 'Diana added a comment', time: '3 hrs ago', color: 'bg-accent-500' },
            ].map((activity, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-gray-950 bg-gray-900 shrink-0 relative z-10">
                  <div className={`w-3 h-3 rounded-full ${activity.color} shadow-neon`} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-4 md:ml-0 p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-sm text-gray-200 mb-1">{activity.text}</div>
                  <div className="text-xs text-gray-500">{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

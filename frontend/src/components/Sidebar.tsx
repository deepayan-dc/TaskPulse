import { LayoutDashboard, CheckSquare, Bell, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const managerNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const employeeNavItems = [
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  const navItems = user?.role === 'MANAGER' ? managerNavItems : employeeNavItems;

  return (
    <aside className="w-64 glass-panel m-4 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
          <CheckSquare className="text-white w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
          TaskPulse
        </h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  isActive
                    ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-white/5">
        <div className="text-sm text-gray-300 font-medium mb-1">Need help?</div>
        <div className="text-xs text-gray-500 mb-3">Check our docs</div>
        <button className="w-full py-2 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          Documentation
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

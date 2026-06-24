import { LayoutDashboard, CheckSquare, Bell, Settings, Users, Wallet } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import QverLabsLogo from './QverLabsLogo';

const Sidebar = () => {
  const { user } = useAuth();
  const org = user?.organization;

  const adminNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Users, label: 'Onboard Team', path: '/onboard-team' },
    { icon: Wallet, label: 'Billing & Usage', path: '/billing' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const memberNavItems = [
    { icon: CheckSquare, label: 'My Tasks', path: '/tasks' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
  ];

  const navItems = user?.role === 'ADMIN' ? adminNavItems : memberNavItems;

  return (
    <aside className="w-64 glass-panel m-4 flex flex-col hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        {org?.logoUrl ? (
          <img src={org.logoUrl} alt={org.name} className="h-9 max-w-[180px] object-contain" />
        ) : (
          <>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <CheckSquare className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 to-accent-400">
              {org?.name || 'TaskPulse'}
            </h1>
          </>
        )}
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

      <div className="m-4 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 shadow-neon px-4 py-3 flex flex-col items-center gap-1">
        <div className="text-[10px] uppercase tracking-wide text-white/70">Powered by</div>
        <QverLabsLogo height={22} />
      </div>
    </aside>
  );
};

export default Sidebar;

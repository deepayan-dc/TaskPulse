import { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, LogOut, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';

const Topbar = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const navigate = useNavigate();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (id: string, taskId: string) => {
    markAsRead(id);
    setIsDropdownOpen(false);
    navigate(`/tasks/${taskId}`);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 px-6 flex items-center justify-between glass-panel m-4 ml-0 z-50 relative">
      <div className="flex items-center gap-4 flex-1">
        <button className="md:hidden text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search tasks, projects..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all placeholder:text-gray-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        
        {/* NOTIFICATION BELL */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-500 rounded-full ring-2 ring-gray-900 shadow-neon"></span>
            )}
          </button>

          {/* DROPDOWN */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 glass-panel rounded-2xl overflow-hidden shadow-2xl border border-white/10 animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-gray-900/50">
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} new
                  </span>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto custom-scrollbar bg-[#0f111a]">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 text-sm italic">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id, notif.taskId)}
                        className={clsx(
                          "p-4 hover:bg-white/5 transition-colors cursor-pointer group flex gap-3",
                          !notif.read ? "bg-primary-500/5" : ""
                        )}
                      >
                        <div className="mt-1">
                          {!notif.read ? (
                            <div className="w-2 h-2 rounded-full bg-accent-500 shadow-neon" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className={clsx(
                            "text-sm leading-snug group-hover:text-white transition-colors",
                            !notif.read ? "text-gray-200 font-medium" : "text-gray-400"
                          )}>
                            {notif.message}
                          </p>
                          <span className="text-xs text-gray-500 block mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-white/10 mx-2"></div>
        <div className="flex items-center gap-3 cursor-pointer group pr-4 border-r border-white/10 mr-2">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{user?.name}</div>
            <div className="text-xs text-primary-400 capitalize">{user?.role?.toLowerCase()}</div>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary-500/30 overflow-hidden group-hover:border-primary-500 transition-colors">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} alt="Avatar" className="w-full h-full object-cover bg-gray-800" />
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors flex items-center justify-center"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Topbar;

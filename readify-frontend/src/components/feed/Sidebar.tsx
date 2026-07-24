import { ComponentType, SVGProps, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpenIcon, CompassIcon, HomeIcon, LogOutIcon, SearchIcon, ThemeIcon, UserIcon } from '../icons';
import toast from 'react-hot-toast';

interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Feed', path: '/feed', icon: HomeIcon },
  { label: 'Discover', path: '/discover', icon: CompassIcon },
  { label: 'Search', path: '/search', icon: SearchIcon },
  { label: 'My Shelf', path: '/shelf', icon: BookOpenIcon },
  { label: 'Profile', path: '/profile', icon: UserIcon },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  // Check initial theme preference on mount
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Toggle theme handler
  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('readify_token');
    toast.success('Logged out successfully.');
    navigate('/');
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-card dark:bg-card-dark dark:border-gray-800 px-4 py-6 lg:flex">
      <Link to="/feed" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <BookOpenIcon className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-text dark:text-text-dark">Readify</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-textSecondary dark:text-textSecondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text dark:hover:text-text-dark'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-1">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-textSecondary dark:text-textSecondary-dark transition-colors duration-150 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text dark:hover:text-text-dark"
        >
          <ThemeIcon isDark={isDark} className="h-5 w-5" />
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Logout button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 dark:text-red-400 transition-colors duration-150 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300"
        >
          <LogOutIcon className="h-5 w-5" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}
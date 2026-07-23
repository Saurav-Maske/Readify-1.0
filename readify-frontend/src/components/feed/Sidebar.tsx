import type { ComponentType, SVGProps } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpenIcon, CompassIcon, HomeIcon, SearchIcon, SettingsIcon, UserIcon } from '../icons';

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
  { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-gray-100 bg-card px-4 py-6 lg:flex">
      <Link to="/feed" className="mb-8 flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
          <BookOpenIcon className="h-5 w-5" />
        </span>
        <span className="text-lg font-bold text-text">Readify</span>
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
                isActive ? 'bg-primary text-white' : 'text-textSecondary hover:bg-gray-100 hover:text-text'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
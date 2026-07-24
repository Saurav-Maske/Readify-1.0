import { useLocation } from 'react-router-dom';
import { Sidebar } from '../feed/Sidebar';
import { AiPickCard } from '../feed/AiPickCard';
import { TrendingCard } from '../feed/TrendingCard';
import { ReadersToFollowCard } from '../feed/ReadersToFollowCard';
import { MOCK_AI_PICK, MOCK_TRENDING_BOOKS, MOCK_SUGGESTED_READERS } from '../../lib/mockFeedData';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  
  // Check if the current route is the feed page
  const isFeedPage = location.pathname === '/' || location.pathname === '/feed';

  return (
    <div className="min-h-screen bg-background dark:bg-background-dark flex w-full transition-colors duration-200">
      {/* Left Sidebar (Only rendered here) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-8 py-8 max-w-4xl mx-auto overflow-y-auto">
        {children}
      </main>

      {/* Right Sidebar Widgets - Visible ONLY on the Feed page */}
      {isFeedPage && (
        <aside className="hidden xl:block w-80 p-6 space-y-6 sticky top-0 h-screen overflow-y-auto border-l border-gray-100 dark:border-gray-800 shrink-0">
          <AiPickCard pick={MOCK_AI_PICK} />
          <TrendingCard books={MOCK_TRENDING_BOOKS} />
          <ReadersToFollowCard readers={MOCK_SUGGESTED_READERS} />
        </aside>
      )}
    </div>
  );
}

export default DashboardLayout;
import React, { useState, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FiHome, FiClipboard, FiBarChart2, FiUsers, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const auth = useAuth();

  if (!auth) {
    return null;
  }

  // Navigation links based on user role
  const navLinks = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: FiHome,
      current: pathname === '/dashboard'
    },
    {
      name: 'Commitments',
      href: '/commitments',
      icon: FiClipboard,
      current: pathname.startsWith('/commitments')
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FiBarChart2,
      current: pathname.startsWith('/reports')
    },
    {
      name: 'Prospects',
      href: '/prospects',
      icon: FiUsers,
      current: pathname.startsWith('/prospects')
    }
  ];

  // Add admin-specific links
  if (auth.userData?.role === 'admin') {
    navLinks.push({
      name: 'Admin',
      href: '/admin',
      icon: FiSettings,
      current: pathname.startsWith('/admin')
    });
  }

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = async () => {
    try {
      console.log('Attempting to logout...');
      await auth.logout();
      console.log('Logout successful');
      // Force a page reload to clear any cached state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Show error to user
      toast.error('Failed to logout. Please try again.');
    }
  };

  return (
    <div className="flex h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white dark:bg-secondary-800 shadow-lg transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-200 dark:border-secondary-700">
          <Link href="/dashboard" className="text-xl font-bold text-primary-600">
            SalesTrack
          </Link>
          <button className="lg:hidden" onClick={toggleSidebar}>
            <FiX className="h-6 w-6 text-secondary-500" />
          </button>
        </div>

        <div className="px-4 py-4">
          <nav className="space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700'
                  }`}
                >
                  <link.icon
                    className={`mr-3 h-5 w-5 ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-secondary-500 dark:text-secondary-400'
                    }`}
                  />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-secondary-200 dark:border-secondary-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-secondary-700 rounded-md hover:bg-secondary-100 dark:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <FiLogOut className="mr-3 h-5 w-5 text-secondary-500 dark:text-secondary-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top header */}
        <header className="flex items-center h-16 px-6 bg-white dark:bg-secondary-800 shadow-sm z-10">
          <button 
            className="lg:hidden mr-4 text-secondary-500 focus:outline-none" 
            onClick={toggleSidebar}
          >
            <FiMenu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center ml-auto">
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                  {auth.userData?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-sm font-medium hidden md:block">
                  {auth.userData?.name}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
} 
import { ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { useState } from 'react';
import { Organization, User as UserType } from '../../types';

interface HeaderProps {
  toggleSidebar: () => void;
  user: UserType | null;
  onLogout: () => void;
  currentOrganization: Organization | null;
}

const Header = ({ toggleSidebar, user, onLogout, currentOrganization }: HeaderProps) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  
  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };
  
  return (
    <header className="bg-white border-b border-gray-200 z-10">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              type="button"
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 md:hidden"
              onClick={toggleSidebar}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-shrink-0 flex items-center ml-4 md:ml-0">
              {currentOrganization && (
                <span className="text-lg font-semibold text-gray-900">{currentOrganization.name}</span>
              )}
            </div>
          </div>
          <div className="flex items-center">
            {/* User dropdown */}
            <div className="ml-3 relative">
              <div>
                <button
                  type="button"
                  className="max-w-xs bg-white flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 p-2"
                  onClick={toggleUserMenu}
                >
                  <span className="sr-only">Open user menu</span>
                  <div className="h-8 w-8 rounded-full bg-primary-700 flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="ml-2 hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</span>
                    <span className="text-xs text-gray-500 capitalize">{user?.role.replace('_', ' ')}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
                </button>
              </div>
              
              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-2 border-b border-gray-100 md:hidden">
                    <p className="text-sm font-medium text-gray-700">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
import { NavLink } from 'react-router-dom';
import { X, BarChart4, Users, ClipboardList, Building2, CheckCircle2, User } from 'lucide-react';
import { User as UserType } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  user: UserType | null;
}

const Sidebar = ({ isOpen, toggleSidebar, user }: SidebarProps) => {
  const isSuperAdmin = user?.role === 'super_admin';
  
  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <BarChart4 className="h-5 w-5" />, roles: ['super_admin', 'org_admin', 'employee', 'reviewer'] },
    { path: '/organizations', label: 'Organizations', icon: <Building2 className="h-5 w-5" />, roles: ['super_admin'] },
    { path: '/users', label: 'Users', icon: <Users className="h-5 w-5" />, roles: ['super_admin', 'org_admin'] },
    { path: '/assessments', label: 'Assessments', icon: <ClipboardList className="h-5 w-5" />, roles: ['super_admin', 'org_admin'] },
    { path: '/results', label: 'Results', icon: <BarChart4 className="h-5 w-5" />, roles: ['super_admin', 'org_admin'] },
    { path: '/my-assessments', label: 'My Assessments', icon: <ClipboardList className="h-5 w-5" />, roles: ['employee', 'reviewer'] },
    { path: '/my-results', label: 'My Results', icon: <BarChart4 className="h-5 w-5" />, roles: ['employee'] }
  ];
  
  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user?.role || '')
  );
  
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 text-white transform transition duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-screen ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-primary-700">
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-white" />
              <span className="ml-2 font-semibold text-xl">360° Feedback</span>
            </div>
            <button 
              className="md:hidden text-white hover:text-primary-200"
              onClick={toggleSidebar}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* User info */}
          <div className="px-4 py-4 border-b border-primary-700">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                <User className="h-6 w-6" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs opacity-75 capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive 
                      ? 'bg-primary-700 text-white' 
                      : 'text-primary-100 hover:bg-primary-700 hover:text-white'
                  }`
                }
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
          
          {/* Footer */}
          <div className="px-4 py-3 border-t border-primary-700 text-xs opacity-75">
            <p>© 2025 360° Feedback Platform</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
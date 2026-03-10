import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tags,
  Users,
  ShoppingCart,
  Settings,
  ChevronDown,
  ChevronRight,
  Plus,
  List,
  ArrowRight,
  UserCog,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const { hasPermission, currentUser, switchUser, users } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({
    channels: location.pathname.startsWith('/channels'),
    settings: location.pathname.startsWith('/settings') || location.pathname.startsWith('/users'),
  });
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  const navItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: 'Dashboard',
      permission: null,
    },
    {
      path: '/products',
      icon: Package,
      label: 'Products',
      permission: 'products',
    },
    {
      path: '/categories',
      icon: FolderTree,
      label: 'Categories',
      permission: 'categories',
    },
    {
      path: '/attributes',
      icon: Tags,
      label: 'Attributes',
      permission: 'attributes',
    },
    {
      id: 'channels',
      path: '/channels',
      icon: ShoppingCart,
      label: 'Channels',
      permission: null, // Only admins can access
      adminOnly: true,
      hasSubmenu: true,
      submenu: [
        {
          path: '/channels',
          icon: List,
          label: 'All Channels',
        },
        {
          path: '/channels/category-mapping',
          icon: FolderTree,
          label: 'Category Mapping',
        },
        {
          path: '/channels/attribute-mapping',
          icon: ArrowRight,
          label: 'Attribute Mapping',
        },
      ],
    },
    {
      id: 'settings',
      path: '/settings',
      icon: Settings,
      label: 'Settings',
      permission: null, // Only admins can access
      adminOnly: true,
      hasSubmenu: true,
      submenu: [
        {
          path: '/settings',
          icon: Settings,
          label: 'General Settings',
        },
        {
          path: '/users',
          icon: Users,
          label: 'Users',
        },
      ],
    },
  ];

  const canAccessPage = (item: typeof navItems[0]) => {
    if (item.adminOnly) {
      return currentUser?.role === 'admin';
    }
    if (item.permission) {
      return hasPermission(item.permission, 'pageAccess');
    }
    return true;
  };

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId],
    }));
  };

  const handleSwitchUser = (userId: number) => {
    switchUser(userId);
    setShowUserSwitcher(false);
  };

  return (
    <aside className="w-64 bg-[#F7F7F7] border-r border-[#EBEBEB] flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-[#EBEBEB]">
        <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center p-2">
            <img src="/logo.svg" alt="Product Hub" className="w-full h-full" />
          </div>
          <div>
            <h1 className="font-bold text-[#171717]">Product Hub</h1>
            <p className="text-xs text-[#5C5C5C]">PIM System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems
            .filter(canAccessPage)
            .map((item) => (
              <li key={item.path}>
                {item.hasSubmenu ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.id!)}
                      className={`sidebar-link w-full ${
                        (item.id === 'channels' && location.pathname.startsWith('/channels')) ||
                        (item.id === 'settings' && (location.pathname.startsWith('/settings') || location.pathname.startsWith('/users')))
                          ? 'sidebar-link-active' 
                          : ''
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {expandedMenus[item.id!] ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    {expandedMenus[item.id!] && (
                      <ul className="ml-4 mt-1 space-y-1">
                        {item.submenu?.map((subItem) => (
                          <li key={subItem.path}>
                            <NavLink
                              to={subItem.path}
                              end={subItem.path === '/channels' || subItem.path === '/settings'}
                              className={({ isActive }) =>
                                `sidebar-link text-sm ${isActive ? 'sidebar-link-active' : ''}`
                              }
                            >
                              <subItem.icon size={18} />
                              <span>{subItem.label}</span>
                            </NavLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
                    }
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </li>
            ))}
        </ul>
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-[#EBEBEB]">
        <div className="flex items-center gap-2">
          <img
            src={currentUser?.avatar || 'https://ui-avatars.com/api/?name=User'}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#171717] truncate">
              {currentUser?.name}
            </p>
            <p className="text-xs text-[#5C5C5C] truncate">
              {currentUser?.role === 'admin' ? 'Admin' : 'Standard User'}
            </p>
          </div>
          
          {/* User Switcher Button (Admin only) */}
          {currentUser?.role === 'admin' && (
            <div className="relative">
              <button
                onClick={() => setShowUserSwitcher(!showUserSwitcher)}
                className="p-2 text-[#5C5C5C] hover:text-primary hover:bg-white rounded-lg transition-colors"
                title="Switch User"
              >
                <UserCog size={18} />
              </button>

              {showUserSwitcher && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserSwitcher(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-lg shadow-lg border border-[#EBEBEB] py-2 z-50">
                    <div className="px-4 py-2 text-xs font-medium text-[#5C5C5C] uppercase border-b border-[#EBEBEB]">
                      Switch User
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {users
                        .filter((u) => u.status === 'active' && u.id !== currentUser.id)
                        .map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleSwitchUser(user.id)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#F7F7F7] transition-colors"
                          >
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-[#171717]">{user.name}</p>
                              <p className="text-xs text-[#5C5C5C]">{user.email}</p>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;


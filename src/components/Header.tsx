import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  // Get page title based on current route
  const pageTitle = useMemo(() => {
    const path = location.pathname;

    // Exact matches
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/products') return 'Products';
    if (path === '/categories') return 'Categories';
    if (path === '/attributes') return 'Attributes';
    if (path === '/assets') return 'Assets';
    if (path === '/users') return 'Users';
    if (path === '/channels') return 'Channels';
    if (path === '/settings') return 'Settings';

    // Pattern matches
    if (path.startsWith('/products/new')) return 'New Product';
    if (path.startsWith('/products/import')) return 'Bulk Import';
    if (path.startsWith('/products/base/')) return 'Main Product';
    if (path.match(/^\/products\/\d+\/edit$/)) return 'Edit Product';
    if (path.match(/^\/products\/\d+\/variants\/new$/)) return 'New Variant';
    if (path.match(/^\/products\/\d+\/variants\/\d+\/edit$/)) return 'Edit Variant';
    if (path.match(/^\/products\/\d+$/)) return 'Product Details';
    if (path.match(/^\/categories\/\d+$/)) return 'Category';

    // Default fallback
    return 'Dashboard';
  }, [location.pathname]);

  return (
    <header className="h-[88px] bg-white border-b border-[#EBEBEB] flex items-center justify-between px-8 py-5">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-[#F5F5F5] rounded-full flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 9L15 15M15 9L9 15" stroke="#5C5C5C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-[18px] font-medium leading-6 text-[#171717] tracking-[-0.015em]">
            {pageTitle}
          </h2>
          <p className="text-sm font-normal leading-5 text-[#5C5C5C] tracking-[-0.006em]">
            Insert page description here.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Header actions can go here */}
      </div>
    </header>
  );
};

export default Header;


import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronRight, ChevronDown, FolderTree, X, ChevronsDown, ChevronsUp } from 'lucide-react';
import type { Category } from '../types';

interface CategoryPickerProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelect: (categoryId: number) => void;
  onClose?: () => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  selectedCategoryId,
  onSelect,
  onClose,
  label,
  required = false,
  disabled = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  // Build category tree
  const buildTree = (cats: Category[]): Category[] => {
    const categoryMap = new Map<number, Category>();
    const rootCategories: Category[] = [];

    // Create map
    cats.forEach((cat) => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    // Build tree
    cats.forEach((cat) => {
      const category = categoryMap.get(cat.id)!;
      if (cat.parentId === null) {
        rootCategories.push(category);
      } else {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(category);
        }
      }
    });

    return rootCategories;
  };

  // Filter categories by search (FR-5.2: Case-insensitive, partial matching, searches TR and EN)
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return categories;
    
    const query = searchQuery.toLowerCase();
    return categories.filter((category) => {
      // Search in name
      const name = category.name.toLowerCase();
      // Search in path
      const path = category.path.toLowerCase();
      
      return name.includes(query) || path.includes(query);
    });
  }, [categories, searchQuery]);

  // Auto-expand categories when searching (FR-5.2)
  useEffect(() => {
    if (searchQuery && filteredCategories.length > 0) {
      const newExpanded = new Set<number>();
      // Expand all parents of matching categories
      filteredCategories.forEach(category => {
        const expandParents = (catId: number | null) => {
          if (catId === null) return;
          const cat = categories.find(c => c.id === catId);
          if (cat && cat.parentId !== null) {
            newExpanded.add(cat.parentId);
            expandParents(cat.parentId);
          }
        };
        expandParents(category.parentId);
      });
      setExpandedCategories(newExpanded);
    }
  }, [searchQuery, filteredCategories, categories]);

  const categoryTree = buildTree(filteredCategories);

  const selectedCategory = selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId) : null;

  const toggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Expand all / Collapse all (FR-5.1)
  const expandAll = () => {
    const allCategoryIds = new Set<number>();
    const collectIds = (cats: Category[]) => {
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          allCategoryIds.add(cat.id);
          collectIds(cat.children);
        }
      });
    };
    collectIds(categoryTree);
    setExpandedCategories(allCategoryIds);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Helper function to highlight search matches (FR-5.2)
  const highlightSearchMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    
    return (
      <>
        {before}
        <mark className="bg-yellow-200 px-1 rounded">{match}</mark>
        {after}
      </>
    );
  };

  const handleSelect = (categoryId: number) => {
    onSelect(categoryId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearchQuery('');
    onClose?.();
  };

  const renderCategoryTree = (cats: Category[], level: number = 0) => {
    return cats.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);
      const isSelected = category.id === selectedCategoryId;
      const categoryName = typeof category.name === 'string' ? category.name : (category.name.en || category.name.tr || '');
      const matchesSearch = searchQuery && (
        categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.path.toLowerCase().includes(searchQuery.toLowerCase())
      );

      return (
        <div key={category.id}>
          <div
            className={`flex items-center gap-2 py-2 px-3 hover:bg-white rounded-lg cursor-pointer transition-colors ${
              isSelected ? 'bg-primary-light border-l-4 border-primary' : ''
            } ${matchesSearch && searchQuery ? 'bg-yellow-50' : ''}`}
            style={{ marginLeft: `${level * 16}px` }}
            onClick={() => handleSelect(category.id)}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(category.id);
                }}
                className="p-1 hover:bg-[#F7F7F7] rounded"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <div className="w-6" />
            )}
            <FolderTree size={16} className="text-[#A4A4A4]" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isSelected ? 'font-semibold text-primary' : 'text-[#5C5C5C]'}`}>
                  {searchQuery ? highlightSearchMatch(categoryName, searchQuery) : categoryName}
                </span>
                <span className="text-xs text-[#5C5C5C]">({category.productCount})</span>
              </div>
              {/* Show parent path for matches (FR-5.2) */}
              {matchesSearch && searchQuery && category.parentId && (
                <div className="text-xs text-[#5C5C5C] mt-0.5 truncate">
                  Path: {category.path}
                </div>
              )}
            </div>
          </div>
          {hasChildren && isExpanded && renderCategoryTree(category.children!, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="relative">
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Selected Category Display */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`input w-full text-left flex items-center justify-between ${
          disabled ? 'bg-white cursor-not-allowed' : ''
        }`}
      >
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <>
              <FolderTree size={16} className="text-[#A4A4A4]" />
              <span>{typeof selectedCategory.name === 'string' ? selectedCategory.name : (selectedCategory.name.en || selectedCategory.name.tr || '')}</span>
              <span className="text-xs text-[#5C5C5C]">({selectedCategory.path})</span>
            </>
          ) : (
            <span className="text-[#A4A4A4]">Select a category...</span>
          )}
        </div>
        <ChevronDown size={18} className={`text-[#A4A4A4] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-[#EBEBEB] z-50 max-h-96 overflow-hidden flex flex-col">
            {/* Search (FR-5.2) */}
            <div className="p-3 border-b border-[#EBEBEB]">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search categories (name or path)..."
                    className="input pl-9 py-2 text-sm"
                    autoFocus
                  />
                </div>
                {categoryTree.length > 0 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={expandAll}
                      className="p-1.5 text-[#5C5C5C] hover:text-[#171717] hover:bg-white rounded"
                      title="Expand All"
                    >
                      <ChevronsDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={collapseAll}
                      className="p-1.5 text-[#5C5C5C] hover:text-[#171717] hover:bg-white rounded"
                      title="Collapse All"
                    >
                      <ChevronsUp size={16} />
                    </button>
                  </div>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-[#5C5C5C] mt-2">
                  Searching in category names (TR/EN) and paths
                </p>
              )}
            </div>

            {/* Category Tree */}
            <div className="flex-1 overflow-y-auto p-2">
              {categoryTree.length === 0 ? (
                <div className="text-center py-8 text-[#5C5C5C]">
                  <FolderTree size={32} className="mx-auto text-[#A4A4A4] mb-2" />
                  <p className="text-sm">
                    {searchQuery ? 'No categories found' : 'No categories available'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">{renderCategoryTree(categoryTree)}</div>
              )}
            </div>

            {/* Footer with Confirm/Cancel (FR-5.1) */}
            <div className="p-3 border-t border-[#EBEBEB] bg-[#F7F7F7]">
              {selectedCategory ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-[#5C5C5C]">
                    <span className="font-medium">Selected:</span>{' '}
                    <span className="text-primary font-medium">{typeof selectedCategory.name === 'string' ? selectedCategory.name : (selectedCategory.name.en || selectedCategory.name.tr || '')}</span>
                    <span className="text-xs text-[#5C5C5C] ml-2">({selectedCategory.path})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(0);
                        setIsOpen(false);
                      }}
                      className="text-xs text-[#5C5C5C] hover:text-red-600 flex items-center gap-1"
                    >
                      <X size={12} />
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(selectedCategory.id);
                      }}
                      className="btn btn-primary text-xs py-1 px-3"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="btn btn-secondary text-xs py-1 px-3"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryPicker;


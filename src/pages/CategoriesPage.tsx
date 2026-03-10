import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, ChevronRight, ChevronDown, ChevronsDown, ChevronsUp, Edit, Trash2 } from 'lucide-react';
import type { Category } from '../types';
import CategoryPicker from '../components/CategoryPicker';

const CategoriesPageNew: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getText } = useLanguage();
  const { categories, products, createCategory, updateCategory, attributes } = useData();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showEditDrawer, setShowEditDrawer] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
  const [requiredAttributeIds, setRequiredAttributeIds] = useState<number[]>([]);
  const [variantAttributeIds, setVariantAttributeIds] = useState<number[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>([]);
  const [showAttributePicker, setShowAttributePicker] = useState(false);
  const [attributeSearchQuery, setAttributeSearchQuery] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const canEdit = currentUser?.role === 'admin';

  const openCreateDrawer = () => {
    setCreateError(null);
    setNewCategoryName('');
    setNewCategoryParentId(null);
    setRequiredAttributeIds([]);
    setVariantAttributeIds([]);
    setSelectedAttributeIds([]);
    setShowCreateDrawer(true);
  };

  const openEditDrawer = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(typeof category.name === 'string' ? category.name : (category.name.en || category.name.tr || ''));
    setNewCategoryParentId(category.parentId);
    setRequiredAttributeIds(category.requiredAttributeIds || []);
    setVariantAttributeIds(category.variantAttributeIds || []);
    // Combine both required and variant IDs to show which attributes are selected
    const allSelectedIds = [...new Set([...(category.requiredAttributeIds || []), ...(category.variantAttributeIds || [])])];
    setSelectedAttributeIds(allSelectedIds);
    setCreateError(null);
    setShowEditDrawer(true);
  };

  const handleAddAttribute = (attributeId: number) => {
    if (!selectedAttributeIds.includes(attributeId)) {
      setSelectedAttributeIds([...selectedAttributeIds, attributeId]);
    }
    setShowAttributePicker(false);
    setAttributeSearchQuery('');
  };

  const handleRemoveAttribute = (attributeId: number) => {
    setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attributeId));
    setRequiredAttributeIds(requiredAttributeIds.filter(id => id !== attributeId));
    setVariantAttributeIds(variantAttributeIds.filter(id => id !== attributeId));
  };

  // Filter available attributes (not already selected)
  const availableAttributes = attributes.filter(attr => 
    !selectedAttributeIds.includes(attr.id) &&
    getText(attr.name).toLowerCase().includes(attributeSearchQuery.toLowerCase())
  );

  // Handle edit query parameter from category detail page
  useEffect(() => {
    const editCategoryId = searchParams.get('edit');
    if (editCategoryId && categories.length > 0) {
      const categoryToEdit = categories.find(c => c.id === parseInt(editCategoryId));
      if (categoryToEdit) {
        openEditDrawer(categoryToEdit);
        // Clear the query parameter
        setSearchParams({});
      }
    }
  }, [searchParams, categories]);

  const closeCreateDrawer = () => {
    setShowCreateDrawer(false);
    setCreateError(null);
  };

  const closeEditDrawer = () => {
    setShowEditDrawer(false);
    setEditingCategory(null);
    setCreateError(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!newCategoryName.trim()) {
      setCreateError('Category name is required');
      return;
    }

    try {
      createCategory({
        name: newCategoryName.trim(),
        parentId: newCategoryParentId,
        // These are derived/managed inside DataContext, but required by the type
        level: 0,
        path: '',
        productCount: 0,
        children: null,
        requiredAttributeIds: requiredAttributeIds,
        variantAttributeIds: variantAttributeIds,
        channelMappings: {},
        image: undefined,
      });

      setShowCreateDrawer(false);
      setNewCategoryName('');
      setNewCategoryParentId(null);
      setRequiredAttributeIds([]);
      setVariantAttributeIds([]);
    } catch (error: any) {
      setCreateError(error?.message || 'Failed to create category');
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!editingCategory) return;

    if (!newCategoryName.trim()) {
      setCreateError('Category name is required');
      return;
    }

    try {
      updateCategory(editingCategory.id, {
        name: newCategoryName.trim(),
        parentId: newCategoryParentId,
        requiredAttributeIds: requiredAttributeIds,
        variantAttributeIds: variantAttributeIds,
      });

      setShowEditDrawer(false);
      setEditingCategory(null);
      setNewCategoryName('');
      setNewCategoryParentId(null);
      setRequiredAttributeIds([]);
      setVariantAttributeIds([]);
    } catch (error: any) {
      setCreateError(error?.message || 'Failed to update category');
    }
  };

  // Build category tree
  const categoryTree = useMemo(() => {
    const rootCategories = categories.filter(c => c.parentId === null);
    
    const buildTree = (parentId: number | null): Category[] => {
      return categories
        .filter(c => c.parentId === parentId)
        .map(category => ({
          ...category,
          children: buildTree(category.id)
        }));
    };

    return buildTree(null);
  }, [categories]);

  // Filter categories by search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categoryTree;

    const matchesSearch = (category: Category): boolean => {
      const nameMatch = getText(category.name).toLowerCase().includes(searchQuery.toLowerCase());
      const childrenMatch = category.children?.some(matchesSearch) || false;
      return nameMatch || childrenMatch;
    };

    const filterTree = (cats: Category[]): Category[] => {
      return cats
        .filter(matchesSearch)
        .map(cat => ({
          ...cat,
          children: cat.children ? filterTree(cat.children) : null
        }));
    };

    return filterTree(categoryTree);
  }, [categoryTree, searchQuery, getText]);

  // Toggle expand/collapse
  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Expand all
  const expandAll = () => {
    const allIds = new Set<number>();
    const addIds = (cats: Category[]) => {
      cats.forEach(cat => {
        if (cat.children && cat.children.length > 0) {
          allIds.add(cat.id);
          addIds(cat.children);
        }
      });
    };
    addIds(filteredCategories);
    setExpandedCategories(allIds);
  };

  // Collapse all
  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Get product count for a category
  const getProductCount = (categoryId: number): number => {
    return products.filter(p => p.categoryId === categoryId).length;
  };

  // Render category row
  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const productCount = getProductCount(category.id);

    return (
      <div key={category.id}>
        {/* Category Row */}
        <div
          className="flex items-center gap-3 py-3 px-4 border-b border-[#EBEBEB] hover:bg-[#F7F7F7] transition-colors group"
          style={{ paddingLeft: `${(level * 32) + 16}px` }}
        >
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              hasChildren && toggleCategory(category.id);
            }}
            className={`flex-shrink-0 ${hasChildren ? 'text-[#5C5C5C] hover:text-[#171717]' : 'invisible'}`}
          >
            {hasChildren && (
              isExpanded ? (
                <ChevronDown size={20} />
              ) : (
                <ChevronRight size={20} />
              )
            )}
          </button>

          {/* Category Name */}
          <div
            className="flex-1 font-medium text-[#171717] cursor-pointer"
            onClick={() => navigate(`/categories/${category.id}`)}
          >
            {getText(category.name)}
            {productCount > 0 && (
              <span className="ml-2 text-sm text-[#5C5C5C] font-normal">
                ({productCount})
              </span>
            )}
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openEditDrawer(category);
                }}
            className="p-1.5 text-[#5C5C5C] hover:text-primary hover:bg-white rounded transition-colors"
                title="Edit"
              >
                <Edit size={16} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Handle delete
                  if (window.confirm(`Delete "${getText(category.name)}"?`)) {
                    // deleteCategory(category.id);
                  }
                }}
                className="p-1.5 text-[#5C5C5C] hover:text-red-600 hover:bg-white rounded transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && category.children && (
          <div>
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Action Button */}
      {canEdit && (
        <div className="flex items-center justify-end">
          <button
            onClick={openCreateDrawer}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Category
          </button>
        </div>
      )}

      {/* Create Category Drawer */}
      {showCreateDrawer && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeCreateDrawer}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-[#171717]">Create Category</h2>
              <button
                onClick={closeCreateDrawer}
                className="p-2 text-[#5C5C5C] hover:text-[#171717] hover:bg-[#F7F7F7] rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="label">Category Name *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input"
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <CategoryPicker
                  categories={categories}
                  selectedCategoryId={newCategoryParentId}
                  onSelect={(categoryId) => setNewCategoryParentId(categoryId === 0 ? null : categoryId)}
                  label="Parent Category"
                  required={false}
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label">Category Attributes</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttributePicker(!showAttributePicker)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add Attribute
                      </button>
                      
                      {/* Attribute Picker Dropdown */}
                      {showAttributePicker && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowAttributePicker(false)}
                          />
                          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#EBEBEB] z-50 max-h-96 overflow-hidden">
                            <div className="p-3 border-b border-[#EBEBEB]">
                              <input
                                type="text"
                                value={attributeSearchQuery}
                                onChange={(e) => setAttributeSearchQuery(e.target.value)}
                                placeholder="Search attributes..."
                                className="input text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                              {availableAttributes.length === 0 ? (
                                <p className="text-sm text-[#5C5C5C] text-center py-4">
                                  {attributeSearchQuery ? 'No attributes found' : 'All attributes added'}
                                </p>
                              ) : (
                                availableAttributes.map((attr) => (
                                  <button
                                    key={attr.id}
                                    type="button"
                                    onClick={() => handleAddAttribute(attr.id)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] rounded-lg transition-colors text-sm"
                                  >
                                    {getText(attr.name)}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 border border-[#EBEBEB] rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {selectedAttributeIds.length === 0 ? (
                      <p className="text-sm text-[#5C5C5C] text-center py-4">No attributes added. Click "Add Attribute" to get started.</p>
                    ) : (
                      selectedAttributeIds.map((attrId) => {
                        const attr = attributes.find(a => a.id === attrId);
                        if (!attr) return null;
                        return (
                          <div key={attr.id} className="flex items-center justify-between py-2 px-3 hover:bg-[#F7F7F7] rounded-lg transition-colors group">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveAttribute(attr.id)}
                                className="text-[#5C5C5C] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove attribute"
                              >
                                <Trash2 size={14} />
                              </button>
                              <span className="text-sm font-medium text-[#171717]">{getText(attr.name)}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={requiredAttributeIds.includes(attr.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setRequiredAttributeIds([...requiredAttributeIds, attr.id]);
                                    } else {
                                      setRequiredAttributeIds(requiredAttributeIds.filter(id => id !== attr.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <span className="text-sm text-[#5C5C5C]">Required</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={variantAttributeIds.includes(attr.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setVariantAttributeIds([...variantAttributeIds, attr.id]);
                                    } else {
                                      setVariantAttributeIds(variantAttributeIds.filter(id => id !== attr.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <span className="text-sm text-[#5C5C5C]">Variant</span>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {createError && (
                  <p className="text-sm text-red-600">{createError}</p>
                )}

                <div className="flex items-center gap-2 sticky bottom-0 bg-white border-t border-[#EBEBEB] py-4 -mx-6 px-6 mt-6">
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={closeCreateDrawer}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Category Drawer */}
      {showEditDrawer && editingCategory && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeEditDrawer}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-[#171717]">Edit Category</h2>
              <button
                onClick={closeEditDrawer}
                className="p-2 text-[#5C5C5C] hover:text-[#171717] hover:bg-[#F7F7F7] rounded-lg transition-colors"
              >
                <span className="sr-only">Close</span>
                ×
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="label">Category Name *</label>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    className="input"
                    placeholder="Enter category name"
                    required
                  />
                </div>

                <CategoryPicker
                  categories={categories.filter((category) => category.id !== editingCategory.id)}
                  selectedCategoryId={newCategoryParentId}
                  onSelect={(categoryId) => setNewCategoryParentId(categoryId === 0 ? null : categoryId)}
                  label="Parent Category"
                  required={false}
                />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label">Category Attributes</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowAttributePicker(!showAttributePicker)}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Add Attribute
                      </button>
                      
                      {/* Attribute Picker Dropdown */}
                      {showAttributePicker && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setShowAttributePicker(false)}
                          />
                          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#EBEBEB] z-50 max-h-96 overflow-hidden">
                            <div className="p-3 border-b border-[#EBEBEB]">
                              <input
                                type="text"
                                value={attributeSearchQuery}
                                onChange={(e) => setAttributeSearchQuery(e.target.value)}
                                placeholder="Search attributes..."
                                className="input text-sm"
                                autoFocus
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto p-2">
                              {availableAttributes.length === 0 ? (
                                <p className="text-sm text-[#5C5C5C] text-center py-4">
                                  {attributeSearchQuery ? 'No attributes found' : 'All attributes added'}
                                </p>
                              ) : (
                                availableAttributes.map((attr) => (
                                  <button
                                    key={attr.id}
                                    type="button"
                                    onClick={() => handleAddAttribute(attr.id)}
                                    className="w-full text-left px-3 py-2 hover:bg-[#F7F7F7] rounded-lg transition-colors text-sm"
                                  >
                                    {getText(attr.name)}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 border border-[#EBEBEB] rounded-lg p-4 max-h-[300px] overflow-y-auto">
                    {selectedAttributeIds.length === 0 ? (
                      <p className="text-sm text-[#5C5C5C] text-center py-4">No attributes added. Click "Add Attribute" to get started.</p>
                    ) : (
                      selectedAttributeIds.map((attrId) => {
                        const attr = attributes.find(a => a.id === attrId);
                        if (!attr) return null;
                        return (
                          <div key={attr.id} className="flex items-center justify-between py-2 px-3 hover:bg-[#F7F7F7] rounded-lg transition-colors group">
                            <div className="flex items-center gap-2 flex-1">
                              <button
                                type="button"
                                onClick={() => handleRemoveAttribute(attr.id)}
                                className="text-[#5C5C5C] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove attribute"
                              >
                                <Trash2 size={14} />
                              </button>
                              <span className="text-sm font-medium text-[#171717]">{getText(attr.name)}</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={requiredAttributeIds.includes(attr.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setRequiredAttributeIds([...requiredAttributeIds, attr.id]);
                                    } else {
                                      setRequiredAttributeIds(requiredAttributeIds.filter(id => id !== attr.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <span className="text-sm text-[#5C5C5C]">Required</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={variantAttributeIds.includes(attr.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setVariantAttributeIds([...variantAttributeIds, attr.id]);
                                    } else {
                                      setVariantAttributeIds(variantAttributeIds.filter(id => id !== attr.id));
                                    }
                                  }}
                                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <span className="text-sm text-[#5C5C5C]">Variant</span>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {createError && (
                  <p className="text-sm text-red-600">{createError}</p>
                )}

                <div className="flex items-center gap-2 sticky bottom-0 bg-white border-t border-[#EBEBEB] py-4 -mx-6 px-6 mt-6">
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={closeEditDrawer}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={collapseAll}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <ChevronsUp size={16} />
            Collapse All
          </button>
          <button
            onClick={expandAll}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <ChevronsDown size={16} />
            Expand All
          </button>
        </div>

        {/* Search */}
        <div className="relative w-80">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A4A4A4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Category"
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Categories List */}
      <div className="card">
        <div className="border-b border-[#EBEBEB] bg-[#F7F7F7]">
          <div className="flex items-center gap-3 py-3 px-4">
            <div className="w-5"></div>
            <div className="flex-1 font-semibold text-[#171717] text-sm">
              Category Name
            </div>
          </div>
        </div>

        {filteredCategories.length > 0 ? (
          <div>
            {filteredCategories.map(category => renderCategory(category))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-[#5C5C5C]">
              {searchQuery ? 'No categories found matching your search' : 'No categories yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPageNew;

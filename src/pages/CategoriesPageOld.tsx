import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, FolderTree, ChevronRight, ChevronDown, Tags, X, Search, ArrowUp, ArrowDown, Move, AlertTriangle, Eye, Filter, ChevronsDown, ChevronsUp, Info } from 'lucide-react';
import Pagination from '../components/Pagination';
import type { Category } from '../types';

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, createCategory, updateCategory, deleteCategory, attributes, updateAttribute, products } = useData();
  const { hasPermission, currentUser } = useAuth();

  // Check URL parameters for edit/create actions
  const editId = searchParams.get('edit');
  const createParam = searchParams.get('create');
  const parentIdParam = searchParams.get('parentId');

  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState<string>('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [requiredAttributeIds, setRequiredAttributeIds] = useState<number[]>([]);
  const [variantAttributeIds, setVariantAttributeIds] = useState<number[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [managingAttributes, setManagingAttributes] = useState<Category | null>(null);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<number[]>([]);
  const [attributeSearchQuery, setAttributeSearchQuery] = useState('');
  const [movingCategory, setMovingCategory] = useState<Category | null>(null);
  const [newParentId, setNewParentId] = useState<number | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Attribute search for attributes (FR-6.1, FR-6.2, FR-6.3)
  const [requiredAttrSearch, setRequiredAttrSearch] = useState('');

  // Search, filter, sort, pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'productCount' | 'level' | 'createdAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(50);
  
  // Filters (FR-1.4)
  const [filterLevel, setFilterLevel] = useState<number | 'all'>('all');
  const [filterProductCount, setFilterProductCount] = useState<'all' | 'hasProducts' | 'empty'>('all');
  const [filterParent, setFilterParent] = useState<number | null | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const canEdit = currentUser?.role === 'admin' || hasPermission('categories', 'edit');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setSuccessMessage(null);

    // Validation: Required fields (FR-2.1, FR-2.2)
    const errors: Record<string, string> = {};
    
    if (!name.trim()) {
      errors.name = 'Category name is required';
    }

    // Note: Parent validation is handled by the form state
    // If parentId is set (from Create Subcategory button), it's required and disabled
    // If parentId is null (from Create Category button), it's optional for root category

    // Validation: Attributes must exist in the system (FR-2.1, FR-2.2)
    const invalidRequiredAttrs = requiredAttributeIds.filter(id => !attributes.some(a => a.id === id));
    const invalidVariantAttrs = variantAttributeIds.filter(id => !attributes.some(a => a.id === id));
    
    if (invalidRequiredAttrs.length > 0) {
      errors.requiredAttributes = `Some required attributes no longer exist in the system`;
    }
    if (invalidVariantAttrs.length > 0) {
      errors.variantAttributes = `Some variant attributes no longer exist in the system`;
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      // Calculate level and path based on parent
      const parentCategory = parentId ? categories.find(c => c.id === parentId) : null;
      const level = parentCategory ? parentCategory.level + 1 : 0;
      const path = parentCategory ? `${parentCategory.path}/${name}` : name;

      const categoryData = {
        name,
        parentId,
        level,
        path,
        productCount: editingCategory?.productCount || 0,
        children: null,
        requiredAttributeIds,
        variantAttributeIds,
        channelMappings: editingCategory?.channelMappings || {},
      };

      if (editingCategory) {
        // Check if name changed (FR-3.1: Editing name updates all product references)
        const nameChanged = editingCategory.name !== name;
        const requiredAttrsChanged = JSON.stringify(editingCategory.requiredAttributeIds?.sort()) !== JSON.stringify(requiredAttributeIds.sort());
        const variantAttrsChanged = JSON.stringify(editingCategory.variantAttributeIds?.sort()) !== JSON.stringify(variantAttributeIds.sort());
        
        updateCategory(editingCategory.id, categoryData);
        
        let updateMessage = `Category "${name}" updated successfully`;
        const impacts: string[] = [];
        
        if (nameChanged) {
          impacts.push('category name');
        }
        if (requiredAttrsChanged) {
          impacts.push('required attributes (affects product validation)');
        }
        if (variantAttrsChanged) {
          impacts.push('variant attributes (affects variant creation)');
        }
        
        if (impacts.length > 0) {
          updateMessage += `. Changes to ${impacts.join(', ')} will affect products in this category.`;
        }
        
        setSuccessMessage(updateMessage);
        
        // Note: Category ID remains unchanged (FR-3.1 business rule)
        // Product references are maintained via categoryId, not name
      } else {
        createCategory(categoryData);
        const categoryType = parentId ? 'subcategory' : 'root category';
        setSuccessMessage(`${categoryType.charAt(0).toUpperCase() + categoryType.slice(1)} "${name}" created successfully`);
        
        // Auto-expand parent category if creating subcategory (FR-2.2)
        if (parentId) {
          const newExpanded = new Set(expandedCategories);
          newExpanded.add(parentId);
          setExpandedCategories(newExpanded);
        }
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while saving the category';
      setFormErrors({ submit: errorMessage });
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setName('');
    setParentId(null);
    setRequiredAttributeIds([]);
    setVariantAttributeIds([]);
    setFormErrors({});
    setSuccessMessage(null);
    setRequiredAttrSearch('');
  };

  const handleCreateSubcategory = (parentCategory: Category) => {
    setParentId(parentCategory.id);
    setName('');
    setRequiredAttributeIds([]);
    setVariantAttributeIds([]);
    setEditingCategory(null);
    setFormErrors({});
    setSuccessMessage(null);
    setShowForm(true);
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('[data-category-form]');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setParentId(category.parentId);
    setRequiredAttributeIds(category.requiredAttributeIds || []);
    setVariantAttributeIds(category.variantAttributeIds || []);
    setFormErrors({});
    setSuccessMessage(null);
    setShowForm(true);
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('[data-category-form]');
      formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleManageAttributes = (category: Category) => {
    setManagingAttributes(category);
    setAttributeSearchQuery('');
    // Get currently assigned attributes for this category
    const assignedAttributes = attributes.filter(attr => attr.categoryIds.includes(category.id));
    setSelectedAttributeIds(assignedAttributes.map(attr => attr.id));
  };

  const handleAttributeToggle = (attributeId: number) => {
    if (selectedAttributeIds.includes(attributeId)) {
      setSelectedAttributeIds(selectedAttributeIds.filter(id => id !== attributeId));
    } else {
      setSelectedAttributeIds([...selectedAttributeIds, attributeId]);
    }
  };

  const handleSaveAttributes = () => {
    if (!managingAttributes) return;

    // FR-3.1: Assign Attributes to Categories
    // Update all attributes to include/exclude this category
    let updatedCount = 0;
    attributes.forEach(attribute => {
      const shouldHaveCategory = selectedAttributeIds.includes(attribute.id);
      const currentlyHasCategory = attribute.categoryIds.includes(managingAttributes.id);

      if (shouldHaveCategory && !currentlyHasCategory) {
        // Add category to attribute
        updateAttribute(attribute.id, {
          ...attribute,
          categoryIds: [...attribute.categoryIds, managingAttributes.id]
        });
        updatedCount++;
      } else if (!shouldHaveCategory && currentlyHasCategory) {
        // Remove category from attribute
        updateAttribute(attribute.id, {
          ...attribute,
          categoryIds: attribute.categoryIds.filter(id => id !== managingAttributes.id)
        });
        updatedCount++;
      }
    });

    // Show success message
    if (updatedCount > 0) {
      setSuccessMessage(
        `Successfully ${selectedAttributeIds.length > 0 ? 'assigned' : 'removed'} ${selectedAttributeIds.length} attribute${selectedAttributeIds.length !== 1 ? 's' : ''} to category "${managingAttributes.name}". Products in this category will ${selectedAttributeIds.length > 0 ? 'inherit' : 'no longer have'} these attributes.`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    }

    setManagingAttributes(null);
    setSelectedAttributeIds([]);
    setAttributeSearchQuery('');
  };

  // Helper function to count all descendants recursively (FR-4.1)
  const getDescendantCount = (categoryId: number): number => {
    let count = 0;
    const children = categories.filter(c => c.parentId === categoryId);
    children.forEach(child => {
      count += 1 + getDescendantCount(child.id);
    });
    return count;
  };

  // Helper function to get all descendant IDs recursively (FR-4.1)
  const getAllDescendantIds = (categoryId: number): number[] => {
    const ids: number[] = [];
    const children = categories.filter(c => c.parentId === categoryId);
    children.forEach(child => {
      ids.push(child.id);
      ids.push(...getAllDescendantIds(child.id));
    });
    return ids;
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleConfirmDelete = () => {
    if (!deletingCategory) return;

    // Check for products assigned to this category (FR-4.1: Cannot delete category with products)
    const productsInCategory = products.filter(p => p.categoryId === deletingCategory.id);
    
    // Check for products in all descendant categories
    const descendantIds = getAllDescendantIds(deletingCategory.id);
    const productsInDescendants = products.filter(p => 
      descendantIds.includes(p.categoryId)
    );
    const totalProductsAffected = productsInCategory.length + productsInDescendants.length;

    if (totalProductsAffected > 0) {
      alert(
        `Cannot delete category "${deletingCategory.name}" because it has ${totalProductsAffected} product(s) assigned to it or its descendant categories.\n\n` +
        `Please reassign the products first before deleting.`
      );
      setDeletingCategory(null);
      return;
    }

    // Get descendant count (FR-4.1: Deleting category deletes all descendants)
    const descendantCount = getDescendantCount(deletingCategory.id);

    try {
      deleteCategory(deletingCategory.id);
      
      // Success feedback
      const categoryName = deletingCategory.name;
      if (descendantCount > 0) {
        setSuccessMessage(
          `Category "${categoryName}" and ${descendantCount} descendant categor${descendantCount === 1 ? 'y' : 'ies'} deleted successfully.`
        );
      } else {
        setSuccessMessage(`Category "${categoryName}" deleted successfully.`);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      setDeletingCategory(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred while deleting the category');
    }
  };

  const handleMove = (category: Category) => {
    setMovingCategory(category);
    setNewParentId(category.parentId);
  };

  const handleSaveMove = () => {
    if (!movingCategory) return;

    // Validation: Cannot move category to its own descendant (FR-3.2)
    const isDescendant = (categoryId: number, potentialParentId: number | null): boolean => {
      if (potentialParentId === null) return false;
      if (categoryId === potentialParentId) return true;

      const parent = categories.find(c => c.id === potentialParentId);
      if (!parent || parent.parentId === null) return false;

      return isDescendant(categoryId, parent.parentId);
    };

    if (newParentId !== null && isDescendant(movingCategory.id, newParentId)) {
      alert('Cannot move a category to its own descendant (circular reference prevented).');
      return;
    }

    // Validation: New parent must exist (FR-3.2)
    if (newParentId !== null) {
      const newParent = categories.find(c => c.id === newParentId);
      if (!newParent) {
        alert('Selected parent category does not exist.');
        return;
      }
    }

    // Get descendant count (FR-3.2: Moving category moves all descendants)
    const descendantCount = getDescendantCount(movingCategory.id);
    const productsInCategory = products.filter(p => p.categoryId === movingCategory.id).length;

    // Show confirmation with impact information
      let confirmMessage = `Move category "${movingCategory.name}"?\n\n`;
    
    if (newParentId === null) {
      confirmMessage += `This will move it to root level.\n`;
    } else {
      const newParent = categories.find(c => c.id === newParentId);
      confirmMessage += `New parent: "${newParent?.name || 'Root'}\n`;
    }
    
    if (descendantCount > 0) {
      confirmMessage += `\nThis will also move ${descendantCount} descendant categor${descendantCount === 1 ? 'y' : 'ies'}.\n`;
    }
    
    if (productsInCategory > 0) {
      confirmMessage += `\n${productsInCategory} product${productsInCategory === 1 ? '' : 's'} in this category will maintain their category assignment.`;
    }

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      // Update category with new parent (FR-3.2: Moving category moves all descendants)
      // The DataContext updateCategory function handles updating all descendants' paths and levels
      updateCategory(movingCategory.id, {
        parentId: newParentId,
      });

      // Success feedback
      const newParent = newParentId ? categories.find(c => c.id === newParentId) : null;
      const successMsg = newParentId
        ? `Category "${movingCategory.name}" moved under "${newParent?.name || 'Root'}"`
        : `Category "${movingCategory.name}" moved to root level`;
      
      if (descendantCount > 0) {
        setSuccessMessage(`${successMsg}. ${descendantCount} descendant categor${descendantCount === 1 ? 'y' : 'ies'} also moved.`);
      } else {
        setSuccessMessage(successMsg);
      }

      // Auto-expand new parent if moved under a parent
      if (newParentId) {
        const newExpanded = new Set(expandedCategories);
        newExpanded.add(newParentId);
        setExpandedCategories(newExpanded);
      }

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

      // Reset state
      setMovingCategory(null);
      setNewParentId(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'An error occurred while moving the category');
    }
  };

  const toggleExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  // Expand all / Collapse all (FR-1.2)
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

  // Helper function to highlight search matches
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

  const renderCategoryTree = (cats: Category[], level: number = 0) => {
    return cats.map((category) => {
      const hasChildren = category.children && category.children.length > 0;
      const isExpanded = expandedCategories.has(category.id);
      const categoryName = category.name;
      const categoryPath = category.path;

      return (
        <div key={category.id} style={{ marginLeft: `${level * 24}px` }}>
          <div className={`flex items-center justify-between py-2 px-4 hover:bg-[#F7F7F7] rounded-lg group ${searchQuery && (categoryName.toLowerCase().includes(searchQuery.toLowerCase()) || categoryPath.toLowerCase().includes(searchQuery.toLowerCase())) ? 'bg-yellow-50' : ''}`}>
            <div className="flex items-center gap-2 flex-1">
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(category.id)}
                  className="p-1 hover:bg-[#F7F7F7] rounded"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <div className="w-6" />
              )}
              <FolderTree size={18} className="text-[#A4A4A4]" />
              <button
                onClick={() => navigate(`/categories/${category.id}`)}
                className="font-medium text-[#171717] hover:text-primary transition-colors text-left"
              >
                {searchQuery ? highlightSearchMatch(categoryName, searchQuery) : categoryName}
              </button>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => navigate(`/categories/${category.id}`)}
                className="p-1 text-[#5C5C5C] hover:text-blue-600 rounded"
                title="View Details"
              >
                <Eye size={16} />
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1 text-[#5C5C5C] hover:text-primary rounded"
                    title="Edit Category"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(category)}
                    className="p-1 text-[#5C5C5C] hover:text-red-600 rounded"
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
          {hasChildren && isExpanded && renderCategoryTree(category.children!, level + 1)}
        </div>
      );
    });
  };

  // Filter and sort categories (FR-1.3, FR-1.4, FR-1.5)
  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories.filter((category) => {
      // Search filter (FR-1.3: includes path search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = category.name.toLowerCase();
        const path = category.path.toLowerCase();
        if (!name.includes(query) && !path.includes(query)) {
          return false;
        }
      }

      // Level filter (FR-1.4)
      if (filterLevel !== 'all' && category.level !== filterLevel) {
        return false;
      }

      // Product count filter (FR-1.4)
      if (filterProductCount === 'hasProducts' && category.productCount === 0) {
        return false;
      }
      if (filterProductCount === 'empty' && category.productCount > 0) {
        return false;
      }

      // Parent filter (FR-1.4)
      if (filterParent !== 'all') {
        if (filterParent === null && category.parentId !== null) {
          return false;
        }
        if (filterParent !== null && category.parentId !== filterParent) {
          return false;
        }
      }


      return true;
    });

    // Sort (FR-1.5: includes created date)
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'productCount':
          aValue = a.productCount;
          bValue = b.productCount;
          break;
        case 'level':
          aValue = a.level;
          bValue = b.level;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [categories, searchQuery, sortBy, sortOrder, filterLevel, filterProductCount, filterParent]);

  // Pagination (FR-1.6)
  const totalPages = itemsPerPage === 'all' 
    ? 1 
    : Math.ceil(filteredAndSortedCategories.length / itemsPerPage);
  const startIndex = itemsPerPage === 'all' ? 0 : (currentPage - 1) * itemsPerPage;
  const endIndex = itemsPerPage === 'all' 
    ? filteredAndSortedCategories.length 
    : startIndex + itemsPerPage;
  const paginatedCategories = filteredAndSortedCategories.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterLevel, filterProductCount, filterParent]);

  // Handle URL parameters for edit/create
  useEffect(() => {
    if (editId) {
      const categoryToEdit = categories.find(c => c.id === parseInt(editId));
      if (categoryToEdit && !editingCategory) {
        setEditingCategory(categoryToEdit);
        setName(typeof categoryToEdit.name === 'string' ? categoryToEdit.name : String(categoryToEdit.name));
        setParentId(categoryToEdit.parentId);
        setRequiredAttributeIds(categoryToEdit.requiredAttributeIds || []);
        setVariantAttributeIds(categoryToEdit.variantAttributeIds || []);
        setShowForm(true);
        setSearchParams({}); // Clear URL params
      }
    } else if (createParam === 'true' && !showForm) {
      setShowForm(true);
      if (parentIdParam) {
        setParentId(parseInt(parentIdParam));
      }
      setSearchParams({}); // Clear URL params
    }
  }, [editId, createParam, parentIdParam]);

  // Build tree from filtered categories
  const buildFilteredTree = (cats: Category[]): Category[] => {
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

  const categoryTree = buildFilteredTree(paginatedCategories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[#5C5C5C]">
            {filteredAndSortedCategories.length} categories
            {typeof itemsPerPage === 'number' && filteredAndSortedCategories.length > itemsPerPage && (
              <span className="ml-2 text-[#5C5C5C]">
                (Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedCategories.length)})
              </span>
            )}
          </p>
        </div>
        {canEdit && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Category
          </button>
        )}
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="card p-4 bg-green-50 border border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <p className="font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-6" data-category-form>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#171717]">
                {editingCategory 
                  ? 'Edit Category' 
                  : parentId
                    ? 'Create Subcategory'
                    : 'New Category'}
              </h2>
              {parentId && !editingCategory && (
                <p className="text-sm text-[#5C5C5C] mt-1">
                  Parent: <span className="font-medium">{categories.find(c => c.id === parentId)?.name || 'Root'}</span>
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={resetForm}
              className="p-2 text-[#A4A4A4] hover:text-[#5C5C5C] rounded-lg hover:bg-white"
            >
              <X size={20} />
            </button>
          </div>
          
          {formErrors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{formErrors.submit}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formErrors.name) {
                    const newErrors = { ...formErrors };
                    delete newErrors.name;
                    setFormErrors(newErrors);
                  }
                }}
                className={`input ${formErrors.name ? 'border-red-500' : ''}`}
                placeholder="Category Name"
                required
              />
              {formErrors.name && (
                <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="label">
                Parent Category
                {!editingCategory && parentId && (
                  <span className="text-xs text-[#5C5C5C] ml-2">(Required for subcategory)</span>
                )}
              </label>
              <select
                value={parentId || ''}
                onChange={(e) => {
                  setParentId(e.target.value ? parseInt(e.target.value) : null);
                  if (formErrors.parent) {
                    const newErrors = { ...formErrors };
                    delete newErrors.parent;
                    setFormErrors(newErrors);
                  }
                }}
                className="input"
                disabled={!editingCategory && parentId !== null} // Disable if creating subcategory
              >
                <option value="">Root Category (No Parent)</option>
                {categories
                  .filter((c) => {
                    // Filter out the category being edited and its descendants
                    if (editingCategory && c.id === editingCategory.id) return false;
                    if (editingCategory) {
                      // Check if c is a descendant of editingCategory
                      const isDescendant = (catId: number, potentialParentId: number): boolean => {
                        const cat = categories.find(c => c.id === catId);
                        if (!cat || cat.parentId === null) return false;
                        if (cat.parentId === potentialParentId) return true;
                        return isDescendant(cat.parentId, potentialParentId);
                      };
                      if (isDescendant(c.id, editingCategory.id)) return false;
                    }
                    return true;
                  })
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} {category.parentId !== null ? `(${category.path})` : ''}
                    </option>
                  ))}
              </select>
              {formErrors.parent && (
                <p className="text-sm text-red-600 mt-1">{formErrors.parent}</p>
              )}
              {!editingCategory && parentId && (
                <p className="text-xs text-[#5C5C5C] mt-1">
                  Creating subcategory under: <span className="font-medium">{categories.find(c => c.id === parentId)?.name || 'Root'}</span>
                </p>
              )}
            </div>

            {/* Attributes Section (FR-6.3) */}
            <div className="border-t border-[#EBEBEB] pt-4 mt-4">
              <div className="mb-4">
                <h3 className="text-md font-semibold text-[#171717] mb-2">Category Attributes</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What are these?</p>
                      <ul className="text-xs space-y-1 list-disc list-inside">
                        <li><strong>Required:</strong> These attributes must be filled when creating products in this category</li>
                        <li><strong>Variant:</strong> These attributes can vary between product variants (e.g., Size, Color)</li>
                        <li>An attribute can be both required and variant</li>
                      </ul>
                    </div>
                  </div>
                </div>
                {editingCategory && (
                  <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200 mb-3">
                    <AlertTriangle size={12} className="inline mr-1" />
                    Changes will affect product validation and variant creation for this category
                  </div>
                )}
                {formErrors.requiredAttributes && (
                  <p className="text-sm text-red-600 mb-2">{formErrors.requiredAttributes}</p>
                )}
                {formErrors.variantAttributes && (
                  <p className="text-sm text-red-600 mb-2">{formErrors.variantAttributes}</p>
                )}
              </div>

              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
                  <input
                    type="text"
                    value={requiredAttrSearch}
                    onChange={(e) => setRequiredAttrSearch(e.target.value)}
                    placeholder="Search attributes..."
                    className="input pl-9"
                  />
                </div>
              </div>

              {/* Attributes List */}
              <div className="border border-[#EBEBEB] rounded-lg max-h-96 overflow-y-auto">
                {attributes.length === 0 ? (
                  <div className="p-8 text-center text-[#5C5C5C]">
                    <Tags size={32} className="mx-auto mb-2 text-[#A4A4A4]" />
                    <p className="text-sm">No attributes available. Create attributes first.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {attributes
                      .filter(attr => {
                        if (!requiredAttrSearch) return true;
                        const query = requiredAttrSearch.toLowerCase();
                        const name = attr.name.toLowerCase();
                        const type = (attr.type || '').toLowerCase();
                        return name.includes(query) || type.includes(query);
                      })
                      .map((attr) => {
                        const isRequired = requiredAttributeIds.includes(attr.id);
                        const isVariant = variantAttributeIds.includes(attr.id);
                        return (
                          <div
                            key={attr.id}
                            className="p-4 hover:bg-[#F7F7F7] transition-colors"
                          >
                            <div className="flex items-start gap-4">
                              {/* Attribute Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-[#171717]">{attr.name}</span>
                                </div>
                              </div>

                              {/* Checkboxes */}
                              <div className="flex items-center gap-6">
                                {/* Required Checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isRequired}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setRequiredAttributeIds([...requiredAttributeIds, attr.id]);
                                      } else {
                                        setRequiredAttributeIds(requiredAttributeIds.filter(id => id !== attr.id));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-[#EBEBEB] text-red-600 focus:ring-red-500"
                                  />
                                  <span className={`text-sm font-medium ${isRequired ? 'text-red-700' : 'text-[#5C5C5C] group-hover:text-red-600'}`}>
                                    Required
                                  </span>
                                </label>

                                {/* Variant Checkbox */}
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isVariant}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setVariantAttributeIds([...variantAttributeIds, attr.id]);
                                      } else {
                                        setVariantAttributeIds(variantAttributeIds.filter(id => id !== attr.id));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-[#EBEBEB] text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className={`text-sm font-medium ${isVariant ? 'text-blue-700' : 'text-[#5C5C5C] group-hover:text-blue-600'}`}>
                                    Variant
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {attributes.filter(attr => {
                      if (!requiredAttrSearch) return true;
                      const query = requiredAttrSearch.toLowerCase();
                      const name = attr.name.toLowerCase();
                      const type = (attr.type || '').toLowerCase();
                      return name.includes(query) || type.includes(query);
                    }).length === 0 && (
                      <div className="p-8 text-center text-[#5C5C5C]">
                        <Search size={32} className="mx-auto mb-2 text-[#A4A4A4]" />
                        <p className="text-sm">No attributes match your search</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Move Category Modal */}
      {movingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#171717]">
                    Move Category (FR-3.2)
                  </h2>
                  <p className="text-sm text-[#5C5C5C] mt-1">
                    Moving: <span className="font-medium">"{movingCategory.name}"</span>
                  </p>
                  <p className="text-xs text-[#5C5C5C] mt-1">
                    Current path: {movingCategory.path}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setMovingCategory(null);
                    setNewParentId(null);
                  }}
                  className="p-2 text-[#A4A4A4] hover:text-[#5C5C5C] rounded-lg hover:bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <label className="label">New Parent Category</label>
                <select
                  value={newParentId || ''}
                  onChange={(e) => setNewParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="input"
                >
                  <option value="">Root Category (No Parent)</option>
                  {categories
                    .filter((c) => {
                      // Filter out the category itself and its descendants (FR-3.2: Cannot move to own descendant)
                      if (c.id === movingCategory.id) return false;

                      // Check if this category is a descendant of the moving category
                      const isDescendant = (categoryId: number, potentialDescendant: Category): boolean => {
                        if (potentialDescendant.parentId === null) return false;
                        if (potentialDescendant.parentId === categoryId) return true;
                        const parent = categories.find(cat => cat.id === potentialDescendant.parentId);
                        return parent ? isDescendant(categoryId, parent) : false;
                      };

                      return !isDescendant(movingCategory.id, c);
                    })
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name} {category.parentId ? `(${category.path})` : ''}
                      </option>
                    ))}
                </select>
                
                {/* Impact Information */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-blue-800">
                      <p className="font-medium mb-1">Impact of this move:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>All descendant categories will be moved with this category</li>
                        <li>Products will maintain their category assignment (categoryId unchanged)</li>
                        <li>Category paths will be automatically updated</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setMovingCategory(null);
                    setNewParentId(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMove}
                  className="btn btn-primary"
                >
                  Move Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Modal (FR-4.1) */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#171717] flex items-center gap-2">
                    <Trash2 size={20} className="text-red-600" />
                    Delete Category
                  </h2>
                  <p className="text-sm text-[#5C5C5C] mt-1">
                    Category: <span className="font-medium">"{deletingCategory.name}"</span>
                  </p>
                  <p className="text-xs text-[#5C5C5C] mt-1">
                    Path: {deletingCategory.path}
                  </p>
                </div>
                <button
                  onClick={() => setDeletingCategory(null)}
                  className="p-2 text-[#A4A4A4] hover:text-[#5C5C5C] rounded-lg hover:bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Validation Checks */}
              {(() => {
                const productsInCategory = products.filter(p => p.categoryId === deletingCategory.id);
                const descendantIds = getAllDescendantIds(deletingCategory.id);
                const productsInDescendants = products.filter(p => descendantIds.includes(p.categoryId));
                const totalProductsAffected = productsInCategory.length + productsInDescendants.length;
                const descendantCount = getDescendantCount(deletingCategory.id);

                if (totalProductsAffected > 0) {
                  return (
                    <div className="mb-6">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm text-red-800">
                            <p className="font-medium mb-2">Cannot delete this category</p>
                            <p className="mb-2">
                              This category has <strong>{totalProductsAffected}</strong> product{totalProductsAffected !== 1 ? 's' : ''} assigned to it or its descendant categories.
                            </p>
                            <p className="text-xs">
                              Please reassign all products to other categories before deleting.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => setDeletingCategory(null)}
                          className="btn btn-secondary"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="mb-6">
                    {/* Warning Information */}
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800">
                          <p className="font-medium mb-2">Warning: This action cannot be undone</p>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>This category will be permanently deleted</li>
                            {descendantCount > 0 && (
                              <li>
                                <strong>{descendantCount}</strong> descendant categor{descendantCount === 1 ? 'y' : 'ies'} will also be deleted
                              </li>
                            )}
                            <li>All category data will be removed</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Impact Summary */}
                    <div className="p-3 bg-[#F7F7F7] border border-[#EBEBEB] rounded-lg">
                      <p className="text-sm font-medium text-[#171717] mb-2">What will be deleted:</p>
                      <ul className="text-xs text-[#5C5C5C] space-y-1">
                        <li>• Category: "{deletingCategory.name}"</li>
                        {descendantCount > 0 && (
                          <li>• {descendantCount} descendant categor{descendantCount === 1 ? 'y' : 'ies'}</li>
                        )}
                        <li>• All category attribute assignments</li>
                        <li>• All channel mappings for this category</li>
                      </ul>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              {(() => {
                const productsInCategory = products.filter(p => p.categoryId === deletingCategory.id);
                const descendantIds = getAllDescendantIds(deletingCategory.id);
                const productsInDescendants = products.filter(p => descendantIds.includes(p.categoryId));
                const totalProductsAffected = productsInCategory.length + productsInDescendants.length;

                if (totalProductsAffected === 0) {
                  return (
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setDeletingCategory(null)}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="btn btn-danger"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete Category
                      </button>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Manage Attributes Modal */}
      {managingAttributes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#171717]">
                    Manage Attributes for "{managingAttributes.name}"
                  </h2>
                  <p className="text-sm text-[#5C5C5C] mt-1">
                    Select which attributes should be available for products in this category. Products will inherit these attributes automatically.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setManagingAttributes(null);
                    setSelectedAttributeIds([]);
                    setAttributeSearchQuery('');
                  }}
                  className="p-2 text-[#A4A4A4] hover:text-[#5C5C5C] rounded-lg hover:bg-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Summary */}
              <div className="mb-4 p-3 bg-primary-light rounded-lg">
                <p className="text-sm text-[#5C5C5C]">
                  <span className="font-medium">{selectedAttributeIds.length}</span> attribute{selectedAttributeIds.length !== 1 ? 's' : ''} selected
                  {selectedAttributeIds.length > 0 && (
                    <span className="text-[#5C5C5C] ml-2">
                      ({attributes.filter(attr => selectedAttributeIds.includes(attr.id) && attr.required).length} required)
                    </span>
                  )}
                </p>
              </div>

              {/* Search */}
              <div className="mb-4 relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
                <input
                  type="text"
                  value={attributeSearchQuery}
                  onChange={(e) => setAttributeSearchQuery(e.target.value)}
                  placeholder="Search attributes..."
                  className="input pl-10"
                />
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {(() => {
                  const filteredAttributes = attributes.filter(attr => {
                    if (!attributeSearchQuery) return true;
                    const query = attributeSearchQuery.toLowerCase();
                    const name = attr.name.toLowerCase();
                    const attrType = (attr.attributeType || attr.type || 'freeText').toLowerCase();
                    const varType = (attr.attributeVariableType || 'string').toLowerCase();
                    return name.includes(query) || attrType.includes(query) || varType.includes(query);
                  });

                  if (filteredAttributes.length === 0) {
                    return (
                      <div className="text-center py-8 text-[#5C5C5C]">
                        <Tags size={48} className="mx-auto text-[#A4A4A4] mb-2" />
                        <p>
                          {attributes.length === 0
                            ? 'No attributes available. Create attributes first.'
                            : 'No attributes match your search.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredAttributes.map((attribute) => (
                    <label
                      key={attribute.id}
                      className="flex items-start gap-3 p-4 border border-[#EBEBEB] rounded-lg hover:bg-[#F7F7F7] cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAttributeIds.includes(attribute.id)}
                        onChange={() => handleAttributeToggle(attribute.id)}
                        className="mt-1 rounded border-[#EBEBEB] text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-[#171717]">
                            {attribute.name}
                          </span>
                          <span className="badge badge-info text-xs">
                            {attribute.attributeType || attribute.type || 'freeText'}
                          </span>
                          <span className="badge badge-secondary text-xs">
                            {attribute.attributeVariableType || 'string'}
                          </span>
                          {attribute.required && (
                            <span className="badge badge-warning text-xs">Required</span>
                          )}
                        </div>
                        {attribute.categoryIds.length > 0 && (
                          <p className="text-xs text-[#5C5C5C] mt-1">
                            Assigned to {attribute.categoryIds.length} {attribute.categoryIds.length === 1 ? 'category' : 'categories'}
                          </p>
                        )}
                      </div>
                    </label>
                  ));
                })()}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-[#EBEBEB]">
                <button
                  onClick={() => {
                    setManagingAttributes(null);
                    setSelectedAttributeIds([]);
                    setAttributeSearchQuery('');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAttributes}
                  className="btn btn-primary"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      {!showForm && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[#171717] mb-4">Categories</h2>
          {paginatedCategories.length === 0 ? (
            <div className="text-center py-12">
              <FolderTree size={48} className="mx-auto text-[#A4A4A4] mb-4" />
              <p className="text-[#5C5C5C]">No categories found</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">{renderCategoryTree(categoryTree)}</div>

              {/* Pagination */}
              {itemsPerPage !== 'all' && totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    onItemsPerPageChange={(value) => setItemsPerPage(value)}
                    itemsPerPageOptions={[25, 50, 100, 'all']}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
};

export default CategoriesPage;


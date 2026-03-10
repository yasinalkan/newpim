import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Plus, ChevronRight, ChevronDown, Trash2, Edit2, Search, Download, Upload, X, AlertTriangle } from 'lucide-react';
import type { ChannelCategory } from '../../../types';

interface ChannelCategoryManagementProps {
  selectedChannelId: string | null;
}

const ChannelCategoryManagement: React.FC<ChannelCategoryManagementProps> = ({ selectedChannelId }) => {
  const { 
    channels, 
    getChannelCategoryTree, 
    createChannelCategory, 
    updateChannelCategory,
    deleteChannelCategory,
    categoryMappings,
    channelCategories
  } = useData();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ChannelCategory | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const categoryTree = selectedChannelId ? getChannelCategoryTree(selectedChannelId) : [];
  
  // Flatten tree for search/filter
  const flattenTree = (tree: ChannelCategory[]): ChannelCategory[] => {
    const result: ChannelCategory[] = [];
    const traverse = (cats: ChannelCategory[]) => {
      cats.forEach(cat => {
        result.push(cat);
        if (cat.children && cat.children.length > 0) {
          traverse(cat.children);
        }
      });
    };
    traverse(tree);
    return result;
  };

  const allCategories = flattenTree(categoryTree);
  
  // Filtered categories
  const filteredCategories = useMemo(() => {
    let filtered = allCategories;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        cat.path.toLowerCase().includes(query) ||
        cat.id.toLowerCase().includes(query)
      );
    }
    
    if (levelFilter !== null) {
      filtered = filtered.filter(cat => cat.level === levelFilter);
    }
    
    return filtered;
  }, [allCategories, searchQuery, levelFilter]);

  // Check if category has dependencies
  const hasDependencies = (categoryId: string): { hasChildren: boolean; isMapped: boolean } => {
    const hasChildren = allCategories.some(cat => cat.parentId === categoryId);
    const isMapped = categoryMappings.some(m => 
      m.channelId === selectedChannelId && m.channelCategoryId === categoryId
    );
    return { hasChildren, isMapped };
  };

  const toggleExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !categoryName.trim()) {
      alert('Please select a channel and enter a category name');
      return;
    }

    const parentCategory = parentId ? allCategories.find(c => c.id === parentId) : null;
    const level = parentCategory ? parentCategory.level + 1 : 0;
    const path = parentCategory ? `${parentCategory.path} > ${categoryName.trim()}` : categoryName.trim();

    createChannelCategory(selectedChannelId, {
      channelId: selectedChannelId,
      name: categoryName.trim(),
      parentId: parentId,
      level,
      path,
      children: null,
    });

    setCategoryName('');
    setParentId(null);
    setShowAddForm(false);
  };

  const handleEditCategory = (category: ChannelCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setParentId(category.parentId);
    setShowAddForm(true);
  };

  const handleUpdateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !editingCategory || !categoryName.trim()) {
      return;
    }

    const parentCategory = parentId ? allCategories.find(c => c.id === parentId) : null;
    const level = parentCategory ? parentCategory.level + 1 : 0;
    const path = parentCategory ? `${parentCategory.path} > ${categoryName.trim()}` : categoryName.trim();

    updateChannelCategory(selectedChannelId, editingCategory.id, {
      name: categoryName.trim(),
      parentId: parentId,
      level,
      path,
    });

    setEditingCategory(null);
    setCategoryName('');
    setParentId(null);
    setShowAddForm(false);
  };

  const handleDeleteCategory = (category: ChannelCategory) => {
    const deps = hasDependencies(category.id);
    if (deps.hasChildren || deps.isMapped) {
      const warnings = [];
      if (deps.hasChildren) warnings.push('has child categories');
      if (deps.isMapped) warnings.push('is mapped to master categories');
      if (!window.confirm(`Cannot delete category "${category.name}". It ${warnings.join(' and ')}. Continue anyway?`)) {
        return;
      }
    }
    
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      deleteChannelCategory(category.channelId, category.id);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = allCategories.map(cat => ({
      Category_ID: cat.id,
      Category_Name: cat.name,
      Parent_Category_ID: cat.parentId || '',
      Level: cat.level,
      Path: cat.path,
    }));

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {});
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channel-categories-${selectedChannelId}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channel-categories-${selectedChannelId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    const text = await importFile.text();
    let data: any[] = [];

    try {
      if (importFormat === 'csv') {
        const lines = text.split('\n').filter(l => l.trim());
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] || '';
          });
          return obj;
        });
      } else {
        data = JSON.parse(text);
      }

      // Validate and import
      const errors: string[] = [];
      const imported: string[] = [];

      data.forEach((row, index) => {
        const name = row.Category_Name || row.name || '';
        const parentId = row.Parent_Category_ID || row.parentId || null;
        
        if (!name) {
          errors.push(`Row ${index + 1}: Missing category name`);
          return;
        }

        // Check if parent exists
        if (parentId && !allCategories.find(c => c.id === parentId)) {
          errors.push(`Row ${index + 1}: Parent category "${parentId}" not found`);
          return;
        }

        const parentCategory = parentId ? allCategories.find(c => c.id === parentId) : null;
        const level = parentCategory ? parentCategory.level + 1 : 0;
        const path = parentCategory ? `${parentCategory.path} > ${name}` : name;

        createChannelCategory(selectedChannelId!, {
          channelId: selectedChannelId!,
          name,
          parentId,
          level,
          path,
          children: null,
        });

        imported.push(name);
      });

      if (errors.length > 0) {
        alert(`Import completed with errors:\n${errors.join('\n')}\n\nImported: ${imported.length} categories`);
      } else {
        alert(`Successfully imported ${imported.length} categories`);
      }

      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      alert('Error importing file: ' + (error as Error).message);
    }
  };

  const renderCategory = (category: ChannelCategory, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);
    const deps = hasDependencies(category.id);

    return (
      <div key={category.id} className="ml-4">
        <div className="flex items-center gap-2 py-2 hover:bg-[#F7F7F7] rounded px-2">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(category.id)}
              className="p-1 hover:bg-[#F7F7F7] rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <span className="flex-1">{category.name}</span>
          <span className="text-xs text-[#5C5C5C]">Level {category.level}</span>
          {(deps.hasChildren || deps.isMapped) && (
            <AlertTriangle size={14} className="text-yellow-500" title="Has dependencies" />
          )}
          <button
            onClick={() => handleEditCategory(category)}
            className="p-1 text-[#5C5C5C] hover:text-blue-600"
            title="Edit category"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => {
              setParentId(category.id);
              setShowAddForm(true);
            }}
            className="p-1 text-[#5C5C5C] hover:text-primary"
            title="Add child category"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => handleDeleteCategory(category)}
            className="p-1 text-[#5C5C5C] hover:text-red-600"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!selectedChannelId) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#5C5C5C]">Please select a channel from the Channels tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#171717]">
            Category Structure: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Manage channel-specific category hierarchy
          </p>
        </div>
        {!showAddForm && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Upload size={18} />
              Import
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Export JSON
            </button>
            <button
              onClick={() => {
                setEditingCategory(null);
                setParentId(null);
                setShowAddForm(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Root Category
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A4A4A4]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="Search categories by name, path, or ID..."
            />
          </div>
          <div>
            <select
              value={levelFilter === null ? '' : levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === '' ? null : parseInt(e.target.value))}
              className="input"
            >
              <option value="">All Levels</option>
              {[0, 1, 2, 3, 4, 5].map(level => (
                <option key={level} value={level}>Level {level}</option>
              ))}
            </select>
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-[#5C5C5C]">
            Found {filteredCategories.length} category(ies)
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">{editingCategory ? 'Edit Category' : 'Add Category'}</h4>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingCategory(null);
                setCategoryName('');
                setParentId(null);
              }}
              className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C]"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
            <div>
              <label className="label">Category Name *</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="input"
                placeholder="Category name"
                required
              />
            </div>
            <div>
              <label className="label">Parent Category (optional)</label>
              <select
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value || null)}
                className="input"
              >
                <option value="">Root Category</option>
                {allCategories
                  .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.path}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingCategory ? 'Update' : 'Add'} Category
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingCategory(null);
                  setCategoryName('');
                  setParentId(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Import Categories</h4>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">Format</label>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as 'csv' | 'json')}
                  className="input"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div>
                <label className="label">File</label>
                <input
                  type="file"
                  accept={importFormat === 'csv' ? '.csv' : '.json'}
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="input"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleImport}
                  disabled={!importFile}
                  className="btn btn-primary flex-1"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card p-4">
        {categoryTree.length === 0 ? (
          <p className="text-[#5C5C5C] text-center py-8">No categories defined yet</p>
        ) : searchQuery || levelFilter !== null ? (
          <div className="space-y-2">
            {filteredCategories.map(category => (
              <div key={category.id} className="p-3 bg-[#F7F7F7] rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{category.name}</span>
                    <span className="text-xs text-[#5C5C5C] ml-2">Level {category.level}</span>
                    <div className="text-xs text-[#A4A4A4] mt-1">{category.path}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-1 text-[#5C5C5C] hover:text-blue-600"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-[#5C5C5C] hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          categoryTree.map(category => renderCategory(category))
        )}
      </div>
    </div>
  );
};

export default ChannelCategoryManagement;


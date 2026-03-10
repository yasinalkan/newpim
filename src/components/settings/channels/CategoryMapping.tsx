import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { Plus, ChevronRight, ChevronDown, Trash2, Edit2, Download, Upload, X, CheckSquare, Square, Layers } from 'lucide-react';

interface CategoryMappingProps {
  selectedChannelId: string | null;
}

const CategoryMapping: React.FC<CategoryMappingProps> = ({ selectedChannelId }) => {
  const { 
    channels, 
    categories, 
    getCategoryTree, 
    getChannelCategoryTree,
    categoryMappings,
    createCategoryMapping,
    deleteCategoryMapping,
  } = useData();
  const { currentUser } = useAuth();
  const { getText } = useLanguage();
  const [masterCategoryId, setMasterCategoryId] = useState<number | null>(null);
  const [channelCategoryId, setChannelCategoryId] = useState<string | null>(null);
  const [expandedMaster, setExpandedMaster] = useState<Set<number>>(new Set());
  const [expandedChannel, setExpandedChannel] = useState<Set<string>>(new Set());
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [showMappingForm, setShowMappingForm] = useState(false);
  
  // Bulk mapping state (FR-10.5)
  const [showBulkMapping, setShowBulkMapping] = useState(false);
  const [selectedMasterCategories, setSelectedMasterCategories] = useState<Set<number>>(new Set());
  const [bulkChannelCategoryId, setBulkChannelCategoryId] = useState<string | null>(null);
  const [bulkMappingMode, setBulkMappingMode] = useState<'same' | 'individual'>('same');

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const masterTree = getCategoryTree();
  const channelTree = selectedChannelId ? getChannelCategoryTree(selectedChannelId) : [];
  const channelMappings = categoryMappings.filter(m => m.channelId === selectedChannelId);

  const toggleMasterExpand = (categoryId: number) => {
    const newExpanded = new Set(expandedMaster);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedMaster(newExpanded);
  };

  const toggleChannelExpand = (categoryId: string) => {
    const newExpanded = new Set(expandedChannel);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedChannel(newExpanded);
  };

  // Validation function (FR-10.6)
  const validateMapping = (
    masterCatId: number | null,
    channelCatId: string | null,
    channelId: string | null
  ): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Master category exists
    if (!masterCatId) {
      errors.push('Master category must be selected');
    } else {
      const masterCat = categories.find(c => c.id === masterCatId);
      if (!masterCat) {
        errors.push('Master category does not exist');
      }
    }

    // 2. Channel exists and is active
    if (!channelId) {
      errors.push('Channel must be selected');
    } else {
      const channel = channels.find(c => c.id === channelId);
      if (!channel) {
        errors.push('Channel does not exist');
      } else if (!channel.isActive) {
        warnings.push('Channel is not active - mappings may not be used for export');
      }
    }

    // 3. Channel category exists in channel taxonomy
    if (!channelCatId) {
      errors.push('Channel category must be selected');
    } else if (channelId) {
      const channelCats = getChannelCategoryTree(channelId);
      const channelCat = channelCats.find(c => c.id === channelCatId);
      if (!channelCat) {
        errors.push('Channel category does not exist in channel taxonomy');
      }
    }

    // 4. Only one channel category can be mapped per master category per channel
    // (This is enforced by replacing existing mappings, but we can warn about it)
    if (masterCatId && channelId) {
      const existing = channelMappings.find(
        m => m.masterCategoryId === masterCatId && m.channelId === channelId
      );
      if (existing && existing.channelCategoryId !== channelCatId) {
        warnings.push('A mapping already exists for this master category and channel - it will be replaced');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  };

  const handleSaveMapping = () => {
    if (!selectedChannelId || !masterCategoryId || !channelCategoryId) {
      alert('Please select both master and channel categories');
      return;
    }

    // Validate mapping (FR-10.6)
    const validation = validateMapping(masterCategoryId, channelCategoryId, selectedChannelId);
    
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      const proceed = window.confirm(
        `Warnings:\n${validation.warnings.join('\n')}\n\nDo you want to continue?`
      );
      if (!proceed) {
        return;
      }
    }

    // Check if mapping already exists for this master category and channel
    const existing = channelMappings.find(
      m => m.masterCategoryId === masterCategoryId && m.channelId === selectedChannelId
    );

    if (existing) {
      // Update existing mapping (one-to-one: replace the old mapping)
      if (window.confirm('A mapping already exists for this master category. Replace it?')) {
        deleteCategoryMapping(existing.id);
        createCategoryMapping({
          masterCategoryId: masterCategoryId!,
          channelId: selectedChannelId!,
          channelCategoryId: channelCategoryId!,
          isActive: true,
          mappedBy: currentUser?.id || 1,
        });
      } else {
        return;
      }
    } else {
      // Create new mapping
      createCategoryMapping({
        masterCategoryId: masterCategoryId!,
        channelId: selectedChannelId!,
        channelCategoryId: channelCategoryId!,
        isActive: true,
        mappedBy: currentUser?.id || 1,
      });
    }

    setMasterCategoryId(null);
    setChannelCategoryId(null);
  };

  const handleExportMappings = () => {
    const data = channelMappings.map(mapping => {
      const masterCat = categories.find(c => c.id === mapping.masterCategoryId);
      const channelCat = channelTree.find(c => c.id === String(mapping.channelCategoryId));
      return {
        Master_Category_ID: mapping.masterCategoryId,
        Master_Category_Name: masterCat ? masterCat.name : '',
        Channel_Category_ID: mapping.channelCategoryId,
        Channel_Category_Name: channelCat?.name || '',
        Active: mapping.isActive ? 'true' : 'false',
      };
    });

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `category-mappings-${selectedChannelId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Bulk mapping handlers (FR-10.5)
  const toggleBulkCategorySelection = (categoryId: number) => {
    const newSelected = new Set(selectedMasterCategories);
    if (newSelected.has(categoryId)) {
      newSelected.delete(categoryId);
    } else {
      newSelected.add(categoryId);
    }
    setSelectedMasterCategories(newSelected);
  };

  const handleBulkMappingSave = () => {
    if (!selectedChannelId || selectedMasterCategories.size === 0) {
      alert('Please select at least one master category');
      return;
    }

    if (bulkMappingMode === 'same' && !bulkChannelCategoryId) {
      alert('Please select a channel category for bulk mapping');
      return;
    }

    // Validate bulk mapping (FR-10.6)
    const validation = validateMapping(null, bulkChannelCategoryId, selectedChannelId);
    if (!validation.isValid) {
      alert(`Validation errors:\n${validation.errors.join('\n')}`);
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let successCount = 0;

    selectedMasterCategories.forEach((masterCategoryId) => {
      try {
        // Validate each individual mapping
        const mappingValidation = validateMapping(masterCategoryId, bulkChannelCategoryId, selectedChannelId);
        
        if (!mappingValidation.isValid) {
          const category = categories.find(c => c.id === masterCategoryId);
          const categoryName = category ? category.name : `Category ${masterCategoryId}`;
          errors.push(`${categoryName}: ${mappingValidation.errors.join(', ')}`);
          return;
        }

        warnings.push(...mappingValidation.warnings.map(w => `Category ${masterCategoryId}: ${w}`));

        // Check if mapping already exists
        const existing = channelMappings.find(
          m => m.masterCategoryId === masterCategoryId && m.channelId === selectedChannelId
        );

        if (existing) {
          deleteCategoryMapping(existing.id);
        }

        // For 'same' mode, use the selected channel category for all
        // For 'individual' mode, user would need to map each individually (future enhancement)
        const targetChannelCategoryId = bulkMappingMode === 'same' 
          ? bulkChannelCategoryId!
          : null; // Individual mode would require per-category selection

        if (targetChannelCategoryId) {
          createCategoryMapping({
            masterCategoryId,
            channelId: selectedChannelId!,
            channelCategoryId: targetChannelCategoryId,
            isActive: true,
            mappedBy: currentUser?.id || 1,
          });
          successCount++;
        } else {
          errors.push(`Category ${masterCategoryId}: No channel category selected`);
        }
      } catch (error) {
        const category = categories.find(c => c.id === masterCategoryId);
        const categoryName = category ? (typeof category.name === 'string' ? category.name : getText(category.name)) : `Category ${masterCategoryId}`;
        errors.push(`${categoryName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Show results with validation feedback
    let resultMessage = '';
    if (successCount > 0) {
      resultMessage += `Successfully mapped ${successCount} categor${successCount !== 1 ? 'ies' : 'y'}\n\n`;
    }
    if (warnings.length > 0) {
      resultMessage += `Warnings:\n${warnings.slice(0, 5).join('\n')}${warnings.length > 5 ? `\n... and ${warnings.length - 5} more` : ''}\n\n`;
    }
    if (errors.length > 0) {
      resultMessage += `Errors:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`;
    }

    if (resultMessage) {
      alert(resultMessage.trim());
    }

    // Reset bulk mapping state
    setSelectedMasterCategories(new Set());
    setBulkChannelCategoryId(null);
    setShowBulkMapping(false);
  };

  const renderMasterCategoryForBulk = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedMaster.has(category.id);
    const isSelected = selectedMasterCategories.has(category.id);
    const isMapped = channelMappings.some(m => m.masterCategoryId === category.id && m.channelId === selectedChannelId);

    return (
      <div key={category.id} className="ml-4">
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer ${
            isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-[#F7F7F7]'
          } ${isMapped ? 'border-l-4 border-green-500' : ''}`}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMasterExpand(category.id);
              }}
              className="p-1 hover:bg-[#F7F7F7] rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <button
            onClick={() => toggleBulkCategorySelection(category.id)}
            className="p-1 hover:bg-[#F7F7F7] rounded"
          >
            {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
          </button>
          <span className="flex-1" onClick={() => toggleBulkCategorySelection(category.id)}>
            {category.name}
          </span>
          {isMapped && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              ✓ Mapped
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map((child: any) => renderMasterCategoryForBulk(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile || !selectedChannelId) return;

    const text = await bulkImportFile.text();
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.replace(/"/g, '').trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = values[i] || '';
      });
      return obj;
    });

    const errors: string[] = [];
    const imported: number = 0;

    data.forEach((row, index) => {
      const masterId = row.Master_Category_ID || row.masterCategoryId;
      const masterName = row.Master_Category_Name || row.masterCategoryName;
      const channelId = row.Channel_Category_ID || row.channelCategoryId;
      const channelName = row.Channel_Category_Name || row.channelCategoryName;
      const active = row.Active === 'true' || row.active === true;

      let masterCategory: typeof categories[0] | undefined;
      if (masterId) {
        masterCategory = categories.find(c => c.id === parseInt(masterId));
      } else if (masterName) {
        masterCategory = categories.find(c => {
          const name = c.name;
          return name.toLowerCase() === masterName.toLowerCase();
        });
      }

      let channelCategory = channelTree.find(c => c.id === channelId);
      if (!channelCategory && channelName) {
        channelCategory = channelTree.find(c => c.name.toLowerCase() === channelName.toLowerCase());
      }

      if (!masterCategory) {
        errors.push(`Row ${index + 1}: Master category not found (ID: ${masterId}, Name: ${masterName})`);
        return;
      }

      if (!channelCategory) {
        errors.push(`Row ${index + 1}: Channel category not found (ID: ${channelId}, Name: ${channelName})`);
        return;
      }

      // Check if mapping already exists
      const existing = channelMappings.find(
        m => m.masterCategoryId === masterCategory!.id && m.channelId === selectedChannelId
      );

      if (existing) {
        // Update existing
        deleteCategoryMapping(existing.id);
      }

      createCategoryMapping({
        masterCategoryId: masterCategory.id,
        channelId: selectedChannelId,
        channelCategoryId: channelCategory.id,
        isActive: active,
        mappedBy: currentUser?.id || 1,
      });
    });

    if (errors.length > 0) {
      alert(`Import completed with errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more` : ''}\n\nImported: ${data.length - errors.length} mappings`);
    } else {
      alert(`Successfully imported ${data.length} mappings`);
    }

    setShowBulkImport(false);
    setBulkImportFile(null);
  };

  const renderMasterCategory = (category: any, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedMaster.has(category.id);
    const isMapped = channelMappings.some(m => m.masterCategoryId === category.id);
    const mapping = channelMappings.find(m => m.masterCategoryId === category.id);

    return (
      <div key={category.id} className="ml-4">
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer ${
            masterCategoryId === category.id ? 'bg-primary/10 border border-primary' : 'hover:bg-[#F7F7F7]'
          } ${isMapped ? 'border-l-4 border-green-500' : ''}`}
          onClick={() => setMasterCategoryId(category.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMasterExpand(category.id);
              }}
              className="p-1 hover:bg-[#F7F7F7] rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <span className="flex-1">
            {category.name}
          </span>
          {isMapped && mapping && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              ✓ Mapped
            </span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map((child: any) => renderMasterCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderChannelCategory = (category: any, level: number = 0, isBulkMode: boolean = false) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedChannel.has(category.id);
    const isSelected = isBulkMode 
      ? bulkChannelCategoryId === category.id 
      : channelCategoryId === category.id;

    return (
      <div key={category.id} className="ml-4">
        <div
          className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer ${
            isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-[#F7F7F7]'
          }`}
          onClick={() => {
            if (isBulkMode) {
              setBulkChannelCategoryId(category.id);
            } else {
              setChannelCategoryId(category.id);
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleChannelExpand(category.id);
              }}
              className="p-1 hover:bg-[#F7F7F7] rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6" />
          )}
          <span className="flex-1">{category.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {category.children.map((child: any) => renderChannelCategory(child, level + 1, isBulkMode))}
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

  // Helper function to flatten category tree for dropdown
  const flattenCategories = (cats: any[], parentPath: string = ''): Array<{ id: number | string; name: string; path: string; displayPath: string }> => {
    let result: Array<{ id: number | string; name: string; path: string; displayPath: string }> = [];
    cats.forEach(cat => {
      const displayPath = parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      result.push({
        id: cat.id,
        name: cat.name,
        path: cat.path || cat.name,
        displayPath,
      });
      if (cat.children && cat.children.length > 0) {
        result = result.concat(flattenCategories(cat.children, displayPath));
      }
    });
    return result;
  };

  const flatMasterCategories = flattenCategories(masterTree).sort((a, b) => 
    a.displayPath.localeCompare(b.displayPath)
  );
  const flatChannelCategories = flattenCategories(channelTree).sort((a, b) => 
    a.displayPath.localeCompare(b.displayPath)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#171717]">
            Category Mapping: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Map master categories to channel-specific categories
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMappings}
            className="btn btn-secondary flex items-center gap-2"
            disabled={channelMappings.length === 0}
          >
            <Download size={18} />
            Export CSV
          </button>
          <button
            onClick={() => setShowBulkImport(true)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Upload size={18} />
            Bulk Import
          </button>
        </div>
      </div>

      {/* Existing Mappings */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">
            Existing Mappings
            <span className="text-sm font-normal text-[#5C5C5C] ml-2">
              ({channelMappings.length} mappings)
            </span>
          </h4>
          <button
            onClick={() => {
              setMasterCategoryId(null);
              setChannelCategoryId(null);
              setShowMappingForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Mapping
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Master Category</th>
                <th>Master Path</th>
                <th>Channel Category</th>
                <th>Channel Path</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Inline form row */}
              {showMappingForm && (
                <tr className="bg-blue-50">
                  <td colSpan={2}>
                    <select
                      value={masterCategoryId || ''}
                      onChange={(e) => setMasterCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                      className="input w-full"
                    >
                      <option value="">-- Select Master Category --</option>
                      {flatMasterCategories.map((cat) => {
                        const isMapped = channelMappings.some(m => m.masterCategoryId === cat.id);
                        return (
                          <option key={cat.id} value={cat.id}>
                            {cat.displayPath} {isMapped && '✓'}
                          </option>
                        );
                      })}
                    </select>
                    {/* Validation messages */}
                    {masterCategoryId && channelCategoryId && (() => {
                      const validation = validateMapping(masterCategoryId, channelCategoryId, selectedChannelId);
                      if (validation.errors.length > 0 || validation.warnings.length > 0) {
                        return (
                          <div className="mt-2 space-y-1">
                            {validation.errors.length > 0 && (
                              <div className="text-xs text-red-700">
                                {validation.errors.map((error, idx) => (
                                  <div key={idx}>⚠️ {error}</div>
                                ))}
                              </div>
                            )}
                            {validation.warnings.length > 0 && (
                              <div className="text-xs text-yellow-700">
                                {validation.warnings.map((warning, idx) => (
                                  <div key={idx}>⚠ {warning}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </td>
                  <td colSpan={2}>
                    <select
                      value={channelCategoryId || ''}
                      onChange={(e) => setChannelCategoryId(e.target.value || null)}
                      className="input w-full"
                    >
                      <option value="">-- Select Channel Category --</option>
                      {flatChannelCategories.length === 0 ? (
                        <option value="" disabled>No channel categories defined</option>
                      ) : (
                        flatChannelCategories.map((cat) => {
                          return (
                            <option key={cat.id} value={cat.id}>
                              {cat.displayPath}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </td>
                  <td>
                    <span className="badge badge-info text-xs">New</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          handleSaveMapping();
                          setShowMappingForm(false);
                        }}
                        disabled={!masterCategoryId || !channelCategoryId || (() => {
                          const validation = validateMapping(masterCategoryId, channelCategoryId, selectedChannelId);
                          return !validation.isValid;
                        })()}
                        className="p-1 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        title="Save mapping"
                      >
                        <CheckSquare size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setShowMappingForm(false);
                          setMasterCategoryId(null);
                          setChannelCategoryId(null);
                        }}
                        className="p-1 text-white bg-red-600 hover:bg-red-700 rounded"
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Existing mappings */}
              {channelMappings.length === 0 && !showMappingForm ? (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-[#5C5C5C]">
                    No mappings created yet
                  </td>
                </tr>
              ) : (
                channelMappings.map((mapping) => {
                  const masterCat = categories.find(c => c.id === mapping.masterCategoryId);
                  const channelCat = flatChannelCategories.find(c => c.id === String(mapping.channelCategoryId));
                  const isEditing = showMappingForm && masterCategoryId === mapping.masterCategoryId;
                  
                  if (isEditing) {
                    // Show inline edit form
                    return (
                      <tr key={mapping.id} className="bg-yellow-50">
                        <td colSpan={2}>
                          <select
                            value={masterCategoryId || ''}
                            onChange={(e) => setMasterCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                            className="input w-full"
                          >
                            <option value="">-- Select Master Category --</option>
                            {flatMasterCategories.map((cat) => {
                              const isMapped = channelMappings.some(m => m.masterCategoryId === cat.id && m.id !== mapping.id);
                              return (
                                <option key={cat.id} value={cat.id}>
                                  {cat.displayPath} {isMapped && '✓'}
                                </option>
                              );
                            })}
                          </select>
                          {/* Validation messages */}
                          {masterCategoryId && channelCategoryId && (() => {
                            const validation = validateMapping(masterCategoryId, channelCategoryId, selectedChannelId);
                            if (validation.errors.length > 0 || validation.warnings.length > 0) {
                              return (
                                <div className="mt-2 space-y-1">
                                  {validation.errors.length > 0 && (
                                    <div className="text-xs text-red-700">
                                      {validation.errors.map((error, idx) => (
                                        <div key={idx}>⚠️ {error}</div>
                                      ))}
                                    </div>
                                  )}
                                  {validation.warnings.length > 0 && (
                                    <div className="text-xs text-yellow-700">
                                      {validation.warnings.map((warning, idx) => (
                                        <div key={idx}>⚠ {warning}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td colSpan={2}>
                          <select
                            value={channelCategoryId || ''}
                            onChange={(e) => setChannelCategoryId(e.target.value || null)}
                            className="input w-full"
                          >
                            <option value="">-- Select Channel Category --</option>
                            {flatChannelCategories.length === 0 ? (
                              <option value="" disabled>No channel categories defined</option>
                            ) : (
                              flatChannelCategories.map((cat) => {
                                return (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.displayPath}
                                  </option>
                                );
                              })
                            )}
                          </select>
                        </td>
                        <td>
                          <span className="badge badge-warning text-xs">Editing</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                handleSaveMapping();
                                setShowMappingForm(false);
                              }}
                              disabled={!masterCategoryId || !channelCategoryId || (() => {
                                const validation = validateMapping(masterCategoryId, channelCategoryId, selectedChannelId);
                                return !validation.isValid;
                              })()}
                              className="p-1 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                              title="Save mapping"
                            >
                              <CheckSquare size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setShowMappingForm(false);
                                setMasterCategoryId(null);
                                setChannelCategoryId(null);
                              }}
                              className="p-1 text-white bg-red-600 hover:bg-red-700 rounded"
                              title="Cancel"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  
                  // Show normal row
                  return (
                    <tr key={mapping.id}>
                      <td className="font-medium text-[#171717]">
                        {masterCat ? masterCat.name : 'Unknown'}
                      </td>
                      <td className="text-[#5C5C5C] text-xs">
                        {masterCat?.path || 'N/A'}
                      </td>
                      <td className="text-[#5C5C5C]">
                        {channelCat?.name || mapping.channelCategoryId}
                      </td>
                      <td className="text-[#5C5C5C] text-xs">
                        {channelCat?.path || 'N/A'}
                      </td>
                      <td>
                        <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-danger'}`}>
                          {mapping.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setMasterCategoryId(mapping.masterCategoryId);
                              setChannelCategoryId(mapping.channelCategoryId);
                              setShowMappingForm(true);
                            }}
                            className="p-1 text-[#5C5C5C] hover:text-blue-600"
                            title="Edit mapping"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this mapping?')) {
                                deleteCategoryMapping(mapping.id);
                              }
                            }}
                            className="p-1 text-[#5C5C5C] hover:text-red-600"
                            title="Delete mapping"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Mapping Modal (FR-10.5) */}
      {showBulkMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">Bulk Category Mapping (FR-10.5)</h4>
              <button
                onClick={() => {
                  setShowBulkMapping(false);
                  setSelectedMasterCategories(new Set());
                  setBulkChannelCategoryId(null);
                }}
                className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C]"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Mapping Mode Selection */}
              <div>
                <label className="label">Mapping Mode</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bulkMappingMode"
                      value="same"
                      checked={bulkMappingMode === 'same'}
                      onChange={(e) => setBulkMappingMode(e.target.value as 'same' | 'individual')}
                      className="w-4 h-4"
                    />
                    <span>Map all to same channel category</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="bulkMappingMode"
                      value="individual"
                      checked={bulkMappingMode === 'individual'}
                      onChange={(e) => setBulkMappingMode(e.target.value as 'same' | 'individual')}
                      className="w-4 h-4"
                      disabled
                    />
                    <span className="text-[#A4A4A4]">Individual mapping (coming soon)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Master Categories Selection */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold">Select Master Categories</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Select all visible categories
                          const allIds = new Set<number>();
                          const collectIds = (cats: any[]) => {
                            cats.forEach(cat => {
                              allIds.add(cat.id);
                              if (cat.children) collectIds(cat.children);
                            });
                          };
                          collectIds(masterTree);
                          setSelectedMasterCategories(allIds);
                        }}
                        className="text-xs btn btn-secondary"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedMasterCategories(new Set())}
                        className="text-xs btn btn-secondary"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[#5C5C5C] mb-2">
                    Selected: {selectedMasterCategories.size} categor{selectedMasterCategories.size !== 1 ? 'ies' : 'y'}
                  </div>
                  <div className="max-h-96 overflow-y-auto border rounded p-2">
                    {masterTree.map(category => renderMasterCategoryForBulk(category))}
                  </div>
                </div>

                {/* Channel Category Selection */}
                <div className="card p-4">
                  <h4 className="font-semibold mb-4">Select Channel Category</h4>
                  {bulkMappingMode === 'same' ? (
                    <>
                      <div className="max-h-96 overflow-y-auto border rounded p-2">
                        {channelTree.length === 0 ? (
                          <p className="text-[#5C5C5C] text-center py-8">No channel categories defined</p>
                        ) : (
                          channelTree.map(category => renderChannelCategory(category, 0, true))
                        )}
                      </div>
                      {bulkChannelCategoryId && (
                        <div className="mt-4 p-3 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-[#171717]">Selected:</p>
                          <p className="text-sm text-[#5C5C5C]">
                            {channelTree.find(c => c.id === bulkChannelCategoryId)?.name || 'Unknown'}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-[#5C5C5C] text-center py-8">Individual mapping mode coming soon</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={handleBulkMappingSave}
                  disabled={selectedMasterCategories.size === 0 || (bulkMappingMode === 'same' && !bulkChannelCategoryId)}
                  className="btn btn-primary flex-1"
                >
                  <Layers size={18} />
                  Map {selectedMasterCategories.size} Categor{selectedMasterCategories.size !== 1 ? 'ies' : 'y'}
                </button>
                <button
                  onClick={() => {
                    setShowBulkMapping(false);
                    setSelectedMasterCategories(new Set());
                    setBulkChannelCategoryId(null);
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

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Bulk Import Category Mappings</h4>
              <button
                onClick={() => {
                  setShowBulkImport(false);
                  setBulkImportFile(null);
                }}
                className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C]"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                  className="input"
                />
                <p className="text-xs text-[#5C5C5C] mt-1">
                  Format: Master_Category_ID, Master_Category_Name, Channel_Category_ID, Channel_Category_Name, Active
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkImportFile}
                  className="btn btn-primary flex-1"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowBulkImport(false);
                    setBulkImportFile(null);
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
    </div>
  );
};

export default CategoryMapping;


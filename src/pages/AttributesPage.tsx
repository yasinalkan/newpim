import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';
import Pagination from '../components/Pagination';
import type { Attribute, AttributeType, AttributeVariableType, MultiLangText, AttributeValidation } from '../types';

const AttributesPage: React.FC = () => {
  const { getText, activeLanguages, defaultLanguage } = useLanguage();
  const { attributes, createAttribute, updateAttribute, deleteAttribute, settings } = useData();
  const activeUnits = (settings.units || []).filter(u => u.isActive);
  const { hasPermission, currentUser } = useAuth();

  // Initialize name state with all active languages
  const initializeMultiLangText = (): MultiLangText => {
    const result: MultiLangText = {};
    activeLanguages.forEach(lang => {
      result[lang.code] = '';
    });
    return result;
  };

  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<MultiLangText>(initializeMultiLangText());
  const [attributeType, setAttributeType] = useState<AttributeType>('freeText');
  const [attributeVariableType, setAttributeVariableType] = useState<AttributeVariableType>('string');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [required, setRequired] = useState(false);
  const [defaultValue, setDefaultValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('');
  const [validation, setValidation] = useState<AttributeValidation>({});
  const [newOptionValue, setNewOptionValue] = useState<string>('');
  const [newOptionLabel, setNewOptionLabel] = useState<MultiLangText>(initializeMultiLangText());

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [variableTypeFilter, setVariableTypeFilter] = useState<AttributeVariableType | 'all'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const canEdit = currentUser?.role === 'admin' || hasPermission('attributes', 'edit');

  // Filter attributes
  const filteredAttributes = useMemo(() => {
    return attributes.filter((attribute) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const attrName = getText(attribute.name).toLowerCase();
        const attrCode = attribute.code.toLowerCase();
        
        if (!attrName.includes(query) && !attrCode.includes(query)) {
          return false;
        }
      }

      // Variable type filter
      const varType = attribute.attributeVariableType || 'string';
      if (variableTypeFilter !== 'all' && varType !== variableTypeFilter) {
        return false;
      }

      return true;
    });
  }, [attributes, searchQuery, variableTypeFilter, getText]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAttributes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAttributes = filteredAttributes.slice(startIndex, endIndex);

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, variableTypeFilter]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Format variable type for display
  const formatVariableType = (type?: AttributeVariableType) => {
    if (!type) return 'string';
    return type;
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAttribute(null);
    setCode('');
    setName(initializeMultiLangText());
    setAttributeType('freeText');
    setAttributeVariableType('string');
    setCategoryIds([]);
    setRequired(false);
    setDefaultValue('');
    setUnit('');
    setValidation({});
    setNewOptionValue('');
    setNewOptionLabel(initializeMultiLangText());
  };

  const handleEdit = (attribute: Attribute) => {
    setEditingAttribute(attribute);
    setCode(attribute.code);
    setName(typeof attribute.name === 'object' ? { ...attribute.name } : initializeMultiLangText());
    setAttributeType(attribute.attributeType || attribute.type || 'freeText');
    setAttributeVariableType(attribute.attributeVariableType || 'string');
    setCategoryIds([...attribute.categoryIds]);
    setRequired(attribute.required || false);
    setDefaultValue(attribute.defaultValue ? String(attribute.defaultValue) : '');
    setUnit(attribute.unit || '');
    setValidation(attribute.validation || {});
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this attribute?')) {
      deleteAttribute(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const defaultLangName = name[defaultLanguage?.code || 'en']?.trim();
    if (!code.trim() || !defaultLangName) {
      alert('Please fill in all required fields (Code and default language name).');
      return;
    }

    const attributeData: Omit<Attribute, 'id' | 'createdAt' | 'updatedAt'> = {
      code: code.trim(),
      name: { ...name },
      attributeType,
      type: attributeType,
      attributeVariableType,
      unit: attributeVariableType === 'number' && unit ? unit : undefined,
      categoryIds: [...categoryIds],
      required,
      defaultValue: defaultValue.trim() || null,
      validation: { ...validation },
      channelMappings: editingAttribute?.channelMappings || {},
    };

    if (editingAttribute) {
      updateAttribute(editingAttribute.id, attributeData);
    } else {
      createAttribute(attributeData);
    }

    resetForm();
  };

  const addOption = () => {
    if (!newOptionValue.trim()) {
      alert('Please enter an option value.');
      return;
    }

    const defaultLangLabel = newOptionLabel[defaultLanguage?.code || 'en']?.trim();
    if (!defaultLangLabel) {
      alert('Please enter a label for the default language.');
      return;
    }

    const newOption = {
      value: newOptionValue.trim(),
      label: { ...newOptionLabel }
    };

    setValidation(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption]
    }));

    setNewOptionValue('');
    setNewOptionLabel(initializeMultiLangText());
  };

  const removeOption = (index: number) => {
    setValidation(prev => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Özellik Ekle
          </button>
        )}
      </div>

      {/* Drawer Form */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={resetForm}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-[#171717]">
                {editingAttribute ? 'Edit Attribute' : 'Create Attribute'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 text-[#5C5C5C] hover:text-[#171717] hover:bg-[#F7F7F7] rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Code *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                className="input"
                placeholder="e.g., COLOR, SIZE, FABRIC"
                maxLength={50}
                required
              />
              <p className="text-xs text-[#5C5C5C] mt-1">
                Unique code for the attribute (uppercase letters, numbers, and underscores only)
              </p>
            </div>

            {/* Dynamic language fields - Grouped */}
            <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#171717]">
                  Attribute Names
                </h3>
                {defaultLanguage && (
                  <span className="text-xs text-[#5C5C5C]">
                    <span className="text-red-500">*</span> Required fields - must be provided if used in option labels
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLanguages.map(lang => {
                  // Check if this language is used in any option labels
                  const isUsedInOptions = validation.options?.some(option => 
                    typeof option.label === 'object' && option.label[lang.code]?.trim()
                  ) || false;
                  const isRequired = lang.isDefault || isUsedInOptions;
                  
                  return (
                    <div key={lang.code} className="bg-white rounded-md p-3 border border-[#EBEBEB]">
                      <label className="block text-xs font-medium text-[#5C5C5C] mb-1.5">
                        <span className="uppercase font-semibold text-[#171717]">{lang.code}</span>
                        <span className="mx-1.5">•</span>
                        <span>{lang.nativeName}</span>
                        {isRequired && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type="text"
                        value={name[lang.code] || ''}
                        onChange={(e) => setName({ ...name, [lang.code]: e.target.value })}
                        className="input text-sm"
                        placeholder={`Enter name in ${lang.nativeName}`}
                        required={isRequired}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="label">Attribute Type</label>
              <select
                value={attributeType}
                onChange={(e) => setAttributeType(e.target.value as AttributeType)}
                className="input"
              >
                <option value="freeText">Free Text</option>
                <option value="select">Select (Dropdown)</option>
              </select>
            </div>

            <div>
              <label className="label">Variable Type</label>
              <select
                value={attributeVariableType}
                onChange={(e) => {
                  setAttributeVariableType(e.target.value as AttributeVariableType);
                  if (e.target.value !== 'number') setUnit('');
                }}
                className="input"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            {/* Unit selector — only for number attributes */}
            {attributeVariableType === 'number' && (
              <div>
                <label className="label">Unit of Measurement</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="input"
                >
                  <option value="">— No unit —</option>
                  {activeUnits.length === 0 ? (
                    <option disabled>No active units. Go to Settings → Units to add some.</option>
                  ) : (
                    ['weight', 'length', 'area', 'volume', 'temperature', 'time', 'other'].map(cat => {
                      const catUnits = activeUnits.filter(u => u.category === cat);
                      if (catUnits.length === 0) return null;
                      return (
                        <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                          {catUnits.map(u => (
                            <option key={u.code} value={u.code}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </optgroup>
                      );
                    })
                  )}
                </select>
                {unit && (
                  <p className="text-xs text-[#5C5C5C] mt-1">
                    Values will be displayed with the unit symbol: <strong>{activeUnits.find(u => u.code === unit)?.symbol}</strong>
                  </p>
                )}
              </div>
            )}

            {attributeType === 'select' && (
              <div className="bg-[#FAFAFA] border border-[#EBEBEB] rounded-lg p-4">
                <h3 className="text-sm font-semibold text-[#171717] mb-3">Options</h3>
                
                {/* Existing options */}
                {validation.options && validation.options.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {validation.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-white p-3 rounded border border-[#EBEBEB]">
                        <div>
                          <p className="font-medium text-sm text-[#171717]">
                            {option.value}
                          </p>
                          <p className="text-xs text-[#5C5C5C]">
                            {typeof option.label === 'object' 
                              ? getText(option.label)
                              : option.label}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeOption(index)}
                          className="text-red-500 hover:text-red-600 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new option */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#5C5C5C] mb-1">
                      Option Value *
                    </label>
                    <input
                      type="text"
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      className="input text-sm"
                      placeholder="e.g., red, blue, large"
                    />
                  </div>

                  <div className="bg-white rounded-md p-3 border border-[#EBEBEB]">
                    <label className="block text-xs font-medium text-[#5C5C5C] mb-2">
                      Option Labels (Multi-language)
                    </label>
                    <div className="space-y-2">
                      {activeLanguages.map(lang => (
                        <div key={lang.code}>
                          <label className="block text-xs text-[#5C5C5C] mb-1">
                            <span className="uppercase font-semibold">{lang.code}</span>
                            {lang.isDefault && <span className="text-red-500 ml-1">*</span>}
                          </label>
                          <input
                            type="text"
                            value={newOptionLabel[lang.code] || ''}
                            onChange={(e) => setNewOptionLabel({ 
                              ...newOptionLabel, 
                              [lang.code]: e.target.value 
                            })}
                            className="input text-sm"
                            placeholder={`Label in ${lang.nativeName}`}
                            required={lang.isDefault}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addOption}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Option
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 sticky bottom-0 bg-white border-t border-[#EBEBEB] py-4 -mx-6 px-6 mt-6">
              <button type="submit" className="btn btn-primary">
                Save
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </form>
            </div>
          </div>
        </>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A4A4A4]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="input pl-10"
          />
        </div>

        {/* Variable Type Filter */}
        <select
          value={variableTypeFilter}
          onChange={(e) => setVariableTypeFilter(e.target.value as AttributeVariableType | 'all')}
          className="input w-48"
        >
          <option value="all">Tum Tip</option>
          <option value="string">String</option>
          <option value="number">Int</option>
          <option value="number">Decimal</option>
          <option value="boolean">Boolean</option>
        </select>
      </div>

      {/* Attributes Table */}
      <div className="card">
        {filteredAttributes.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-[#171717] mb-2">
              No attributes found
            </h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Label</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Last Updated</th>
                  {canEdit && <th></th>}
                </tr>
              </thead>
              <tbody>
                {paginatedAttributes.map((attribute) => {
                  const unitObj = attribute.unit ? (settings.units || []).find(u => u.code === attribute.unit) : null;
                  return (
                    <tr key={attribute.id}>
                      <td>{attribute.code}</td>
                      <td>{getText(attribute.name)}</td>
                      <td>{formatVariableType(attribute.attributeVariableType)}</td>
                      <td>
                        {unitObj ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#F7F7F7] text-[#5C5C5C] font-mono">
                            {unitObj.symbol}
                            <span className="font-normal text-[#A4A4A4]">({unitObj.name})</span>
                          </span>
                        ) : attribute.attributeVariableType === 'number' ? (
                          <span className="text-xs text-[#A4A4A4]">—</span>
                        ) : null}
                      </td>
                      <td>{formatDate(attribute.updatedAt || attribute.createdAt)}</td>
                      {canEdit && (
                        <td>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(attribute)}
                              className="text-[#5C5C5C] hover:text-[#171717]"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(attribute.id)}
                              className="text-[#5C5C5C] hover:text-red-500"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {filteredAttributes.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredAttributes.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(value) => setItemsPerPage(value as number)}
            itemsPerPageOptions={[10, 20, 50, 100]}
          />
        )}
      </div>
    </div>
  );
};

export default AttributesPage;

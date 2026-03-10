import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Plus, Trash2, Edit2, Search, Download, Upload, X, AlertTriangle } from 'lucide-react';
import type { ChannelAttribute } from '../../../types';

interface ChannelAttributeManagementProps {
  selectedChannelId: string | null;
}

const ChannelAttributeManagement: React.FC<ChannelAttributeManagementProps> = ({ selectedChannelId }) => {
  const { 
    channels, 
    getChannelAttributes, 
    createChannelAttribute,
    updateChannelAttribute,
    deleteChannelAttribute,
    attributeMappings
  } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<ChannelAttribute | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as ChannelAttribute['type'],
    isRequired: false,
    allowedValues: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [requiredFilter, setRequiredFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'required'>('name');
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const attributes = selectedChannelId ? getChannelAttributes(selectedChannelId) : [];
  
  // Check if attribute has dependencies
  const hasDependencies = (attributeId: string): boolean => {
    return attributeMappings.some(m => 
      m.channelId === selectedChannelId && m.channelAttributeIds.includes(attributeId)
    );
  };

  // Filtered and sorted attributes
  const filteredAttributes = useMemo(() => {
    let filtered = attributes;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(attr => 
        attr.name.toLowerCase().includes(query) ||
        attr.id.toLowerCase().includes(query)
      );
    }
    
    if (typeFilter) {
      filtered = filtered.filter(attr => attr.type === typeFilter);
    }
    
    if (requiredFilter === 'required') {
      filtered = filtered.filter(attr => attr.isRequired);
    } else if (requiredFilter === 'optional') {
      filtered = filtered.filter(attr => !attr.isRequired);
    }
    
    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'type') {
        return a.type.localeCompare(b.type);
      } else {
        return a.isRequired === b.isRequired ? 0 : a.isRequired ? -1 : 1;
      }
    });
    
    return filtered;
  }, [attributes, searchQuery, typeFilter, requiredFilter, sortBy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChannelId || !formData.name.trim()) {
      alert('Please select a channel and enter an attribute name');
      return;
    }

    const attributeData = {
      channelId: selectedChannelId,
      name: formData.name.trim(),
      type: formData.type,
      isRequired: formData.isRequired,
      allowedValues: formData.type === 'select' || formData.type === 'multiselect'
        ? formData.allowedValues.split(',').map(v => v.trim()).filter(Boolean)
        : null,
    };

    if (editingAttribute) {
      updateChannelAttribute(selectedChannelId, editingAttribute.id, attributeData);
    } else {
      createChannelAttribute(selectedChannelId, attributeData);
    }

    setFormData({ name: '', type: 'text', isRequired: false, allowedValues: '' });
    setEditingAttribute(null);
    setShowForm(false);
  };

  const handleEditAttribute = (attr: ChannelAttribute) => {
    setEditingAttribute(attr);
    setFormData({
      name: attr.name,
      type: attr.type,
      isRequired: attr.isRequired,
      allowedValues: attr.allowedValues ? attr.allowedValues.join(', ') : '',
    });
    setShowForm(true);
  };

  const handleDeleteAttribute = (attr: ChannelAttribute) => {
    if (hasDependencies(attr.id)) {
      if (!window.confirm(`Cannot delete attribute "${attr.name}". It is mapped to master attributes. Continue anyway?`)) {
        return;
      }
    }
    
    if (window.confirm(`Are you sure you want to delete "${attr.name}"?`)) {
      deleteChannelAttribute(attr.channelId, attr.id);
    }
  };

  const handleExport = (format: 'csv' | 'json') => {
    const data = attributes.map(attr => ({
      Attribute_ID: attr.id,
      Attribute_Name: attr.name,
      Type: attr.type,
      Required: attr.isRequired ? 'true' : 'false',
      Allowed_Values: attr.allowedValues ? attr.allowedValues.join(',') : '',
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
      a.download = `channel-attributes-${selectedChannelId}-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `channel-attributes-${selectedChannelId}-${Date.now()}.json`;
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

      const errors: string[] = [];
      const imported: string[] = [];

      data.forEach((row, index) => {
        const name = row.Attribute_Name || row.name || '';
        const type = (row.Type || row.type || 'text') as ChannelAttribute['type'];
        const isRequired = row.Required === 'true' || row.required === true;
        const allowedValues = row.Allowed_Values || row.allowedValues || '';
        
        if (!name) {
          errors.push(`Row ${index + 1}: Missing attribute name`);
          return;
        }

        createChannelAttribute(selectedChannelId!, {
          channelId: selectedChannelId!,
          name,
          type,
          isRequired,
          allowedValues: (type === 'select' || type === 'multiselect') && allowedValues
            ? allowedValues.split(',').map(v => v.trim()).filter(Boolean)
            : null,
        });

        imported.push(name);
      });

      if (errors.length > 0) {
        alert(`Import completed with errors:\n${errors.join('\n')}\n\nImported: ${imported.length} attributes`);
      } else {
        alert(`Successfully imported ${imported.length} attributes`);
      }

      setShowImportModal(false);
      setImportFile(null);
    } catch (error) {
      alert('Error importing file: ' + (error as Error).message);
    }
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
            Attribute List: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Manage channel-specific attributes
          </p>
        </div>
        {!showForm && (
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
                setEditingAttribute(null);
                setFormData({ name: '', type: 'text', isRequired: false, allowedValues: '' });
                setShowForm(true);
              }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Add Attribute
            </button>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#A4A4A4]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="Search attributes..."
            />
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input"
            >
              <option value="">All Types</option>
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select</option>
              <option value="multiselect">Multiselect</option>
              <option value="boolean">Boolean</option>
              <option value="date">Date</option>
            </select>
          </div>
          <div>
            <select
              value={requiredFilter}
              onChange={(e) => setRequiredFilter(e.target.value)}
              className="input"
            >
              <option value="">All</option>
              <option value="required">Required</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input"
            >
              <option value="name">Sort by Name</option>
              <option value="type">Sort by Type</option>
              <option value="required">Sort by Required</option>
            </select>
          </div>
        </div>
        {searchQuery && (
          <div className="mt-2 text-sm text-[#5C5C5C]">
            Found {filteredAttributes.length} attribute(s)
          </div>
        )}
      </div>

      {showForm && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">{editingAttribute ? 'Edit Channel Attribute' : 'Add Channel Attribute'}</h4>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingAttribute(null);
                setFormData({ name: '', type: 'text', isRequired: false, allowedValues: '' });
              }}
              className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C]"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Attribute Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label">Attribute Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ChannelAttribute['type'] })}
                  className="input"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="select">Select</option>
                  <option value="multiselect">Multiselect</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                </select>
              </div>
            </div>
            {(formData.type === 'select' || formData.type === 'multiselect') && (
              <div>
                <label className="label">Allowed Values (comma-separated)</label>
                <input
                  type="text"
                  value={formData.allowedValues}
                  onChange={(e) => setFormData({ ...formData, allowedValues: e.target.value })}
                  className="input"
                  placeholder="e.g., Red, Blue, Green"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isRequired}
                onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
              />
              <label className="text-sm text-[#5C5C5C]">Required</label>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingAttribute ? 'Update' : 'Add'} Attribute
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingAttribute(null);
                  setFormData({ name: '', type: 'text', isRequired: false, allowedValues: '' });
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
              <h4 className="font-semibold">Import Attributes</h4>
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

      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Required</th>
              <th>Allowed Values</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttributes.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-[#5C5C5C]">
                  {attributes.length === 0 ? 'No attributes defined yet' : 'No attributes match your filters'}
                </td>
              </tr>
            ) : (
              filteredAttributes.map((attr) => {
                const isMapped = hasDependencies(attr.id);
                return (
                  <tr key={attr.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {attr.name}
                        {isMapped && (
                          <AlertTriangle size={14} className="text-yellow-500" title="Has mappings" />
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info capitalize">{attr.type}</span>
                    </td>
                    <td>
                      {attr.isRequired ? (
                        <span className="badge badge-warning">Required</span>
                      ) : (
                        <span className="text-[#A4A4A4]">Optional</span>
                      )}
                    </td>
                    <td className="text-sm text-[#5C5C5C]">
                      {attr.allowedValues ? attr.allowedValues.join(', ') : '-'}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAttribute(attr)}
                          className="p-1 text-[#5C5C5C] hover:text-blue-600"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAttribute(attr)}
                          className="p-1 text-[#5C5C5C] hover:text-red-600"
                          title="Delete"
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
  );
};

export default ChannelAttributeManagement;


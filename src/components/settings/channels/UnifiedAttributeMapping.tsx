import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Trash2, Edit2, Download, Upload, X, AlertCircle, CheckCircle, ArrowRight, CheckSquare } from 'lucide-react';
import type { ChannelAttribute } from '../../../types';

interface UnifiedAttributeMappingProps {
  selectedChannelId: string | null;
}

const UnifiedAttributeMapping: React.FC<UnifiedAttributeMappingProps> = ({ selectedChannelId }) => {
  const {
    channels,
    attributes,
    getChannelAttributes,
    attributeMappings,
    attributeValueMappings,
    createAttributeMapping,
    deleteAttributeMapping,
    createAttributeValueMapping,
    deleteAttributeValueMapping,
    updateAttributeMapping,
  } = useData();
  const { currentUser } = useAuth();
  
  const [selectedChannelAttributeId, setSelectedChannelAttributeId] = useState<string | null>(null);
  const [selectedChannelValue, setSelectedChannelValue] = useState<string | number | null>(null);
  const [selectedMasterAttributeId, setSelectedMasterAttributeId] = useState<number | null>(null);
  const [selectedMasterValue, setSelectedMasterValue] = useState<string | number | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [editingMapping, setEditingMapping] = useState<{ type: 'attribute' | 'value'; id: number } | null>(null);
  const [showMappingForm, setShowMappingForm] = useState(false);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const channelAttributes = selectedChannelId ? getChannelAttributes(selectedChannelId) : [];
  const selectedChannelAttr = selectedChannelAttributeId
    ? channelAttributes.find(a => a.id === selectedChannelAttributeId)
    : null;

  // Get channel attribute values (from allowedValues or from existing mappings)
  const channelAttributeValues = useMemo(() => {
    if (!selectedChannelAttr) return [];
    
    if (selectedChannelAttr.allowedValues && selectedChannelAttr.allowedValues.length > 0) {
      return selectedChannelAttr.allowedValues;
    }
    
    // If no allowed values, get from existing value mappings for this attribute
    const existingMappings = attributeValueMappings.filter(m => 
      m.channelId === selectedChannelId && 
      m.channelAttributeId === selectedChannelAttributeId
    );
    return Array.from(new Set(existingMappings.map(m => String(m.channelValue))));
  }, [selectedChannelAttr, selectedChannelId, selectedChannelAttributeId, attributeValueMappings]);

  // Get master attribute values
  const masterAttributeValues = useMemo(() => {
    if (!selectedMasterAttributeId) return [];
    const masterAttr = attributes.find(a => a.id === selectedMasterAttributeId);
    if (!masterAttr) return [];
    
    if (masterAttr.attributeType === 'select') {
      return masterAttr.validation?.options?.map(opt => opt.value) || [];
    }
    return [];
  }, [selectedMasterAttributeId, attributes]);

  // Get existing mappings for display
  const existingAttributeMappings = useMemo(() => {
    return attributeMappings.filter(m => m.channelId === selectedChannelId);
  }, [attributeMappings, selectedChannelId]);

  const existingValueMappings = useMemo(() => {
    if (!selectedChannelAttributeId || !selectedChannelId) return [];
    return attributeValueMappings.filter(m => 
      m.channelId === selectedChannelId && 
      m.channelAttributeId === selectedChannelAttributeId
    );
  }, [attributeValueMappings, selectedChannelId, selectedChannelAttributeId]);

  // Check if channel attribute is already mapped
  const isChannelAttributeMapped = (channelAttrId: string): boolean => {
    return existingAttributeMappings.some(m => 
      m.channelAttributeIds.includes(channelAttrId)
    );
  };

  // Get master attributes mapped to this channel attribute
  const getMappedMasterAttributes = (channelAttrId: string) => {
    return existingAttributeMappings
      .filter(m => m.channelAttributeIds.includes(channelAttrId))
      .map(m => attributes.find(a => a.id === m.masterAttributeId))
      .filter(Boolean);
  };

  const handleSaveAttributeMapping = () => {
    if (!selectedChannelId || !selectedChannelAttributeId || !selectedMasterAttributeId) {
      alert('Please select channel attribute and master attribute');
      return;
    }

    // Check if mapping already exists for this master attribute
    const existing = existingAttributeMappings.find(m => 
      m.masterAttributeId === selectedMasterAttributeId &&
      m.channelId === selectedChannelId
    );

    if (existing) {
      // Update existing mapping to include this channel attribute if not already included
      if (!existing.channelAttributeIds.includes(selectedChannelAttributeId)) {
        updateAttributeMapping(existing.id, {
          channelAttributeIds: [...existing.channelAttributeIds, selectedChannelAttributeId],
        });
        alert('Attribute mapping updated successfully');
      } else {
        alert('This mapping already exists');
      }
    } else {
      // Create new mapping
      createAttributeMapping({
        masterAttributeId: selectedMasterAttributeId,
        channelId: selectedChannelId,
        channelAttributeIds: [selectedChannelAttributeId],
        isActive: true,
        mappedBy: currentUser?.id || 1,
      });
      alert('Attribute mapping created successfully');
    }

    // Reset selections
    setSelectedMasterAttributeId(null);
  };

  const handleSaveValueMapping = () => {
    if (!selectedChannelId || !selectedChannelAttributeId || !selectedMasterAttributeId) {
      alert('Please complete the mapping setup');
      return;
    }

    if (!selectedChannelValue || !selectedMasterValue) {
      alert('Please select both channel value and master value');
      return;
    }

    // Check if attribute mapping exists, create it if it doesn't
    let attrMapping = existingAttributeMappings.find(m =>
      m.masterAttributeId === selectedMasterAttributeId &&
      m.channelId === selectedChannelId &&
      m.channelAttributeIds.includes(selectedChannelAttributeId)
    );

    if (!attrMapping) {
      // Auto-create attribute mapping if it doesn't exist
      createAttributeMapping({
        masterAttributeId: selectedMasterAttributeId,
        channelId: selectedChannelId,
        channelAttributeIds: [selectedChannelAttributeId],
        isActive: true,
        mappedBy: currentUser?.id || 1,
      });
    }

    // Check if value mapping already exists
    const existing = existingValueMappings.find(m =>
      String(m.masterValue) === String(selectedMasterValue) &&
      String(m.channelValue) === String(selectedChannelValue)
    );

    if (existing) {
      alert('This value mapping already exists');
      return;
    }

    createAttributeValueMapping({
      masterAttributeId: selectedMasterAttributeId,
      masterValue: selectedMasterValue,
      channelId: selectedChannelId,
      channelAttributeId: selectedChannelAttributeId,
      channelValue: selectedChannelValue,
      isActive: true,
      mappedBy: currentUser?.id || 1,
    });

    alert('Value mapping created successfully');
    
    // Reset value selections only
    setSelectedChannelValue(null);
    setSelectedMasterValue(null);
  };

  const handleDeleteAttributeMapping = (mappingId: number) => {
    if (window.confirm('Are you sure you want to delete this attribute mapping? This will also delete all associated value mappings.')) {
      deleteAttributeMapping(mappingId);
    }
  };

  const handleDeleteValueMapping = (mappingId: number) => {
    if (window.confirm('Are you sure you want to delete this value mapping?')) {
      deleteAttributeValueMapping(mappingId);
    }
  };

  const handleExportMappings = () => {
    const data: any[] = [];
    
    // Export attribute mappings
    existingAttributeMappings.forEach(mapping => {
      const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
      mapping.channelAttributeIds.forEach(channelAttrId => {
        const channelAttr = channelAttributes.find(a => a.id === channelAttrId);
        data.push({
          Type: 'Attribute Mapping',
          Master_Attribute_ID: mapping.masterAttributeId,
          Master_Attribute_Name: masterAttr?.name || '',
          Channel_Attribute_ID: channelAttrId,
          Channel_Attribute_Name: channelAttr?.name || '',
          Active: mapping.isActive ? 'true' : 'false',
        });
      });
    });

    // Export value mappings
    attributeValueMappings
      .filter(m => m.channelId === selectedChannelId)
      .forEach(mapping => {
        const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
        const channelAttr = channelAttributes.find(a => a.id === mapping.channelAttributeId);
        data.push({
          Type: 'Value Mapping',
          Master_Attribute_ID: mapping.masterAttributeId,
          Master_Attribute_Name: masterAttr?.name || '',
          Master_Value: mapping.masterValue,
          Channel_Attribute_ID: mapping.channelAttributeId,
          Channel_Attribute_Name: channelAttr?.name || '',
          Channel_Value: mapping.channelValue,
          Active: mapping.isActive ? 'true' : 'false',
        });
      });

    if (data.length === 0) {
      alert('No mappings to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unified-attribute-mappings-${selectedChannelId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            Attribute Mapping: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Map channel attributes and their values to master attributes and values
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportMappings}
            className="btn btn-secondary flex items-center gap-2"
            disabled={existingAttributeMappings.length === 0 && existingValueMappings.length === 0}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Existing Mappings with inline form */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">
            Attribute & Value Mappings
            <span className="text-sm font-normal text-[#5C5C5C] ml-2">
              ({existingAttributeMappings.length} attribute, {existingValueMappings.length} value)
            </span>
          </h4>
          <button
            onClick={() => {
              setSelectedChannelAttributeId(null);
              setSelectedChannelValue(null);
              setSelectedMasterAttributeId(null);
              setSelectedMasterValue(null);
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
                <th>Channel Attribute</th>
                <th>Channel Value</th>
                <th>Master Attribute</th>
                <th>Master Value</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Inline form row */}
              {showMappingForm && (
                <tr className="bg-blue-50">
                  <td>
                    <select
                      value={selectedChannelAttributeId || ''}
                      onChange={(e) => {
                        const attrId = e.target.value || null;
                        setSelectedChannelAttributeId(attrId);
                        setSelectedChannelValue(null);
                        setSelectedMasterAttributeId(null);
                        setSelectedMasterValue(null);
                      }}
                      className="input w-full text-xs"
                    >
                      <option value="">-- Select --</option>
                      {channelAttributes.map((attr) => {
                        const isMapped = isChannelAttributeMapped(attr.id);
                        return (
                          <option key={attr.id} value={attr.id}>
                            {attr.name} ({attr.type}){isMapped && ' ✓'}
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td>
                    {!selectedChannelAttributeId ? (
                      <input disabled className="input w-full text-xs bg-white" placeholder="-" />
                    ) : selectedChannelAttr && (selectedChannelAttr.type === 'select' || selectedChannelAttr.type === 'multiselect') ? (
                      <select
                        value={selectedChannelValue !== null ? String(selectedChannelValue) : ''}
                        onChange={(e) => setSelectedChannelValue(e.target.value || null)}
                        className="input w-full text-xs"
                      >
                        <option value="">-- Select --</option>
                        {channelAttributeValues.map((value) => (
                          <option key={String(value)} value={String(value)}>
                            {String(value)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input disabled className="input w-full text-xs bg-white" placeholder="N/A" />
                    )}
                  </td>
                  <td>
                    <select
                      value={selectedMasterAttributeId || ''}
                      onChange={(e) => {
                        const attrId = e.target.value ? parseInt(e.target.value) : null;
                        setSelectedMasterAttributeId(attrId);
                        setSelectedMasterValue(null);
                      }}
                      disabled={!selectedChannelAttributeId}
                      className="input w-full text-xs"
                    >
                      <option value="">-- Select --</option>
                      {attributes
                        .filter(attr => {
                          if (selectedChannelAttr && (selectedChannelAttr.type === 'select' || selectedChannelAttr.type === 'multiselect')) {
                            return attr.attributeType === 'select';
                          }
                          return true;
                        })
                        .map((attr) => (
                          <option key={attr.id} value={attr.id}>
                            {attr.name} ({attr.attributeType})
                          </option>
                        ))}
                    </select>
                  </td>
                  <td>
                    {!selectedMasterAttributeId ? (
                      <input disabled className="input w-full text-xs bg-white" placeholder="-" />
                    ) : (attributes.find(a => a.id === selectedMasterAttributeId)?.attributeType === 'select') ? (
                      <select
                        value={selectedMasterValue !== null ? String(selectedMasterValue) : ''}
                        onChange={(e) => setSelectedMasterValue(e.target.value || null)}
                        className="input w-full text-xs"
                      >
                        <option value="">-- Select --</option>
                        {masterAttributeValues.map((value) => (
                          <option key={String(value)} value={String(value)}>
                            {String(value)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input disabled className="input w-full text-xs bg-white" placeholder="N/A" />
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info text-xs">
                      {selectedChannelValue && selectedMasterValue ? 'Value' : 'Attribute'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-info text-xs">New</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (selectedChannelValue && selectedMasterValue) {
                            handleSaveValueMapping();
                          } else {
                            handleSaveAttributeMapping();
                          }
                          setShowMappingForm(false);
                        }}
                        disabled={!selectedChannelAttributeId || !selectedMasterAttributeId}
                        className="p-1 text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded"
                        title="Save"
                      >
                        <CheckSquare size={16} />
                      </button>
                      <button
                        onClick={() => {
                          setShowMappingForm(false);
                          setSelectedChannelAttributeId(null);
                          setSelectedChannelValue(null);
                          setSelectedMasterAttributeId(null);
                          setSelectedMasterValue(null);
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

              {/* Existing attribute mappings */}
              {existingAttributeMappings.length === 0 && existingValueMappings.length === 0 && !showMappingForm ? (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-[#5C5C5C]">
                    No mappings created yet
                  </td>
                </tr>
              ) : (
                <>
                  {existingAttributeMappings.map((mapping) => {
                    const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
                    const channelAttr = channelAttributes.find(a => a.id === mapping.channelAttributeIds[0]);
                    return (
                      <tr key={mapping.id}>
                        <td className="text-xs">{channelAttr?.name || 'Unknown'}</td>
                        <td className="text-xs text-[#A4A4A4]">-</td>
                        <td className="text-xs font-medium">{masterAttr?.name || 'Unknown'}</td>
                        <td className="text-xs text-[#A4A4A4]">-</td>
                        <td><span className="badge badge-secondary text-xs">Attribute</span></td>
                        <td>
                          <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-danger'} text-xs`}>
                            {mapping.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteAttributeMapping(mapping.id)}
                            className="p-1 text-[#5C5C5C] hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Value mappings */}
                  {existingValueMappings.map((mapping) => {
                    const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
                    const channelAttr = channelAttributes.find(a => a.id === mapping.channelAttributeId);
                    return (
                      <tr key={mapping.id} className="bg-[#F7F7F7]/50">
                        <td className="text-xs">{channelAttr?.name || 'Unknown'}</td>
                        <td className="text-xs font-medium">{String(mapping.channelValue)}</td>
                        <td className="text-xs">{masterAttr?.name || 'Unknown'}</td>
                        <td className="text-xs font-medium">{String(mapping.masterValue)}</td>
                        <td><span className="badge badge-info text-xs">Value</span></td>
                        <td>
                          <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-danger'} text-xs`}>
                            {mapping.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteValueMapping(mapping.id)}
                            className="p-1 text-[#5C5C5C] hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnifiedAttributeMapping;


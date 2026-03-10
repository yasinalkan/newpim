import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Trash2, Download, Upload, X } from 'lucide-react';

interface ValueMappingProps {
  selectedChannelId: string | null;
}

const ValueMapping: React.FC<ValueMappingProps> = ({ selectedChannelId }) => {
  const {
    channels,
    attributes,
    getChannelAttributes,
    attributeMappings,
    attributeValueMappings,
    createAttributeValueMapping,
    deleteAttributeValueMapping,
  } = useData();
  const { currentUser } = useAuth();
  const [selectedMasterAttributeId, setSelectedMasterAttributeId] = useState<number | null>(null);
  const [valueMappings, setValueMappings] = useState<Record<string | number, string | number>>({});
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const channelMappings = attributeMappings.filter(m => m.channelId === selectedChannelId);
  const channelValueMappings = attributeValueMappings.filter(m => m.channelId === selectedChannelId);

  const selectedMasterAttr = selectedMasterAttributeId
    ? attributes.find(a => a.id === selectedMasterAttributeId)
    : null;

  const selectedAttributeMapping = selectedMasterAttributeId
    ? channelMappings.find(m => m.masterAttributeId === selectedMasterAttributeId)
    : null;

  const channelAttributeId = selectedAttributeMapping?.channelAttributeIds[0] || null;
  const channelAttribute = channelAttributeId
    ? getChannelAttributes(selectedChannelId || '').find(a => a.id === channelAttributeId)
    : null;

  // Get master attribute values (from validation options)
  const masterValues = selectedMasterAttr?.validation?.options?.map(opt => opt.value) || [];

  const handleSaveMappings = () => {
    if (!selectedChannelId || !selectedMasterAttributeId || !channelAttributeId) {
      alert('Please select an attribute with a mapping');
      return;
    }

    Object.entries(valueMappings).forEach(([masterValue, channelValue]) => {
      if (channelValue) {
        createAttributeValueMapping({
          masterAttributeId: selectedMasterAttributeId,
          masterValue: masterValue,
          channelId: selectedChannelId,
          channelAttributeId,
          channelValue,
          isActive: true,
          mappedBy: currentUser?.id || 1,
        });
      }
    });

    setValueMappings({});
  };

  const handleExportMappings = () => {
    if (!selectedMasterAttributeId || !channelAttributeId) return;

    const data = existingMappings.map(mapping => ({
      Master_Attribute_ID: mapping.masterAttributeId,
      Master_Attribute_Name: selectedMasterAttr?.name.tr || selectedMasterAttr?.name.en || '',
      Master_Value: mapping.masterValue,
      Channel_Value: mapping.channelValue,
      Active: mapping.isActive ? 'true' : 'false',
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `value-mappings-${selectedChannelId}-${selectedMasterAttributeId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile || !selectedChannelId || !selectedMasterAttributeId || !channelAttributeId) return;

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
    let imported = 0;

    data.forEach((row, index) => {
      const masterValue = row.Master_Value || row.masterValue;
      const channelValue = row.Channel_Value || row.channelValue;
      const active = row.Active === 'true' || row.active === true;

      if (!masterValue || !channelValue) {
        errors.push(`Row ${index + 1}: Missing master value or channel value`);
        return;
      }

      // Check if mapping exists
      const existing = existingMappings.find(m => 
        String(m.masterValue) === String(masterValue)
      );

      if (existing) {
        deleteAttributeValueMapping(existing.id);
      }

      createAttributeValueMapping({
        masterAttributeId: selectedMasterAttributeId,
        masterValue,
        channelId: selectedChannelId,
        channelAttributeId,
        channelValue,
        isActive: active,
        mappedBy: currentUser?.id || 1,
      });

      imported++;
    });

    if (errors.length > 0) {
      alert(`Import completed with errors:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... and ${errors.length - 10} more` : ''}\n\nImported: ${imported} mappings`);
    } else {
      alert(`Successfully imported ${imported} mappings`);
    }

    setShowBulkImport(false);
    setBulkImportFile(null);
  };

  const existingMappings = selectedMasterAttributeId
    ? channelValueMappings.filter(m => m.masterAttributeId === selectedMasterAttributeId)
    : [];

  if (!selectedChannelId) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#5C5C5C]">Please select a channel from the Channels tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#171717]">
          Value Mapping: {selectedChannel?.name}
        </h3>
        <p className="text-sm text-[#5C5C5C] mt-1">
          Map master attribute values to channel-specific values
        </p>
      </div>

      {/* Master Attribute Selection */}
      <div className="card p-4">
        <h4 className="font-semibold mb-4">Select Master Attribute</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {attributes
            .filter(attr => {
              const mapping = channelMappings.find(m => m.masterAttributeId === attr.id);
              return mapping && (attr.type === 'select' || attr.type === 'multiselect');
            })
            .map((attr) => {
              const mapping = channelMappings.find(m => m.masterAttributeId === attr.id);
              return (
                <button
                  key={attr.id}
                  onClick={() => {
                    setSelectedMasterAttributeId(attr.id);
                    setValueMappings({});
                  }}
                  className={`p-3 rounded border text-left ${
                    selectedMasterAttributeId === attr.id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-[#F7F7F7] border-[#EBEBEB]'
                  }`}
                >
                  <div className="font-medium">{attr.name.tr || attr.name.en || 'Unknown'}</div>
                  <div className="text-xs text-[#5C5C5C] mt-1">
                    {mapping?.channelAttributeIds.length} channel attribute(s)
                  </div>
                </button>
              );
            })}
        </div>
      </div>

      {/* Value Mapping Form */}
      {selectedMasterAttributeId && selectedMasterAttr && channelAttributeId && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">
              Map Values: {selectedMasterAttr.name.tr || selectedMasterAttr.name.en || 'Unknown'} →
              {channelAttribute?.name || 'Channel Attribute'}
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportMappings}
                className="btn btn-secondary flex items-center gap-2 text-sm"
                disabled={existingMappings.length === 0}
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={() => setShowBulkImport(true)}
                className="btn btn-secondary flex items-center gap-2 text-sm"
              >
                <Upload size={16} />
                Bulk Import
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {masterValues.length === 0 ? (
              <p className="text-[#5C5C5C] text-center py-4">
                No values defined for this attribute. Please add options in Attribute Management.
              </p>
            ) : (
              masterValues.map((masterValue) => {
                const existing = existingMappings.find(m => String(m.masterValue) === String(masterValue));
                return (
                  <div key={String(masterValue)} className="flex items-center gap-4 p-3 bg-[#F7F7F7] rounded">
                    <div className="w-32 font-medium">{String(masterValue)}</div>
                    <span className="text-[#A4A4A4]">→</span>
                    <input
                      type="text"
                      defaultValue={existing ? String(existing.channelValue) : ''}
                      onChange={(e) => {
                        setValueMappings({
                          ...valueMappings,
                          [masterValue]: e.target.value,
                        });
                      }}
                      className="input flex-1"
                      placeholder="Channel value"
                    />
                    {existing && (
                      <button
                        onClick={() => deleteAttributeValueMapping(existing.id)}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete existing mapping"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            {masterValues.length > 0 && (
              <div className="flex justify-end pt-4 border-t">
                <button onClick={handleSaveMappings} className="btn btn-primary">
                  <Plus size={18} />
                  Save Mappings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Existing Value Mappings */}
      {selectedMasterAttributeId && existingMappings.length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold mb-4">Existing Value Mappings</h4>
          <div className="space-y-2">
            {existingMappings.map((mapping) => (
              <div key={mapping.id} className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded">
                <div>
                  <span className="font-medium">{String(mapping.masterValue)}</span>
                  <span className="mx-2 text-[#A4A4A4]">→</span>
                  <span>{String(mapping.channelValue)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {mapping.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => deleteAttributeValueMapping(mapping.id)}
                    className="p-1 text-[#5C5C5C] hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && selectedMasterAttributeId && channelAttributeId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Bulk Import Value Mappings</h4>
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
                  Format: Master_Value, Channel_Value, Active
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

export default ValueMapping;


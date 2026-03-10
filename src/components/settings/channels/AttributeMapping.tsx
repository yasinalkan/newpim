import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Trash2, Download, Upload, X } from 'lucide-react';

interface AttributeMappingProps {
  selectedChannelId: string | null;
}

const AttributeMapping: React.FC<AttributeMappingProps> = ({ selectedChannelId }) => {
  const {
    channels,
    attributes,
    getChannelAttributes,
    attributeMappings,
    createAttributeMapping,
    deleteAttributeMapping,
  } = useData();
  const { currentUser } = useAuth();
  const [masterAttributeId, setMasterAttributeId] = useState<number | null>(null);
  const [selectedChannelAttributeIds, setSelectedChannelAttributeIds] = useState<string[]>([]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const channelAttributes = selectedChannelId ? getChannelAttributes(selectedChannelId) : [];
  const channelMappings = attributeMappings.filter(m => m.channelId === selectedChannelId);

  const handleSaveMapping = () => {
    if (!selectedChannelId || !masterAttributeId || selectedChannelAttributeIds.length === 0) {
      alert('Please select master attribute and at least one channel attribute');
      return;
    }

    createAttributeMapping({
      masterAttributeId,
      channelId: selectedChannelId,
      channelAttributeIds: selectedChannelAttributeIds,
      isActive: true,
      mappedBy: currentUser?.id || 1,
    });

    setMasterAttributeId(null);
    setSelectedChannelAttributeIds([]);
  };

  const handleExportMappings = () => {
    const data = channelMappings.map(mapping => {
      const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
      const channelAttrs = mapping.channelAttributeIds.map(id => 
        channelAttributes.find(a => a.id === id)
      ).filter(Boolean);
      return {
        Master_Attribute_ID: mapping.masterAttributeId,
        Master_Attribute_Name: masterAttr?.name.tr || masterAttr?.name.en || '',
        Channel_Attribute_IDs: mapping.channelAttributeIds.join(','),
        Channel_Attribute_Names: channelAttrs.map(a => a?.name).join(','),
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
    a.download = `attribute-mappings-${selectedChannelId}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
    let imported = 0;

    data.forEach((row, index) => {
      const masterId = row.Master_Attribute_ID || row.masterAttributeId;
      const masterName = row.Master_Attribute_Name || row.masterAttributeName;
      const channelIdsStr = row.Channel_Attribute_IDs || row.channelAttributeIds || '';
      const channelIds = channelIdsStr.split(',').map(id => id.trim()).filter(Boolean);

      let masterAttr = attributes.find(a => a.id === parseInt(masterId));
      if (!masterAttr && masterName) {
        masterAttr = attributes.find(a => 
          (a.name.tr || '').toLowerCase() === masterName.toLowerCase() ||
          (a.name.en || '').toLowerCase() === masterName.toLowerCase()
        );
      }

      if (!masterAttr) {
        errors.push(`Row ${index + 1}: Master attribute not found`);
        return;
      }

      const channelAttrs = channelIds.map(id => channelAttributes.find(a => a.id === id)).filter(Boolean);
      if (channelAttrs.length === 0) {
        errors.push(`Row ${index + 1}: No valid channel attributes found`);
        return;
      }

      const active = row.Active === 'true' || row.active === true;

      // Check if mapping exists
      const existing = channelMappings.find(
        m => m.masterAttributeId === masterAttr!.id && m.channelId === selectedChannelId
      );

      if (existing) {
        deleteAttributeMapping(existing.id);
      }

      createAttributeMapping({
        masterAttributeId: masterAttr.id,
        channelId: selectedChannelId,
        channelAttributeIds: channelAttrs.map(a => a!.id),
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

  const toggleChannelAttribute = (attrId: string) => {
    if (selectedChannelAttributeIds.includes(attrId)) {
      setSelectedChannelAttributeIds(selectedChannelAttributeIds.filter(id => id !== attrId));
    } else {
      setSelectedChannelAttributeIds([...selectedChannelAttributeIds, attrId]);
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
            Attribute Mapping: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Map master attributes to channel attributes (one-to-many supported)
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Master Attributes */}
        <div className="card p-4">
          <h4 className="font-semibold mb-4">Master Attributes</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {attributes.map((attr) => {
              const isMapped = channelMappings.some(m => m.masterAttributeId === attr.id);
              const mapping = channelMappings.find(m => m.masterAttributeId === attr.id);
              return (
                <div
                  key={attr.id}
                  className={`p-3 rounded cursor-pointer border ${
                    masterAttributeId === attr.id
                      ? 'bg-primary/10 border-primary'
                      : isMapped
                      ? 'bg-green-50 border-green-200'
                      : 'hover:bg-[#F7F7F7] border-[#EBEBEB]'
                  }`}
                  onClick={() => {
                    setMasterAttributeId(attr.id);
                    if (mapping) {
                      setSelectedChannelAttributeIds(mapping.channelAttributeIds);
                    } else {
                      setSelectedChannelAttributeIds([]);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {attr.name.tr || attr.name.en || 'Unknown'}
                    </span>
                    <span className="badge badge-info text-xs capitalize">{attr.type}</span>
                  </div>
                  {isMapped && (
                    <p className="text-xs text-green-600 mt-1">
                      Mapped to {mapping?.channelAttributeIds.length} channel attribute(s)
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel Attributes */}
        <div className="card p-4">
          <h4 className="font-semibold mb-4">Channel Attributes</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {channelAttributes.length === 0 ? (
              <p className="text-[#5C5C5C] text-center py-8">No channel attributes defined</p>
            ) : (
              channelAttributes.map((attr) => (
                <label
                  key={attr.id}
                  className={`flex items-center gap-2 p-3 rounded cursor-pointer border ${
                    selectedChannelAttributeIds.includes(attr.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-[#F7F7F7] border-[#EBEBEB]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedChannelAttributeIds.includes(attr.id)}
                    onChange={() => toggleChannelAttribute(attr.id)}
                    className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{attr.name}</span>
                    <span className="badge badge-info text-xs ml-2 capitalize">{attr.type}</span>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mapping Actions */}
      {masterAttributeId && selectedChannelAttributeIds.length > 0 && (
        <div className="card p-4 bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171717]">Ready to create mapping</p>
              <p className="text-xs text-[#5C5C5C] mt-1">
                Master: {attributes.find(a => a.id === masterAttributeId)?.name.tr || attributes.find(a => a.id === masterAttributeId)?.name.en || 'Unknown'} →
                Channel: {selectedChannelAttributeIds.length} attribute(s)
              </p>
            </div>
            <button onClick={handleSaveMapping} className="btn btn-primary">
              <Plus size={18} />
              Save Mapping
            </button>
          </div>
        </div>
      )}

      {/* Existing Mappings */}
      <div className="card p-4">
        <h4 className="font-semibold mb-4">Existing Mappings ({channelMappings.length})</h4>
        {channelMappings.length === 0 ? (
          <p className="text-[#5C5C5C] text-center py-4">No mappings created yet</p>
        ) : (
          <div className="space-y-2">
            {channelMappings.map((mapping) => {
              const masterAttr = attributes.find(a => a.id === mapping.masterAttributeId);
              return (
                <div key={mapping.id} className="flex items-center justify-between p-3 bg-[#F7F7F7] rounded">
                  <div>
                    <span className="font-medium">
                      {masterAttr?.name.tr || masterAttr?.name.en || 'Unknown'}
                    </span>
                    <span className="mx-2 text-[#A4A4A4]">→</span>
                    <span className="text-sm text-[#5C5C5C]">
                      {mapping.channelAttributeIds.length} channel attribute(s)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${mapping.isActive ? 'badge-success' : 'badge-danger'}`}>
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => deleteAttributeMapping(mapping.id)}
                      className="p-1 text-[#5C5C5C] hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Bulk Import Attribute Mappings</h4>
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
                  Format: Master_Attribute_ID, Master_Attribute_Name, Channel_Attribute_IDs (comma-separated), Active
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

export default AttributeMapping;


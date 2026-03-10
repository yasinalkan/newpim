import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { Settings as SettingsIcon, ArrowRight } from 'lucide-react';
import CategoryMapping from '../components/settings/channels/CategoryMapping';

const CategoryMappingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { channels } = useData();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <SettingsIcon size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">You don't have permission for this action</h3>
        </div>
      </div>
    );
  }

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">Category Mapping</h1>
        <p className="text-[#5C5C5C]">Map your master categories to channel-specific categories</p>
      </div>

      {/* Channel Selection */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1 min-w-[250px]">
            <label className="label text-xs mb-1">Select Channel</label>
            <select
              value={selectedChannelId || ''}
              onChange={(e) => setSelectedChannelId(e.target.value || null)}
              className="input"
            >
              <option value="">-- Select a Channel --</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name} {channel.isActive ? '(Active)' : '(Inactive)'}
                </option>
              ))}
            </select>
          </div>
          {selectedChannel && (
            <div className="text-sm text-[#5C5C5C] flex items-center gap-2">
              <span className="font-medium">{selectedChannel.name}</span>
              <span className={`badge ${selectedChannel.isActive ? 'badge-success' : 'badge-danger'}`}>
                {selectedChannel.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Category Mapping Component */}
      {selectedChannelId ? (
        <CategoryMapping selectedChannelId={selectedChannelId} />
      ) : (
        <div className="card p-12 text-center">
          <ArrowRight size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">Select a Channel</h3>
          <p className="text-[#5C5C5C]">
            Please select a channel from the dropdown above to manage category mappings.
          </p>
        </div>
      )}
    </div>
  );
};

export default CategoryMappingPage;

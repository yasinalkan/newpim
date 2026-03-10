import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { 
  Plus, 
  Settings as SettingsIcon,
  FolderTree,
  Tags,
  CheckCircle,
  Edit2
} from 'lucide-react';
import ChannelCategoryManagement from './channels/ChannelCategoryManagement';
import ChannelAttributeManagement from './channels/ChannelAttributeManagement';
import MappingValidation from './channels/MappingValidation';

type ChannelTab = 'categories' | 'attributes' | 'validation';

const ChannelManagement: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { channels } = useData();

  const [activeTab, setActiveTab] = useState<ChannelTab>('categories');
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

  const tabs = [
    { id: 'categories' as ChannelTab, label: 'Category Structures', icon: FolderTree },
    { id: 'attributes' as ChannelTab, label: 'Attribute Lists', icon: Tags },
    { id: 'validation' as ChannelTab, label: 'Validation', icon: CheckCircle },
  ];

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  return (
    <div className="space-y-6">
      {/* Header with Channel Selection */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#171717] mb-2">Channel Management</h2>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1 min-w-[250px]">
                <label className="label text-xs mb-1">Select Channel</label>
                <div className="flex gap-2">
                  <select
                    value={selectedChannelId || ''}
                    onChange={(e) => {
                      setSelectedChannelId(e.target.value || null);
                    }}
                    className="input flex-1"
                  >
                    <option value="">-- Select a Channel --</option>
                    {channels.map((channel) => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name} {channel.isActive ? '(Active)' : '(Inactive)'}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => navigate('/channels/new')}
                    className="btn btn-secondary whitespace-nowrap"
                    title="Add New Channel"
                  >
                    <Plus size={18} />
                  </button>
                  {selectedChannelId && (
                    <button
                      onClick={() => navigate(`/channels/${selectedChannelId}/edit`)}
                      className="btn btn-secondary whitespace-nowrap"
                      title="Edit Channel"
                    >
                      <Edit2 size={18} />
                    </button>
                  )}
                </div>
              </div>
              {selectedChannel && (
                <div className="text-sm text-[#5C5C5C]">
                  <span className="font-medium">{selectedChannel.name}</span>
                  <span className={`badge ml-2 ${selectedChannel.isActive ? 'badge-success' : 'badge-danger'}`}>
                    {selectedChannel.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {selectedChannelId && (
        <>
          <div className="border-b border-[#EBEBEB]">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? 'border-primary text-primary'
                          : 'border-transparent text-[#5C5C5C] hover:text-[#5C5C5C] hover:border-[#EBEBEB]'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'categories' && (
              <ChannelCategoryManagement selectedChannelId={selectedChannelId} />
            )}
            {activeTab === 'attributes' && (
              <ChannelAttributeManagement selectedChannelId={selectedChannelId} />
            )}
            {activeTab === 'validation' && (
              <MappingValidation selectedChannelId={selectedChannelId} />
            )}
          </div>
        </>
      )}

      {/* No Channel Selected Message */}
      {!selectedChannelId && (
        <div className="card p-12 text-center">
          <SettingsIcon size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">Select a Channel</h3>
          <p className="text-[#5C5C5C]">
            Please select a channel from the dropdown above to manage its settings, mappings, and exports.
          </p>
        </div>
      )}
    </div>
  );
};

export default ChannelManagement;


import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { Edit, Trash2, Power, PowerOff, Settings as SettingsIcon, FolderTree, Tags } from 'lucide-react';

interface ChannelListProps {
  onEdit: (channelId: string) => void;
  onSelectChannel: (channelId: string | null) => void;
}

const ChannelList: React.FC<ChannelListProps> = ({ onEdit, onSelectChannel }) => {
  const { channels, deleteChannel, updateChannel, categoryMappings, attributeMappings } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!channel.name.toLowerCase().includes(query) && !channel.type.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && channel.isActive !== (statusFilter === 'active')) {
        return false;
      }
      return true;
    });
  }, [channels, searchQuery, statusFilter]);

  const getMappingStats = (channelId: string) => {
    const catMappings = categoryMappings.filter(m => m.channelId === channelId && m.isActive);
    const attrMappings = attributeMappings.filter(m => m.channelId === channelId && m.isActive);
    return {
      categories: catMappings.length,
      attributes: attrMappings.length,
    };
  };

  const handleDelete = (channelId: string) => {
    if (window.confirm('Are you sure you want to delete this channel? This will also delete all mappings.')) {
      deleteChannel(channelId);
    }
  };

  const handleToggleActive = (channelId: string) => {
    const channel = channels.find(c => c.id === channelId);
    if (channel) {
      updateChannel(channelId, { isActive: !channel.isActive });
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter */}
      <div className="card p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search channels..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="input w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Channel Grid */}
      {filteredChannels.length === 0 ? (
        <div className="card p-12 text-center">
          <SettingsIcon size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <p className="text-[#5C5C5C]">No channels found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChannels.map((channel) => {
            const stats = getMappingStats(channel.id);
            return (
              <div key={channel.id} className="card p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {channel.logoUrl ? (
                      <img src={channel.logoUrl} alt={channel.name} className="w-12 h-12 rounded" />
                    ) : (
                      <div className="w-12 h-12 bg-white rounded flex items-center justify-center">
                        <SettingsIcon size={24} className="text-[#A4A4A4]" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-[#171717]">{channel.name}</h3>
                      <p className="text-sm text-[#5C5C5C] capitalize">{channel.type}</p>
                    </div>
                  </div>
                  <span
                    className={`badge ${channel.isActive ? 'badge-success' : 'badge-danger'}`}
                  >
                    {channel.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {channel.description && (
                  <p className="text-sm text-[#5C5C5C] mb-4">{channel.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-[#5C5C5C] mb-4">
                  <div className="flex items-center gap-1">
                    <FolderTree size={16} />
                    <span>{stats.categories} categories</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tags size={16} />
                    <span>{stats.attributes} attributes</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-[#EBEBEB]">
                  <button
                    onClick={() => onSelectChannel(channel.id)}
                    className="btn btn-secondary text-xs flex-1"
                  >
                    Manage
                  </button>
                  <button
                    onClick={() => onEdit(channel.id)}
                    className="p-2 text-[#5C5C5C] hover:text-primary rounded"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(channel.id)}
                    className={`p-2 rounded ${channel.isActive ? 'text-[#5C5C5C] hover:text-orange-600' : 'text-[#5C5C5C] hover:text-green-600'}`}
                    title={channel.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {channel.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                  </button>
                  <button
                    onClick={() => handleDelete(channel.id)}
                    className="p-2 text-[#5C5C5C] hover:text-red-600 rounded"
                    title="Delete"
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
  );
};

export default ChannelList;


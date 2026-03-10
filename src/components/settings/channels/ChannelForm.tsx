import React, { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { X } from 'lucide-react';

interface ChannelFormProps {
  channelId: string | null;
  onClose: () => void;
  onSave: () => void;
}

const ChannelForm: React.FC<ChannelFormProps> = ({ channelId, onClose, onSave }) => {
  const { channels, createChannel, updateChannel, getChannel } = useData();
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'marketplace',
    description: '',
    logoUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (channelId) {
      const channel = getChannel(channelId);
      if (channel) {
        setFormData({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          description: channel.description || '',
          logoUrl: channel.logoUrl || '',
          isActive: channel.isActive,
        });
      }
    }
  }, [channelId, getChannel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a channel name');
      return;
    }

    if (!channelId && !formData.id.trim()) {
      alert('Please enter a channel ID');
      return;
    }

    if (channelId) {
      updateChannel(channelId, formData);
    } else {
      // Check if ID already exists
      if (channels.find(c => c.id === formData.id)) {
        alert('Channel ID already exists');
        return;
      }
      createChannel({
        ...formData,
        id: formData.id.toLowerCase().replace(/\s+/g, '_'),
        configuration: {
          apiEndpoint: null,
          apiCredentials: null,
          authMethod: null,
          exportFormat: 'csv',
          exportFrequency: 'manual',
          requirements: {
            requiredFields: [],
            fieldLengths: {},
            specialRules: [],
          },
        },
      });
    }

    onSave();
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#171717]">
          {channelId ? 'Edit Channel' : 'Create New Channel'}
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-[#A4A4A4] hover:text-[#5C5C5C] rounded"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Channel ID *</label>
            <input
              type="text"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              className="input"
              placeholder="e.g., amazon, ebay, shopify"
              disabled={!!channelId}
              required
            />
            <p className="text-xs text-[#5C5C5C] mt-1">Lowercase, no spaces (e.g., amazon, ebay)</p>
          </div>
          <div>
            <label className="label">Channel Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="e.g., Amazon, eBay, Shopify"
              required
            />
          </div>
          <div>
            <label className="label">Channel Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="input"
            >
              <option value="marketplace">Marketplace</option>
              <option value="e-commerce">E-Commerce</option>
              <option value="retail">Retail</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Logo URL</label>
            <input
              type="url"
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              className="input"
              placeholder="https://example.com/logo.png"
            />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="input"
            rows={3}
            placeholder="Channel description..."
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
          />
          <label className="text-sm text-[#5C5C5C]">Active (enabled for export)</label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            {channelId ? 'Update' : 'Create'} Channel
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChannelForm;


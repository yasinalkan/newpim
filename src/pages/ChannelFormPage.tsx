import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';

const ChannelFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const { channels, createChannel, updateChannel, getChannel } = useData();
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    type: 'marketplace',
    description: '',
    logoUrl: '',
    isActive: true,
  });

  const isEditMode = !!id;

  useEffect(() => {
    if (id) {
      const channel = getChannel(id);
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
  }, [id, getChannel]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a channel name');
      return;
    }

    if (!id && !formData.id.trim()) {
      alert('Please enter a channel ID');
      return;
    }

    if (id) {
      updateChannel(id, formData);
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

    navigate('/channels');
  };

  return (
    <div className="space-y-6">

      {/* Form */}
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="label">Channel ID *</label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                className="input"
                placeholder="e.g., amazon, ebay, shopify"
                disabled={!!id}
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
              rows={4}
              placeholder="Channel description..."
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm text-[#5C5C5C]">
              Active (enabled for export)
            </label>
          </div>
          
          <div className="flex gap-3 pt-4 border-t border-[#EBEBEB]">
            <button type="submit" className="btn btn-primary">
              {isEditMode ? 'Update Channel' : 'Create Channel'}
            </button>
            <button 
              type="button" 
              onClick={() => navigate('/channels')} 
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelFormPage;

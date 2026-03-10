import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Plus } from 'lucide-react';
import ChannelManagement from '../components/settings/ChannelManagement';

const ChannelsPage: React.FC = () => {
  const { currentUser } = useAuth();

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

  return (
    <div className="space-y-6">
      {/* Action Button */}
      <div className="flex items-center justify-end">
        <Link 
          to="/channels/new" 
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary rounded-[10px] text-white text-sm font-medium leading-5 tracking-[-0.006em] hover:bg-primary-hover transition-colors"
        >
          <Plus size={20} />
          Create Channel
        </Link>
      </div>

      {/* Channel Management Component */}
      <ChannelManagement />
    </div>
  );
};

export default ChannelsPage;


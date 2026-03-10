import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Globe } from 'lucide-react';

import ValidationRules from '../components/settings/ValidationRules';
import LanguageManagement from '../components/settings/LanguageManagement';

const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'validation' | 'languages'>('validation');

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
    { id: 'validation', label: 'Validation Rules', icon: SettingsIcon },
    { id: 'languages', label: 'Languages', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-[#EBEBEB]">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
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
        {activeTab === 'validation' && <ValidationRules />}
        {activeTab === 'languages' && <LanguageManagement />}
      </div>
    </div>
  );
};

export default SettingsPage;

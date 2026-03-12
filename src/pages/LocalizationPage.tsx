import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Globe, DollarSign, Ruler, ArrowLeft } from 'lucide-react';

import LanguageManagement from '../components/settings/LanguageManagement';
import CurrencyManagement from '../components/settings/CurrencyManagement';
import UnitManagement from '../components/settings/UnitManagement';

const LocalizationPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'languages' | 'currencies' | 'units'>('languages');

  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Globe size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">You don't have permission for this action</h3>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'languages',  label: 'Languages',  icon: Globe         },
    { id: 'currencies', label: 'Currencies', icon: DollarSign    },
    { id: 'units',      label: 'Units',      icon: Ruler         },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <div>
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 text-[#5C5C5C] hover:text-[#171717] transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Settings
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">Localization</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">
          Manage languages, currencies, and measurement units for your product catalog
        </p>
      </div>

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
        {activeTab === 'languages'  && <LanguageManagement />}
        {activeTab === 'currencies' && <CurrencyManagement />}
        {activeTab === 'units'      && <UnitManagement />}
      </div>
    </div>
  );
};

export default LocalizationPage;

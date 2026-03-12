import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Settings as SettingsIcon, Globe, SlidersHorizontal } from 'lucide-react';

import ValidationRules from '../components/settings/ValidationRules';

const SettingsPage: React.FC = () => {
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#171717]">Settings</h1>
        <p className="text-sm text-[#5C5C5C] mt-1">
          Configure validation rules and system preferences
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to="/settings/localization"
          className="card p-6 hover:shadow-md transition-shadow flex items-start gap-4 group"
        >
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <Globe size={24} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#171717]">Localization</h2>
            <p className="text-sm text-[#5C5C5C] mt-1">
              Manage languages, currencies, and measurement units
            </p>
          </div>
        </Link>

        <div className="card p-6 border-2 border-dashed border-[#EBEBEB]">
          <div className="w-12 h-12 rounded-lg bg-[#F7F7F7] flex items-center justify-center mb-3">
            <SlidersHorizontal size={24} className="text-[#5C5C5C]" />
          </div>
          <h2 className="text-lg font-semibold text-[#171717]">Validation Rules</h2>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Product validation and field requirements
          </p>
        </div>
      </div>

      {/* Validation Rules (inline) */}
      <div>
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Validation Rules</h2>
        <ValidationRules />
      </div>
    </div>
  );
};

export default SettingsPage;

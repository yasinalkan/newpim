import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, Globe, Check, X } from 'lucide-react';
import type { Language } from '../../types';

const LanguageManagement: React.FC = () => {
  const { settings, updateSettings } = useData();
  const { currentUser } = useAuth();
  const [isAddingLanguage, setIsAddingLanguage] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<Language | null>(null);
  const [applyToChannels, setApplyToChannels] = useState(false);
  const [newLanguage, setNewLanguage] = useState({
    code: '',
    name: '',
    nativeName: '',
    isDefault: false,
    isActive: true,
  });

  const languages = settings.languages || [];

  const handleAddLanguage = () => {
    if (!newLanguage.code || !newLanguage.name || !newLanguage.nativeName) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if language code already exists
    if (languages.some(lang => lang.code.toLowerCase() === newLanguage.code.toLowerCase())) {
      alert('A language with this code already exists');
      return;
    }

    const language: Language = {
      id: Math.max(0, ...languages.map(l => l.id)) + 1,
      code: newLanguage.code.toLowerCase(),
      name: newLanguage.name,
      nativeName: newLanguage.nativeName,
      isDefault: newLanguage.isDefault,
      isActive: newLanguage.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // If this is set as default, unset other defaults
    let updatedLanguages = languages;
    if (language.isDefault) {
      updatedLanguages = languages.map(lang => ({
        ...lang,
        isDefault: false,
      }));
    }

    const newLanguages = [...updatedLanguages, language];

    updateSettings({
      ...settings,
      languages: newLanguages,
    }, applyToChannels ? newLanguage.code : undefined);

    // Reset form
    setNewLanguage({
      code: '',
      name: '',
      nativeName: '',
      isDefault: false,
      isActive: true,
    });
    setApplyToChannels(false);
    setIsAddingLanguage(false);
  };

  const handleUpdateLanguage = () => {
    if (!editingLanguage) return;

    // If this is set as default, unset other defaults
    let updatedLanguages = languages.map(lang =>
      lang.id === editingLanguage.id
        ? { ...editingLanguage, updatedAt: new Date().toISOString() }
        : editingLanguage.isDefault
        ? { ...lang, isDefault: false }
        : lang
    );

    updateSettings({
      ...settings,
      languages: updatedLanguages,
    });

    setEditingLanguage(null);
  };

  const handleDeleteLanguage = (languageId: number) => {
    const language = languages.find(l => l.id === languageId);
    
    if (language?.isDefault) {
      alert('Cannot delete the default language. Please set another language as default first.');
      return;
    }

    if (!confirm(`Are you sure you want to delete the language "${language?.name}"? This action cannot be undone.`)) {
      return;
    }

    const updatedLanguages = languages.filter(l => l.id !== languageId);

    updateSettings({
      ...settings,
      languages: updatedLanguages,
    });
  };

  const handleToggleActive = (languageId: number) => {
    const language = languages.find(l => l.id === languageId);
    
    if (language?.isDefault && language.isActive) {
      alert('Cannot deactivate the default language.');
      return;
    }

    const updatedLanguages = languages.map(lang =>
      lang.id === languageId
        ? { ...lang, isActive: !lang.isActive, updatedAt: new Date().toISOString() }
        : lang
    );

    updateSettings({
      ...settings,
      languages: updatedLanguages,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#171717]">Languages</h2>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Manage system languages and localization settings
          </p>
        </div>
        <button
          onClick={() => setIsAddingLanguage(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
        >
          <Plus size={18} />
          Add Language
        </button>
      </div>

      {/* Add Language Form */}
      {isAddingLanguage && (
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold text-[#171717]">Add New Language</h3>
            <button
              onClick={() => {
                setIsAddingLanguage(false);
                setNewLanguage({
                  code: '',
                  name: '',
                  nativeName: '',
                  isDefault: false,
                  isActive: true,
                });
                setApplyToChannels(false);
              }}
              className="text-[#A4A4A4] hover:text-[#171717]"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Language Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., de, fr, es"
                value={newLanguage.code}
                onChange={(e) => setNewLanguage({ ...newLanguage, code: e.target.value })}
                className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., German"
                value={newLanguage.name}
                onChange={(e) => setNewLanguage({ ...newLanguage, name: e.target.value })}
                className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Native Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Deutsch"
                value={newLanguage.nativeName}
                onChange={(e) => setNewLanguage({ ...newLanguage, nativeName: e.target.value })}
                className="w-full px-3 py-2 border border-[#EBEBEB] rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newLanguage.isDefault}
                onChange={(e) => setNewLanguage({ ...newLanguage, isDefault: e.target.checked })}
                className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
              />
              <span className="text-sm text-[#171717]">Set as default language</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={applyToChannels}
                onChange={(e) => setApplyToChannels(e.target.checked)}
                className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
              />
              <span className="text-sm text-[#171717]">Apply to existing channels</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsAddingLanguage(false);
                setNewLanguage({
                  code: '',
                  name: '',
                  nativeName: '',
                  isDefault: false,
                  isActive: true,
                });
                setApplyToChannels(false);
              }}
              className="px-4 py-2 text-[#5C5C5C] hover:text-[#171717] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddLanguage}
              className="px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
            >
              Add Language
            </button>
          </div>
        </div>
      )}

      {/* Languages List */}
      <div className="bg-white border border-[#EBEBEB] rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-[#EBEBEB]">
          <thead className="bg-[#FAFAFA]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Language
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Native Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Default
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#EBEBEB]">
            {languages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#A4A4A4]">
                  <Globe size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No languages configured</p>
                  <p className="text-sm mt-1">Add a language to get started</p>
                </td>
              </tr>
            ) : (
              languages.map((language) => (
                <tr key={language.id} className="hover:bg-[#FAFAFA]">
                  {editingLanguage?.id === language.id ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={editingLanguage.name}
                          onChange={(e) => setEditingLanguage({ ...editingLanguage, name: e.target.value })}
                          className="w-full px-2 py-1 border border-[#EBEBEB] rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={editingLanguage.code}
                          disabled
                          className="w-20 px-2 py-1 border border-[#EBEBEB] rounded bg-[#FAFAFA] text-[#A4A4A4]"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={editingLanguage.nativeName}
                          onChange={(e) => setEditingLanguage({ ...editingLanguage, nativeName: e.target.value })}
                          className="w-full px-2 py-1 border border-[#EBEBEB] rounded focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingLanguage.isActive}
                            onChange={(e) => setEditingLanguage({ ...editingLanguage, isActive: e.target.checked })}
                            className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingLanguage.isDefault}
                            onChange={(e) => setEditingLanguage({ ...editingLanguage, isDefault: e.target.checked })}
                            className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
                          />
                          <span className="text-sm">Default</span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={handleUpdateLanguage}
                            className="p-1 text-primary hover:bg-[#E6F7EF] rounded transition-colors"
                            title="Save"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => setEditingLanguage(null)}
                            className="p-1 text-[#A4A4A4] hover:bg-[#FAFAFA] rounded transition-colors"
                            title="Cancel"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe size={16} className="text-[#A4A4A4]" />
                          <span className="text-sm font-medium text-[#171717]">{language.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAFAFA] text-[#5C5C5C] uppercase">
                          {language.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5C5C5C]">
                        {language.nativeName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(language.id)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            language.isActive
                              ? 'bg-[#E6F7EF] text-primary'
                              : 'bg-[#FEF3F2] text-[#F04438]'
                          }`}
                        >
                          {language.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {language.isDefault && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF8FF] text-[#2E90FA]">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingLanguage(language)}
                            className="p-1 text-[#5C5C5C] hover:text-primary hover:bg-[#E6F7EF] rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          {!language.isDefault && (
                            <button
                              onClick={() => handleDeleteLanguage(language.id)}
                              className="p-1 text-[#5C5C5C] hover:text-[#F04438] hover:bg-[#FEF3F2] rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Info Box */}
      <div className="bg-[#EFF8FF] border border-[#B2DDFF] rounded-lg p-4">
        <p className="text-sm text-[#175CD3]">
          <strong>Note:</strong> When adding a new language, you can choose to apply it to existing channels. 
          This will add the new language fields to channel categories and attributes, making them available 
          for translation. New languages in attributes are optional by default.
        </p>
      </div>
    </div>
  );
};

export default LanguageManagement;

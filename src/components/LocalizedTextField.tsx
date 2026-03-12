import React, { useState } from 'react';
import { Globe, Check, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import type { MultiLangText } from '../types';

interface LocalizedTextFieldProps {
  label: string;
  value: MultiLangText;
  onChange: (value: MultiLangText) => void;
  required?: boolean;
  error?: string;
  type?: 'input' | 'textarea';
  placeholder?: string;
  rows?: number;
  helpText?: string;
}

const LocalizedTextField: React.FC<LocalizedTextFieldProps> = ({
  label,
  value,
  onChange,
  required = false,
  error,
  type = 'input',
  placeholder,
  rows = 3,
  helpText,
}) => {
  const { activeLanguages, defaultLanguage } = useLanguage();
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(
    new Set([defaultLanguage?.code || 'en'])
  );

  const toggleLanguage = (langCode: string) => {
    const newExpanded = new Set(expandedLanguages);
    if (newExpanded.has(langCode)) {
      // Don't allow collapsing the default language
      if (langCode !== defaultLanguage?.code) {
        newExpanded.delete(langCode);
      }
    } else {
      newExpanded.add(langCode);
    }
    setExpandedLanguages(newExpanded);
  };

  const handleChange = (langCode: string, text: string) => {
    onChange({
      ...value,
      [langCode]: text,
    });
  };

  const getFieldStatus = (langCode: string) => {
    const text = value[langCode] || '';
    const isDefaultLang = langCode === defaultLanguage?.code;
    
    if (text.trim()) {
      return { icon: Check, color: 'text-green-600', bg: 'bg-green-50' };
    } else if (isDefaultLang && required) {
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' };
    }
    return null;
  };

  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="label">
          <Globe size={16} className="inline mr-2 text-[#A4A4A4]" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {helpText && (
          <span className="text-xs text-[#A4A4A4]">{helpText}</span>
        )}
      </div>

      {/* Language Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {activeLanguages.map((lang) => {
          const isExpanded = expandedLanguages.has(lang.code);
          const isDefault = lang.code === defaultLanguage?.code;
          const status = getFieldStatus(lang.code);
          const hasValue = value[lang.code]?.trim();

          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => toggleLanguage(lang.code)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isExpanded
                  ? 'bg-primary text-white'
                  : hasValue
                  ? 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-[#F7F7F7] text-[#5C5C5C] hover:bg-[#EBEBEB]'
              }`}
            >
              <span className="uppercase">{lang.code}</span>
              {isDefault && (
                <span className="text-xs opacity-75">(default)</span>
              )}
              {!isExpanded && status && (
                <status.icon size={14} className={status.color} />
              )}
            </button>
          );
        })}
      </div>

      {/* Input Fields */}
      <div className="space-y-3">
        {activeLanguages
          .filter((lang) => expandedLanguages.has(lang.code))
          .map((lang) => {
            const isDefault = lang.code === defaultLanguage?.code;
            const status = getFieldStatus(lang.code);
            const fieldValue = value[lang.code] || '';

            return (
              <div key={lang.code} className="relative">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[#5C5C5C]">
                        {lang.nativeName} ({lang.name})
                        {isDefault && (
                          <span className="ml-2 text-primary">• Default</span>
                        )}
                      </span>
                      {status && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${status.bg}`}>
                          <status.icon size={12} className={status.color} />
                          <span className={`text-xs ${status.color}`}>
                            {fieldValue.trim() ? 'Complete' : 'Required'}
                          </span>
                        </div>
                      )}
                    </div>

                    {type === 'textarea' ? (
                      <textarea
                        value={fieldValue}
                        onChange={(e) => handleChange(lang.code, e.target.value)}
                        className={`input min-h-[${rows * 24}px] ${
                          error && isDefault ? 'border-red-500' : ''
                        }`}
                        placeholder={placeholder || `Enter ${label.toLowerCase()} in ${lang.name}...`}
                        rows={rows}
                      />
                    ) : (
                      <input
                        type="text"
                        value={fieldValue}
                        onChange={(e) => handleChange(lang.code, e.target.value)}
                        className={`input ${
                          error && isDefault ? 'border-red-500' : ''
                        }`}
                        placeholder={placeholder || `Enter ${label.toLowerCase()} in ${lang.name}...`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          {error}
        </p>
      )}

      {/* Translation Status Summary */}
      <div className="flex items-center gap-4 text-xs text-[#5C5C5C] pt-1">
        <span>
          Completed: {activeLanguages.filter(lang => value[lang.code]?.trim()).length} / {activeLanguages.length} languages
        </span>
        {activeLanguages.length > expandedLanguages.size && (
          <button
            type="button"
            onClick={() => setExpandedLanguages(new Set(activeLanguages.map(l => l.code)))}
            className="text-primary hover:text-primary-hover font-medium"
          >
            Expand all languages
          </button>
        )}
      </div>
    </div>
  );
};

export default LocalizedTextField;

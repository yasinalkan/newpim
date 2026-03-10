import React, { useState, useEffect } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { X } from 'lucide-react';
import type { ChannelValidationRule } from '../../../types';

interface ValidationRuleFormProps {
  ruleId?: number | null;
  channelId: string | null;
  onClose: () => void;
  onSave: () => void;
}

const ValidationRuleForm: React.FC<ValidationRuleFormProps> = ({ ruleId, channelId, onClose, onSave }) => {
  const { channelValidationRules, createChannelValidationRule, updateChannelValidationRule, attributes, channels } = useData();
  const { currentUser } = useAuth();

  const existingRule = ruleId ? channelValidationRules.find(r => r.id === ruleId) : null;

  const [formData, setFormData] = useState({
    name: existingRule?.name || '',
    type: existingRule?.type || 'completeness' as ChannelValidationRule['type'],
    severity: existingRule?.severity || 'warning' as ChannelValidationRule['severity'],
    isActive: existingRule?.isActive ?? true,
      channelId: existingRule?.channelId || channelId || null,
    condition: {
      checkType: existingRule?.condition.checkType || 'required' as ChannelValidationRule['condition']['checkType'],
      target: existingRule?.condition.target || 'category' as ChannelValidationRule['condition']['target'],
      attributeId: existingRule?.condition.attributeId || undefined,
      channelAttributeId: existingRule?.condition.channelAttributeId || undefined,
      pattern: existingRule?.condition.pattern || '',
      min: existingRule?.condition.min || undefined,
      max: existingRule?.condition.max || undefined,
      customExpression: existingRule?.condition.customExpression || '',
    },
    message: existingRule?.message || '',
  });

  useEffect(() => {
    if (existingRule) {
      setFormData({
        name: existingRule.name,
        type: existingRule.type,
        severity: existingRule.severity,
        isActive: existingRule.isActive,
        channelId: existingRule.channelId,
        condition: existingRule.condition,
        message: existingRule.message,
      });
    }
  }, [existingRule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (!formData.message.trim()) {
      alert('Please enter a validation message');
      return;
    }

    const ruleData: Omit<ChannelValidationRule, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      type: formData.type,
      severity: formData.severity,
      isActive: formData.isActive,
      channelId: formData.channelId || null,
      condition: {
        checkType: formData.condition.checkType,
        target: formData.condition.target,
        attributeId: formData.condition.attributeId,
        channelAttributeId: formData.condition.channelAttributeId,
        pattern: formData.condition.pattern || undefined,
        min: formData.condition.min,
        max: formData.condition.max,
        customExpression: formData.condition.customExpression || undefined,
      },
      message: formData.message.trim(),
      createdBy: currentUser?.id || 1,
    };

    if (ruleId && existingRule) {
      updateChannelValidationRule(ruleId, ruleData);
    } else {
      createChannelValidationRule(ruleData);
    }

    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#EBEBEB] px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#171717]">
            {ruleId ? 'Edit Validation Rule' : 'Create New Validation Rule'}
          </h3>
          <button
            onClick={onClose}
            className="text-[#A4A4A4] hover:text-[#5C5C5C]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="font-medium text-[#171717]">Basic Information</h4>
            
            <div>
              <label className="label">Rule Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., All products must have category mapping"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Rule Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ChannelValidationRule['type'] })}
                  className="input"
                  required
                >
                  <option value="category">Category</option>
                  <option value="attribute">Attribute</option>
                  <option value="value">Value</option>
                  <option value="completeness">Completeness</option>
                  <option value="type-compatibility">Type Compatibility</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="label">Severity *</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as ChannelValidationRule['severity'] })}
                  className="input"
                  required
                >
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label">Channel</label>
              <select
                value={formData.channelId || ''}
                onChange={(e) => setFormData({ ...formData, channelId: e.target.value || null })}
                className="input"
              >
                <option value="">All Channels (Global)</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#5C5C5C] mt-1">Leave empty for global rules that apply to all channels</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="checkbox"
              />
              <label htmlFor="isActive" className="text-sm text-[#5C5C5C] cursor-pointer">
                Rule is active
              </label>
            </div>
          </div>

          {/* Condition Configuration */}
          <div className="space-y-4">
            <h4 className="font-medium text-[#171717]">Condition Configuration</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Check Type *</label>
                <select
                  value={formData.condition.checkType}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, checkType: e.target.value as ChannelValidationRule['condition']['checkType'] }
                  })}
                  className="input"
                  required
                >
                  <option value="required">Required</option>
                  <option value="format">Format</option>
                  <option value="range">Range</option>
                  <option value="pattern">Pattern</option>
                  <option value="custom">Custom Expression</option>
                </select>
              </div>

              <div>
                <label className="label">Target *</label>
                <select
                  value={formData.condition.target}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, target: e.target.value as ChannelValidationRule['condition']['target'] }
                  })}
                  className="input"
                  required
                >
                  <option value="category">Category</option>
                  <option value="attribute">Attribute</option>
                  <option value="value">Value</option>
                  <option value="mapping">Mapping</option>
                </select>
              </div>
            </div>

            {formData.condition.target === 'attribute' && (
              <div>
                <label className="label">Master Attribute</label>
                <select
                  value={formData.condition.attributeId || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, attributeId: e.target.value ? Number(e.target.value) : undefined }
                  })}
                  className="input"
                >
                  <option value="">All Attributes</option>
                  {attributes.map((attr) => (
                    <option key={attr.id} value={attr.id}>
                      {attr.name.tr || attr.name.en || `Attribute ${attr.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.condition.checkType === 'pattern' && (
              <div>
                <label className="label">Pattern (Regex)</label>
                <input
                  type="text"
                  value={formData.condition.pattern}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, pattern: e.target.value }
                  })}
                  className="input"
                  placeholder="e.g., ^[A-Z0-9]+$"
                />
              </div>
            )}

            {formData.condition.checkType === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Minimum Value</label>
                  <input
                    type="number"
                    value={formData.condition.min || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      condition: { ...formData.condition, min: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Maximum Value</label>
                  <input
                    type="number"
                    value={formData.condition.max || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      condition: { ...formData.condition, max: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    className="input"
                  />
                </div>
              </div>
            )}

            {formData.condition.checkType === 'custom' && (
              <div>
                <label className="label">Custom Expression</label>
                <textarea
                  value={formData.condition.customExpression}
                  onChange={(e) => setFormData({
                    ...formData,
                    condition: { ...formData.condition, customExpression: e.target.value }
                  })}
                  className="input"
                  rows={4}
                  placeholder="Enter custom validation expression..."
                />
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label className="label">Validation Message *</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="input"
              rows={3}
              placeholder="e.g., Product &quot;{productName}&quot; is missing category mapping"
              required
            />
            <p className="text-xs text-[#5C5C5C] mt-1">
              Use placeholders like {'{productName}'}, {'{attributeName}'}, {'{categoryName}'} in your message
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#EBEBEB]">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {ruleId ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ValidationRuleForm;


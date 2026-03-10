import React, { useState } from 'react';
import { useData } from '../../../contexts/DataContext';
import { AlertCircle, CheckCircle, Download, Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import ValidationRuleForm from './ValidationRuleForm';

interface MappingValidationProps {
  selectedChannelId: string | null;
}

interface ValidationResult {
  type: 'error' | 'warning' | 'success';
  message: string;
  category?: string;
  attribute?: string;
}

const MappingValidation: React.FC<MappingValidationProps> = ({ selectedChannelId }) => {
  const {
    channels,
    categories,
    attributes,
    products,
    categoryMappings,
    attributeMappings,
    attributeValueMappings,
    getChannelCategoryTree,
    channelValidationRules,
    updateChannelValidationRule,
    deleteChannelValidationRule,
  } = useData();
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);

  const runValidation = () => {
    if (!selectedChannelId) {
      alert('Please select a channel');
      return;
    }

    setIsValidating(true);
    const results: ValidationResult[] = [];
    const channelCats = getChannelCategoryTree(selectedChannelId);

    // Validate category mappings
    const usedCategories = new Set(products.map(p => p.categoryId));
    usedCategories.forEach((catId: number) => {
      const mapping = categoryMappings.find(
        m => m.masterCategoryId === catId && m.channelId === selectedChannelId && m.isActive
      );
      if (!mapping) {
        const category = categories.find(c => c.id === catId);
        results.push({
          type: 'error',
          message: `Category "${category?.name.tr || category?.name.en || 'Unknown'}" is used in products but not mapped`,
          category: category?.name.tr || category?.name.en || 'Unknown',
        });
      } else {
        const channelCat = channelCats.find(c => c.id === mapping.channelCategoryId);
        if (!channelCat) {
          results.push({
            type: 'error',
            message: `Mapped channel category "${mapping.channelCategoryId}" does not exist`,
            category: mapping.channelCategoryId,
          });
        }
      }
    });

    // Validate attribute mappings
    const usedAttributes = new Set(
      attributes.filter(a => a.categoryIds.some(cid => usedCategories.has(cid)))
    );
    usedAttributes.forEach((attr) => {
      const mapping = attributeMappings.find(
        m => m.masterAttributeId === attr.id && m.channelId === selectedChannelId && m.isActive
      );
      if (!mapping) {
        results.push({
          type: 'warning',
          message: `Attribute "${attr.name.tr || attr.name.en || 'Unknown'}" is not mapped`,
          attribute: attr.name.tr || attr.name.en || 'Unknown',
        });
      } else {
        // Validate value mappings for select/multiselect attributes
        if (attr.type === 'select' || attr.type === 'multiselect') {
          const values = attr.validation?.options?.map(opt => opt.value) || [];
          values.forEach((value) => {
            const valueMapping = attributeValueMappings.find(
              m =>
                m.masterAttributeId === attr.id &&
                m.channelId === selectedChannelId &&
                String(m.masterValue) === String(value) &&
                m.isActive
            );
            if (!valueMapping) {
              results.push({
                type: 'warning',
                message: `Value "${value}" for attribute "${attr.name.tr || attr.name.en || 'Unknown'}" is not mapped`,
                attribute: attr.name.tr || attr.name.en || 'Unknown',
              });
            }
          });
        }
      }
    });

    // Success messages
    const mappedCategories = categoryMappings.filter(
      m => m.channelId === selectedChannelId && m.isActive
    ).length;
    const mappedAttributes = attributeMappings.filter(
      m => m.channelId === selectedChannelId && m.isActive
    ).length;

    if (mappedCategories > 0) {
      results.push({
        type: 'success',
        message: `${mappedCategories} category mapping(s) configured`,
      });
    }
    if (mappedAttributes > 0) {
      results.push({
        type: 'success',
        message: `${mappedAttributes} attribute mapping(s) configured`,
      });
    }

    setTimeout(() => {
      setValidationResults(results);
      setIsValidating(false);
    }, 500);
  };

  const errors = validationResults.filter(r => r.type === 'error');
  const warnings = validationResults.filter(r => r.type === 'warning');
  const successes = validationResults.filter(r => r.type === 'success');

  // Get validation rules for this channel (or global rules)
  const relevantRules = channelValidationRules.filter(rule => 
    rule.isActive && (!rule.channelId || rule.channelId === selectedChannelId || !selectedChannelId)
  );

  const handleToggleRule = (ruleId: number) => {
    const rule = channelValidationRules.find(r => r.id === ruleId);
    if (rule) {
      updateChannelValidationRule(ruleId, { isActive: !rule.isActive });
    }
  };

  const handleDeleteRule = (ruleId: number) => {
    if (window.confirm('Are you sure you want to delete this validation rule?')) {
      deleteChannelValidationRule(ruleId);
    }
  };

  if (!selectedChannelId) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#5C5C5C]">Please select a channel from the dropdown above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-[#171717]">
              Mapping Validation: {selectedChannel?.name}
            </h3>
            <p className="text-sm text-[#5C5C5C] mt-1">
              Validate channel mappings before product export
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingRuleId(null);
                setShowRuleForm(true);
              }}
              className="btn btn-secondary flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 min-w-[120px]"
            >
              <Plus size={18} />
              <span>New Rule</span>
            </button>
            <button 
              type="button"
              onClick={runValidation} 
              className="btn btn-primary whitespace-nowrap px-4 py-2" 
              disabled={isValidating}
            >
              {isValidating ? 'Validating...' : 'Run Validation'}
            </button>
          </div>
        </div>
      </div>

      {/* Validation Rules Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-[#171717]">Validation Rules</h4>
          <button
            type="button"
            onClick={() => {
              setEditingRuleId(null);
              setShowRuleForm(true);
            }}
            className="btn btn-secondary btn-sm flex items-center gap-2"
          >
            <Plus size={16} />
            Add Rule
          </button>
        </div>

        {/* Validation Rules List */}
        {relevantRules.length > 0 ? (
          <div className="space-y-3">
            {relevantRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between p-4 bg-[#F7F7F7] rounded-lg border border-[#EBEBEB]"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge ${
                      rule.severity === 'error' ? 'badge-danger' :
                      rule.severity === 'warning' ? 'badge-warning' :
                      'badge-info'
                    }`}>
                      {rule.severity}
                    </span>
                    <span className="badge badge-secondary">{rule.type}</span>
                    {!rule.channelId && (
                      <span className="badge badge-success">Global</span>
                    )}
                  </div>
                  <h5 className="font-medium text-[#171717] mb-1">{rule.name}</h5>
                  <p className="text-sm text-[#5C5C5C]">{rule.message}</p>
                  <p className="text-xs text-[#5C5C5C] mt-2">
                    Check: {rule.condition.checkType} | Target: {rule.condition.target}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`p-2 rounded ${rule.isActive ? 'text-green-600 hover:bg-green-50' : 'text-[#A4A4A4] hover:bg-white'}`}
                    title={rule.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {rule.isActive ? <Power size={18} /> : <PowerOff size={18} />}
                  </button>
                  <button
                    onClick={() => {
                      setEditingRuleId(rule.id);
                      setShowRuleForm(true);
                    }}
                    className="p-2 text-[#5C5C5C] hover:text-primary hover:bg-white rounded"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-2 text-[#5C5C5C] hover:text-red-600 hover:bg-white rounded"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-[#5C5C5C]">
            <p className="mb-2">No validation rules configured for this channel</p>
            <p className="text-sm">Click "Add Rule" above to create your first validation rule</p>
          </div>
        )}
      </div>

      {/* Validation Rule Form Modal */}
      {showRuleForm && (
        <ValidationRuleForm
          ruleId={editingRuleId}
          channelId={selectedChannelId}
          onClose={() => {
            setShowRuleForm(false);
            setEditingRuleId(null);
          }}
          onSave={() => {
            setShowRuleForm(false);
            setEditingRuleId(null);
          }}
        />
      )}

      {validationResults.length > 0 && (
        <>
          {/* Errors */}
          {errors.length > 0 && (
            <div className="card p-6 bg-red-50 border-red-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-red-600" />
                <h4 className="font-semibold text-red-900">Errors ({errors.length})</h4>
              </div>
              <div className="space-y-2">
                {errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-800">
                    • {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="card p-6 bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-yellow-600" />
                <h4 className="font-semibold text-yellow-900">Warnings ({warnings.length})</h4>
              </div>
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-800">
                    • {warning.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success */}
          {successes.length > 0 && (
            <div className="card p-6 bg-green-50 border-green-200">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-green-600" />
                <h4 className="font-semibold text-green-900">Success ({successes.length})</h4>
              </div>
              <div className="space-y-2">
                {successes.map((success, index) => (
                  <div key={index} className="text-sm text-green-800">
                    ✓ {success.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Report */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                const report = [
                  'Mapping Validation Report',
                  `Channel: ${selectedChannel?.name}`,
                  `Date: ${new Date().toLocaleString()}`,
                  '',
                  `Errors: ${errors.length}`,
                  `Warnings: ${warnings.length}`,
                  `Successes: ${successes.length}`,
                  '',
                  ...errors.map(e => `ERROR: ${e.message}`),
                  ...warnings.map(w => `WARNING: ${w.message}`),
                  ...successes.map(s => `SUCCESS: ${s.message}`),
                ].join('\n');
                const blob = new Blob([report], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `validation-report-${selectedChannelId}-${Date.now()}.txt`;
                a.click();
              }}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Export Report
            </button>
          </div>
        </>
      )}

      {validationResults.length === 0 && !isValidating && (
        <div className="card p-12 text-center">
          <p className="text-[#5C5C5C]">Click "Run Validation" to validate mappings</p>
        </div>
      )}
    </div>
  );
};

export default MappingValidation;


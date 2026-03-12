import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plus, Edit2, Trash2, Ruler, Check, X } from 'lucide-react';
import type { MeasurementUnit, UnitCategory } from '../../types';

const UNIT_CATEGORIES: { value: UnitCategory; label: string }[] = [
  { value: 'weight',      label: 'Weight'      },
  { value: 'length',      label: 'Length'      },
  { value: 'area',        label: 'Area'        },
  { value: 'volume',      label: 'Volume'      },
  { value: 'temperature', label: 'Temperature' },
  { value: 'time',        label: 'Time'        },
  { value: 'other',       label: 'Other'       },
];

const EMPTY_UNIT = {
  code: '',
  name: '',
  symbol: '',
  category: 'other' as UnitCategory,
  isActive: true,
};

const CATEGORY_BADGES: Record<UnitCategory, string> = {
  weight:      'bg-amber-100 text-amber-700',
  length:      'bg-blue-100 text-blue-700',
  area:        'bg-teal-100 text-teal-700',
  volume:      'bg-cyan-100 text-cyan-700',
  temperature: 'bg-orange-100 text-orange-700',
  time:        'bg-purple-100 text-purple-700',
  other:       'bg-gray-100 text-gray-600',
};

const UnitManagement: React.FC = () => {
  const { settings, updateSettings, attributes } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingUnit, setEditingUnit] = useState<MeasurementUnit | null>(null);
  const [newUnit, setNewUnit] = useState({ ...EMPTY_UNIT });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoryFilter, setCategoryFilter] = useState<UnitCategory | 'all'>('all');

  const units: MeasurementUnit[] = settings.units || [];

  const filteredUnits = categoryFilter === 'all'
    ? units
    : units.filter(u => u.category === categoryFilter);

  const validate = (data: typeof EMPTY_UNIT, excludeCode?: string): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!data.code.trim()) {
      errs.code = 'Code is required';
    } else if (units.some(u => u.code === data.code && u.code !== excludeCode)) {
      errs.code = 'A unit with this code already exists';
    }
    if (!data.name.trim()) errs.name = 'Name is required';
    if (!data.symbol.trim()) errs.symbol = 'Symbol is required';
    return errs;
  };

  const handleAdd = () => {
    const errs = validate(newUnit);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    updateSettings({ ...settings, units: [...units, { ...newUnit, code: newUnit.code.trim(), name: newUnit.name.trim(), symbol: newUnit.symbol.trim() }] });
    setNewUnit({ ...EMPTY_UNIT });
    setErrors({});
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editingUnit) return;
    const form = { code: editingUnit.code, name: editingUnit.name, symbol: editingUnit.symbol, category: editingUnit.category, isActive: editingUnit.isActive };
    const errs = validate(form, editingUnit.code);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    updateSettings({ ...settings, units: units.map(u => u.code === editingUnit.code ? { ...editingUnit } : u) });
    setEditingUnit(null);
    setErrors({});
  };

  const handleDelete = (code: string) => {
    const usedBy = attributes.filter(a => a.unit === code).map(a => a.code);
    if (usedBy.length > 0) {
      alert(`Cannot delete: this unit is used by attribute(s): ${usedBy.join(', ')}.\nRemove the unit from those attributes first.`);
      return;
    }
    if (!confirm(`Delete unit "${code}"? This cannot be undone.`)) return;
    updateSettings({ ...settings, units: units.filter(u => u.code !== code) });
  };

  const handleToggleActive = (code: string) => {
    updateSettings({ ...settings, units: units.map(u => u.code === code ? { ...u, isActive: !u.isActive } : u) });
  };

  const fieldClass = (err?: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm ${err ? 'border-red-500' : 'border-[#EBEBEB]'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#171717]">Units of Measurement</h2>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Manage measurement units that can be assigned to numeric attributes on products.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => { setIsAdding(true); setErrors({}); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
          >
            <Plus size={18} />
            Add Unit
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-[#171717]">Add New Unit</h3>
            <button onClick={() => { setIsAdding(false); setNewUnit({ ...EMPTY_UNIT }); setErrors({}); }} className="text-[#A4A4A4] hover:text-[#171717]">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="kg"
                value={newUnit.code}
                onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })}
                className={fieldClass(errors.code)}
              />
              {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
              <p className="text-xs text-[#A4A4A4] mt-1">Unique identifier</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Kilogram"
                value={newUnit.name}
                onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })}
                className={fieldClass(errors.name)}
              />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Symbol <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="kg"
                maxLength={10}
                value={newUnit.symbol}
                onChange={(e) => setNewUnit({ ...newUnit, symbol: e.target.value })}
                className={fieldClass(errors.symbol)}
              />
              {errors.symbol && <p className="text-xs text-red-600 mt-1">{errors.symbol}</p>}
              <p className="text-xs text-[#A4A4A4] mt-1">Displayed next to values</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">Category</label>
              <select
                value={newUnit.category}
                onChange={(e) => setNewUnit({ ...newUnit, category: e.target.value as UnitCategory })}
                className={fieldClass()}
              >
                {UNIT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newUnit.isActive}
                onChange={(e) => setNewUnit({ ...newUnit, isActive: e.target.checked })}
                className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
              />
              <span className="text-sm text-[#171717]">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setIsAdding(false); setNewUnit({ ...EMPTY_UNIT }); setErrors({}); }}
              className="px-4 py-2 text-[#5C5C5C] hover:text-[#171717] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
            >
              Add Unit
            </button>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === 'all' ? 'bg-primary text-white' : 'bg-[#F7F7F7] text-[#5C5C5C] hover:bg-[#EBEBEB]'}`}
        >
          All ({units.length})
        </button>
        {UNIT_CATEGORIES.map(cat => {
          const count = units.filter(u => u.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat.value ? 'bg-primary text-white' : `${CATEGORY_BADGES[cat.value]} hover:opacity-80`}`}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Units Table */}
      <div className="bg-white border border-[#EBEBEB] rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-[#EBEBEB]">
          <thead className="bg-[#FAFAFA]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#EBEBEB]">
            {filteredUnits.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#A4A4A4]">
                  <Ruler size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No units found</p>
                  <p className="text-sm mt-1">Add a measurement unit to get started</p>
                </td>
              </tr>
            ) : (
              filteredUnits.map((unit) => (
                <tr key={unit.code} className="hover:bg-[#FAFAFA]">
                  {editingUnit?.code === unit.code ? (
                    <>
                      <td className="px-6 py-3">
                        <input type="text" value={editingUnit.name} onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })} className={fieldClass(errors.name)} />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <input type="text" value={editingUnit.code} disabled className="w-20 px-2 py-1 border border-[#EBEBEB] rounded bg-[#FAFAFA] text-[#A4A4A4] text-sm" />
                      </td>
                      <td className="px-6 py-3">
                        <input type="text" value={editingUnit.symbol} maxLength={10} onChange={(e) => setEditingUnit({ ...editingUnit, symbol: e.target.value })} className={`w-24 ${fieldClass(errors.symbol)}`} />
                        {errors.symbol && <p className="text-xs text-red-600 mt-1">{errors.symbol}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <select value={editingUnit.category} onChange={(e) => setEditingUnit({ ...editingUnit, category: e.target.value as UnitCategory })} className={`w-36 ${fieldClass()}`}>
                          {UNIT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                      </td>
                      <td className="px-6 py-3">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={editingUnit.isActive} onChange={(e) => setEditingUnit({ ...editingUnit, isActive: e.target.checked })} className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary" />
                          <span className="text-sm">Active</span>
                        </label>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleUpdate} className="p-1 text-primary hover:bg-[#E6F7EF] rounded" title="Save"><Check size={18} /></button>
                          <button onClick={() => { setEditingUnit(null); setErrors({}); }} className="p-1 text-[#A4A4A4] hover:bg-[#FAFAFA] rounded" title="Cancel"><X size={18} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#F7F7F7] text-sm font-mono font-medium text-[#5C5C5C]">
                            {unit.symbol}
                          </span>
                          <span className="text-sm font-medium text-[#171717]">{unit.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAFAFA] text-[#5C5C5C] font-mono">
                          {unit.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[#5C5C5C]">
                        {unit.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_BADGES[unit.category]}`}>
                          {unit.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(unit.code)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${unit.isActive ? 'bg-[#E6F7EF] text-primary' : 'bg-[#FEF3F2] text-[#F04438]'}`}
                        >
                          {unit.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditingUnit(unit); setErrors({}); }} className="p-1 text-[#5C5C5C] hover:text-primary hover:bg-[#E6F7EF] rounded transition-colors" title="Edit">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(unit.code)} className="p-1 text-[#5C5C5C] hover:text-[#F04438] hover:bg-[#FEF3F2] rounded transition-colors" title="Delete">
                            <Trash2 size={18} />
                          </button>
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
          <strong>Note:</strong> Units can be assigned to numeric attributes in the Attributes section.
          Only active units appear in the unit selector. A unit cannot be deleted while it is assigned to an attribute.
        </p>
      </div>
    </div>
  );
};

export default UnitManagement;

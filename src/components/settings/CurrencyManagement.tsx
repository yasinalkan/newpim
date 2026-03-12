import React, { useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Plus, Edit2, Trash2, DollarSign, Check, X } from 'lucide-react';
import type { Currency } from '../../types';

const EMPTY_CURRENCY = {
  code: '',
  name: '',
  symbol: '',
  isDefault: false,
  isActive: true,
  exchangeRate: 1,
};

const CurrencyManagement: React.FC = () => {
  const { settings, updateSettings } = useData();
  const [isAdding, setIsAdding] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [newCurrency, setNewCurrency] = useState({ ...EMPTY_CURRENCY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const currencies: Currency[] = settings.currencies || [];

  const validate = (data: typeof EMPTY_CURRENCY, excludeCode?: string): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!data.code.trim()) errs.code = 'Currency code is required';
    else if (!/^[A-Z]{3}$/.test(data.code.toUpperCase())) errs.code = 'Code must be 3 uppercase letters (e.g. USD)';
    else if (currencies.some(c => c.code.toUpperCase() === data.code.toUpperCase() && c.code !== excludeCode)) {
      errs.code = 'A currency with this code already exists';
    }
    if (!data.name.trim()) errs.name = 'Name is required';
    if (!data.symbol.trim()) errs.symbol = 'Symbol is required';
    if (isNaN(Number(data.exchangeRate)) || Number(data.exchangeRate) <= 0) {
      errs.exchangeRate = 'Exchange rate must be a positive number';
    }
    return errs;
  };

  const handleAdd = () => {
    const errs = validate(newCurrency);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    let updatedCurrencies = [...currencies];
    if (newCurrency.isDefault) {
      updatedCurrencies = updatedCurrencies.map(c => ({ ...c, isDefault: false }));
    }

    const currency: Currency = {
      code: newCurrency.code.toUpperCase(),
      name: newCurrency.name.trim(),
      symbol: newCurrency.symbol.trim(),
      isDefault: newCurrency.isDefault,
      isActive: newCurrency.isActive,
      exchangeRate: Number(newCurrency.exchangeRate),
    };

    updateSettings({ ...settings, currencies: [...updatedCurrencies, currency] });
    setNewCurrency({ ...EMPTY_CURRENCY });
    setErrors({});
    setIsAdding(false);
  };

  const handleUpdate = () => {
    if (!editingCurrency) return;
    const form = {
      code: editingCurrency.code,
      name: editingCurrency.name,
      symbol: editingCurrency.symbol,
      isDefault: editingCurrency.isDefault,
      isActive: editingCurrency.isActive,
      exchangeRate: editingCurrency.exchangeRate,
    };
    const errs = validate(form, editingCurrency.code);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    let updatedCurrencies = currencies.map(c => {
      if (c.code === editingCurrency.code) {
        return { ...editingCurrency, exchangeRate: Number(editingCurrency.exchangeRate) };
      }
      return editingCurrency.isDefault ? { ...c, isDefault: false } : c;
    });

    updateSettings({ ...settings, currencies: updatedCurrencies });
    setEditingCurrency(null);
    setErrors({});
  };

  const handleDelete = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency?.isDefault) {
      alert('Cannot delete the base currency. Set another currency as default first.');
      return;
    }
    if (!confirm(`Delete currency "${currency?.name} (${code})"? This cannot be undone.`)) return;
    updateSettings({ ...settings, currencies: currencies.filter(c => c.code !== code) });
  };

  const handleToggleActive = (code: string) => {
    const currency = currencies.find(c => c.code === code);
    if (currency?.isDefault && currency.isActive) {
      alert('Cannot deactivate the base currency.');
      return;
    }
    updateSettings({
      ...settings,
      currencies: currencies.map(c =>
        c.code === code ? { ...c, isActive: !c.isActive } : c
      ),
    });
  };

  const fieldClass = (err?: string) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${err ? 'border-red-500' : 'border-[#EBEBEB]'}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#171717]">Currencies</h2>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Manage currencies used for product pricing. The base currency is used as the reference rate.
          </p>
        </div>
        {!isAdding && (
          <button
            onClick={() => { setIsAdding(true); setErrors({}); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
          >
            <Plus size={18} />
            Add Currency
          </button>
        )}
      </div>

      {/* Add Form */}
      {isAdding && (
        <div className="bg-white border border-[#EBEBEB] rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-md font-semibold text-[#171717]">Add New Currency</h3>
            <button onClick={() => { setIsAdding(false); setNewCurrency({ ...EMPTY_CURRENCY }); setErrors({}); }} className="text-[#A4A4A4] hover:text-[#171717]">
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
                placeholder="USD"
                maxLength={3}
                value={newCurrency.code}
                onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })}
                className={fieldClass(errors.code)}
              />
              {errors.code && <p className="text-xs text-red-600 mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="US Dollar"
                value={newCurrency.name}
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
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
                placeholder="$"
                maxLength={5}
                value={newCurrency.symbol}
                onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
                className={fieldClass(errors.symbol)}
              />
              {errors.symbol && <p className="text-xs text-red-600 mt-1">{errors.symbol}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#171717] mb-1">
                Exchange Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="1.00"
                min="0.0001"
                step="0.0001"
                value={newCurrency.exchangeRate}
                onChange={(e) => setNewCurrency({ ...newCurrency, exchangeRate: parseFloat(e.target.value) || 1 })}
                className={fieldClass(errors.exchangeRate)}
              />
              {errors.exchangeRate && <p className="text-xs text-red-600 mt-1">{errors.exchangeRate}</p>}
              <p className="text-xs text-[#A4A4A4] mt-1">Relative to base currency</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCurrency.isDefault}
                onChange={(e) => setNewCurrency({ ...newCurrency, isDefault: e.target.checked })}
                className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
              />
              <span className="text-sm text-[#171717]">Set as base currency</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newCurrency.isActive}
                onChange={(e) => setNewCurrency({ ...newCurrency, isActive: e.target.checked })}
                className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
              />
              <span className="text-sm text-[#171717]">Active</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => { setIsAdding(false); setNewCurrency({ ...EMPTY_CURRENCY }); setErrors({}); }}
              className="px-4 py-2 text-[#5C5C5C] hover:text-[#171717] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-primary text-white rounded-[10px] hover:bg-primary-hover transition-colors"
            >
              Add Currency
            </button>
          </div>
        </div>
      )}

      {/* Currency List */}
      <div className="bg-white border border-[#EBEBEB] rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-[#EBEBEB]">
          <thead className="bg-[#FAFAFA]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Currency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Exchange Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Base</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-[#5C5C5C] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#EBEBEB]">
            {currencies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#A4A4A4]">
                  <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No currencies configured</p>
                  <p className="text-sm mt-1">Add a currency to get started</p>
                </td>
              </tr>
            ) : (
              currencies.map((currency) => (
                <tr key={currency.code} className="hover:bg-[#FAFAFA]">
                  {editingCurrency?.code === currency.code ? (
                    <>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editingCurrency.name}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, name: e.target.value })}
                          className={fieldClass(errors.name)}
                        />
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editingCurrency.code}
                          disabled
                          className="w-20 px-2 py-1 border border-[#EBEBEB] rounded bg-[#FAFAFA] text-[#A4A4A4] text-sm"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={editingCurrency.symbol}
                          maxLength={5}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, symbol: e.target.value })}
                          className={`w-20 ${fieldClass(errors.symbol)}`}
                        />
                        {errors.symbol && <p className="text-xs text-red-600 mt-1">{errors.symbol}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="number"
                          min="0.0001"
                          step="0.0001"
                          value={editingCurrency.exchangeRate}
                          onChange={(e) => setEditingCurrency({ ...editingCurrency, exchangeRate: parseFloat(e.target.value) || 1 })}
                          className={`w-28 ${fieldClass(errors.exchangeRate)}`}
                        />
                        {errors.exchangeRate && <p className="text-xs text-red-600 mt-1">{errors.exchangeRate}</p>}
                      </td>
                      <td className="px-6 py-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingCurrency.isActive}
                            onChange={(e) => setEditingCurrency({ ...editingCurrency, isActive: e.target.checked })}
                            className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                      </td>
                      <td className="px-6 py-3">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingCurrency.isDefault}
                            onChange={(e) => setEditingCurrency({ ...editingCurrency, isDefault: e.target.checked })}
                            className="w-4 h-4 text-primary border-[#EBEBEB] rounded focus:ring-primary"
                          />
                          <span className="text-sm">Base</span>
                        </label>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={handleUpdate} className="p-1 text-primary hover:bg-[#E6F7EF] rounded" title="Save">
                            <Check size={18} />
                          </button>
                          <button onClick={() => { setEditingCurrency(null); setErrors({}); }} className="p-1 text-[#A4A4A4] hover:bg-[#FAFAFA] rounded" title="Cancel">
                            <X size={18} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#F7F7F7] text-sm font-medium text-[#5C5C5C]">
                            {currency.symbol}
                          </span>
                          <span className="text-sm font-medium text-[#171717]">{currency.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAFAFA] text-[#5C5C5C] uppercase">
                          {currency.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5C5C5C]">
                        {currency.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#5C5C5C]">
                        {currency.isDefault ? (
                          <span className="text-[#A4A4A4] italic text-xs">Base (1.0)</span>
                        ) : (
                          currency.exchangeRate
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(currency.code)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            currency.isActive
                              ? 'bg-[#E6F7EF] text-primary'
                              : 'bg-[#FEF3F2] text-[#F04438]'
                          }`}
                        >
                          {currency.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {currency.isDefault && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF8FF] text-[#2E90FA]">
                            Base
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingCurrency(currency); setErrors({}); }}
                            className="p-1 text-[#5C5C5C] hover:text-primary hover:bg-[#E6F7EF] rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          {!currency.isDefault && (
                            <button
                              onClick={() => handleDelete(currency.code)}
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
          <strong>Note:</strong> The base currency (marked as "Base") is used as the primary price reference.
          Exchange rates are relative to the base currency. Only active currencies appear as price inputs on product forms.
        </p>
      </div>
    </div>
  );
};

export default CurrencyManagement;

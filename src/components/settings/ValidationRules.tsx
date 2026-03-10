import React from 'react';
import { useData } from '../../contexts/DataContext';

const ValidationRules: React.FC = () => {
  const { settings, updateSettings } = useData();

  return (
    <div className="space-y-6">
      {/* Product Validation */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Product Validation Rules</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-[#5C5C5C] mb-2">Field Length Limits</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Max Product Name Length</label>
                <input
                  type="number"
                  value={settings.validation.product.fieldLengths.name || 200}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          fieldLengths: {
                            ...settings.validation.product.fieldLengths,
                            name: parseInt(e.target.value) || 200,
                          },
                        },
                      },
                    })
                  }
                  className="input"
                  min="10"
                  max="1000"
                />
              </div>
              <div>
                <label className="label">Max SKU Length</label>
                <input
                  type="number"
                  value={settings.validation.product.fieldLengths.sku || 50}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          fieldLengths: {
                            ...settings.validation.product.fieldLengths,
                            sku: parseInt(e.target.value) || 50,
                          },
                        },
                      },
                    })
                  }
                  className="input"
                  min="5"
                  max="200"
                />
              </div>
              <div>
                <label className="label">Max Description Length</label>
                <input
                  type="number"
                  value={settings.validation.product.fieldLengths.description || 5000}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          fieldLengths: {
                            ...settings.validation.product.fieldLengths,
                            description: parseInt(e.target.value) || 5000,
                          },
                        },
                      },
                    })
                  }
                  className="input"
                  min="100"
                  max="50000"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-[#5C5C5C] mb-2">Value Ranges</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Min Price</label>
                <input
                  type="number"
                  value={settings.validation.product.valueRanges.price?.min || 0}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          valueRanges: {
                            ...settings.validation.product.valueRanges,
                            price: {
                              ...settings.validation.product.valueRanges.price,
                              min: parseFloat(e.target.value) || 0,
                            },
                          },
                        },
                      },
                    })
                  }
                  className="input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Max Price</label>
                <input
                  type="number"
                  value={settings.validation.product.valueRanges.price?.max || 1000000}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          valueRanges: {
                            ...settings.validation.product.valueRanges,
                            price: {
                              ...settings.validation.product.valueRanges.price,
                              max: parseFloat(e.target.value) || 1000000,
                            },
                          },
                        },
                      },
                    })
                  }
                  className="input"
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Min Stock</label>
                <input
                  type="number"
                  value={settings.validation.product.valueRanges.stock?.min || 0}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          valueRanges: {
                            ...settings.validation.product.valueRanges,
                            stock: {
                              ...settings.validation.product.valueRanges.stock,
                              min: parseInt(e.target.value) || 0,
                            },
                          },
                        },
                      },
                    })
                  }
                  className="input"
                />
              </div>
              <div>
                <label className="label">Max Stock</label>
                <input
                  type="number"
                  value={settings.validation.product.valueRanges.stock?.max || 100000}
                  onChange={(e) =>
                    updateSettings({
                      ...settings,
                      validation: {
                        ...settings.validation,
                        product: {
                          ...settings.validation.product,
                          valueRanges: {
                            ...settings.validation.product.valueRanges,
                            stock: {
                              ...settings.validation.product.valueRanges.stock,
                              max: parseInt(e.target.value) || 100000,
                            },
                          },
                        },
                      },
                    })
                  }
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Validation */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Asset Validation Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">Max File Size (MB)</label>
            <input
              type="number"
              value={(settings.validation.asset.maxFileSize || 10485760) / 1048576}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  validation: {
                    ...settings.validation,
                    asset: {
                      ...settings.validation.asset,
                      maxFileSize: (parseFloat(e.target.value) || 10) * 1048576,
                    },
                  },
                })
              }
              className="input"
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="label">Max Images Per Product</label>
            <input
              type="number"
              value={settings.validation.asset.maxImageCount || 10}
              onChange={(e) =>
                updateSettings({
                  ...settings,
                  validation: {
                    ...settings.validation,
                    asset: {
                      ...settings.validation.asset,
                      maxImageCount: parseInt(e.target.value) || 10,
                    },
                  },
                })
              }
              className="input"
              min="1"
              max="50"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidationRules;


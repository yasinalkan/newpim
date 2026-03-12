import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon, GripVertical, Globe, Info } from 'lucide-react';
import type { MultiLangText, ProductStatus, Currency } from '../types';
import CategoryPicker from '../components/CategoryPicker';
import LocalizedTextField from '../components/LocalizedTextField';

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, getText, activeLanguages, defaultLanguage } = useLanguage();
  const { getProduct, createProduct, updateProduct, brands, categories, attributes, products, settings } = useData();
  const { currentUser } = useAuth();

  const isEdit = Boolean(id);
  const existingProduct = isEdit ? getProduct(parseInt(id!)) : null;
  
  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';


  // Form state
  const [sku, setSku] = useState('');
  const [baseSKU, setBaseSKU] = useState('');
  
  // Initialize name and description as MultiLangText with all active languages
  const initializeMultiLangText = (): MultiLangText => {
    const text: MultiLangText = {};
    activeLanguages.forEach(lang => {
      text[lang.code] = '';
    });
    return text;
  };
  
  const [name, setName] = useState<MultiLangText>(initializeMultiLangText());
  const [brandId, setBrandId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [description, setDescription] = useState<MultiLangText>(initializeMultiLangText());
  const activeCurrencies = settings.currencies?.filter((c: Currency) => c.isActive) || [];
  const defaultCurrency = activeCurrencies.find((c: Currency) => c.isDefault) || activeCurrencies[0];

  const initializePrices = (): Record<string, string> => {
    const p: Record<string, string> = {};
    activeCurrencies.forEach((c: Currency) => { p[c.code] = ''; });
    return p;
  };

  const [prices, setPrices] = useState<Record<string, string>>(initializePrices);
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [productAttributes, setProductAttributes] = useState<Record<string, { value: string | number | boolean }>>({});
  const [customAttributes, setCustomAttributes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [skuError, setSkuError] = useState<string>('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [statusError, setStatusError] = useState<string>('');
  const [statusWarnings, setStatusWarnings] = useState<string[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Custom attribute input state
  const [showAddCustomAttr, setShowAddCustomAttr] = useState(false);
  const [newCustomAttrName, setNewCustomAttrName] = useState('');
  const [newCustomAttrValue, setNewCustomAttrValue] = useState('');
  
  // Drag and drop state for images
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
      setSku(existingProduct.sku);
      setBaseSKU(existingProduct.baseSKU || '');
      
      // Convert string to MultiLangText if needed
      if (typeof existingProduct.name === 'string') {
        const converted: MultiLangText = initializeMultiLangText();
        converted[defaultLanguage?.code || 'en'] = existingProduct.name;
        setName(converted);
      } else {
        // Ensure all active languages are present
        const existingName: MultiLangText = { ...initializeMultiLangText(), ...existingProduct.name };
        setName(existingName);
      }
      
      setBrandId(existingProduct.brandId);
      setCategoryId(existingProduct.categoryId);
      
      // Convert string to MultiLangText if needed
      if (typeof existingProduct.description === 'string') {
        const converted: MultiLangText = initializeMultiLangText();
        converted[defaultLanguage?.code || 'en'] = existingProduct.description;
        setDescription(converted);
      } else {
        // Ensure all active languages are present
        const existingDescription: MultiLangText = { ...initializeMultiLangText(), ...existingProduct.description };
        setDescription(existingDescription);
      }
      
      const loadedPrices: Record<string, string> = {};
      activeCurrencies.forEach((c: Currency) => {
        const val = existingProduct.prices?.[c.code];
        loadedPrices[c.code] = val !== undefined && val !== null ? val.toString() : '';
      });
      if (Object.values(loadedPrices).every(v => v === '') && existingProduct.price) {
        if (defaultCurrency) loadedPrices[defaultCurrency.code] = existingProduct.price.toString();
      }
      setPrices(loadedPrices);
      setStock(existingProduct.stock.toString());
      setStatus(existingProduct.status);
      setProductAttributes(existingProduct.attributes);
      setCustomAttributes((existingProduct as any).customAttributes || {});
      setProductImages(existingProduct.images || []);
    }
  }, [existingProduct, activeLanguages, defaultLanguage]);

  // Get category-specific attributes (memoized to ensure updates when dependencies change)
  const categoryAttributes = useMemo(() => {
    if (categoryId <= 0) return [];
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [];

    // Collect all attribute IDs assigned to this category (required + variant)
    const categoryAttrIds = new Set([
      ...(category.requiredAttributeIds || []),
      ...(category.variantAttributeIds || []),
    ]);

    // Include attributes that are in the category's lists OR have this categoryId in their own list
    return attributes.filter(attr =>
      categoryAttrIds.has(attr.id) || attr.categoryIds.includes(categoryId)
    );
  }, [attributes, categories, categoryId]);

  // Get selected category (memoized to ensure updates when dependencies change)
  const selectedCategory = useMemo(() => 
    categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  // Check if product has all required fields for "complete" status (FR-1.2, FR-7.1)
  const canSetCompleteStatus = (): { canSet: boolean; missingFields: string[]; warnings: string[] } => {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!sku.trim()) missingFields.push('SKU');
    
    // Check if default language has product name
    const defaultLangCode = defaultLanguage?.code || 'en';
    if (!name[defaultLangCode]?.trim()) missingFields.push(`Product Name (${defaultLanguage?.name || 'Default Language'})`);
    
    if (brandId === 0) missingFields.push('Brand');
    if (categoryId === 0) missingFields.push('Category');
    
    // Check if default language has description
    if (!description[defaultLangCode]?.trim()) missingFields.push(`Description (${defaultLanguage?.name || 'Default Language'})`);

    // Check required attributes from category
    if (selectedCategory && selectedCategory.requiredAttributeIds) {
      selectedCategory.requiredAttributeIds.forEach((attrId) => {
        const attrValue = productAttributes[attrId];
        if (!attrValue || attrValue.value === null || attrValue.value === undefined || attrValue.value === '') {
          const attr = attributes.find((a) => a.id === attrId);
          if (attr) {
            missingFields.push(getText(attr.name));
          }
        }
      });
    }

    return {
      canSet: missingFields.length === 0,
      missingFields,
      warnings,
    };
  };

  // Handle status change with validation (FR-1.2, FR-7.1)
  const handleStatusChange = (newStatus: ProductStatus) => {
    setStatusError('');
    setStatusWarnings([]);
    
    // Standard users cannot set status to "complete" directly
    if (!isAdmin && newStatus === 'complete') {
      setStatusError('Only administrators can mark products as Complete. Set to Pending for admin review.');
      return; // Don't change status
    }
    
    // If trying to set to "complete" or "pending", validate required fields
    if (newStatus === 'complete' || newStatus === 'pending') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        const statusLabel = newStatus === 'complete' ? 'Complete' : 'Pending';
        setStatusError(
          `Cannot set status to "${statusLabel}". Missing required fields: ${validation.missingFields.join(', ')}`
        );
        return; // Don't change status
      }
      // Show warnings for missing optional EN translations (FR-7.1)
      if (validation.warnings.length > 0) {
        setStatusWarnings(validation.warnings);
      }
    }
    
    setStatus(newStatus);
  };

  // Real-time validation feedback for status (FR-1.2, FR-7.1)
  useEffect(() => {
    if (status === 'complete' || status === 'pending') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        // Update error message with current missing fields
        const statusLabel = status === 'complete' ? 'Complete' : 'Pending';
        setStatusError(
          `Missing required fields for ${statusLabel} status: ${validation.missingFields.join(', ')}`
        );
        setStatusWarnings([]);
      } else {
        // Check permission for complete status
        if (status === 'complete' && !isAdmin) {
          setStatusError('Only administrators can mark products as Complete. Set to Pending for admin review.');
          setStatusWarnings([]);
        } else {
          setStatusError('');
          // Show warnings for missing optional translations (FR-7.1)
          setStatusWarnings(validation.warnings);
        }
      }
    } else {
      setStatusError('');
      setStatusWarnings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku, name, brandId, categoryId, description, productAttributes, status, isAdmin]);

  // SKU uniqueness check
  const checkSkuUniqueness = (skuValue: string): boolean => {
    if (!skuValue.trim()) return true; // Empty SKU will be caught by required validation
    
    const existingProductWithSku = products.find(p => 
      p.sku.toLowerCase() === skuValue.toLowerCase().trim() && 
      (!isEdit || p.id !== existingProduct?.id)
    );
    
    return !existingProductWithSku;
  };

  // Real-time SKU validation (FR-8.1)
  const handleSkuChange = (value: string) => {
    setSku(value);
    setSkuError('');
    
    if (value.trim()) {
      // Check uniqueness
      if (!checkSkuUniqueness(value)) {
        setSkuError('This SKU already exists. Please use a unique SKU.');
      }
    }
  };

  // Check SKU format (alphanumeric, no spaces) - recommended but not required (FR-8.1)
  const getSkuFormatWarning = (skuValue: string): string | null => {
    if (!skuValue.trim()) return null;
    // Check if contains spaces
    if (/\s/.test(skuValue)) {
      return 'SKU format: Alphanumeric characters recommended, no spaces';
    }
    // Check if contains only alphanumeric and common separators (dash, underscore)
    if (!/^[A-Za-z0-9\-_]+$/.test(skuValue)) {
      return 'SKU format: Alphanumeric characters recommended (letters, numbers, dashes, underscores)';
    }
    return null;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (!checkSkuUniqueness(sku)) {
      newErrors.sku = 'SKU must be unique';
      setSkuError('This SKU already exists. Please use a unique SKU.');
    }
    
    // Check if default language has product name
    const defaultLangCode = defaultLanguage?.code || 'en';
    if (!name[defaultLangCode]?.trim()) {
      newErrors.name = `Product name is required in ${defaultLanguage?.name || 'default language'}`;
    }
    
    if (brandId === 0) newErrors.brand = 'Brand is required';
    if (categoryId === 0) newErrors.category = 'Category is required';
    
    activeCurrencies.forEach((c: Currency) => {
      const val = prices[c.code];
      if (val && val.trim() !== '' && (isNaN(parseFloat(val)) || parseFloat(val) < 0)) {
        newErrors[`price_${c.code}`] = `${c.name} price must be a non-negative number`;
      }
    });
    
    // Stock: if not provided, defaults to 0. If provided, must be >= 0
    if (stock && stock.trim() !== '' && (isNaN(parseInt(stock)) || parseInt(stock) < 0)) {
      newErrors.stock = 'Stock must be a non-negative integer';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Validate status change to "complete" or "pending" (FR-1.2)
    if (status === 'complete' || status === 'pending') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        const statusLabel = status === 'complete' ? 'Complete' : 'Pending';
        setStatusError(
          `Cannot save product with "${statusLabel}" status. Missing required fields: ${validation.missingFields.join(', ')}`
        );
        // Scroll to status section
        setTimeout(() => {
          const statusElement = document.querySelector('[data-status-section]');
          statusElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
      
      // Check permission for complete status
      if (status === 'complete' && !isAdmin) {
        setStatusError('Only administrators can mark products as Complete. Please set to Pending for admin review.');
        setTimeout(() => {
          const statusElement = document.querySelector('[data-status-section]');
          statusElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    const brand = brands.find((b) => b.id === brandId);
    
    const productPrices: Record<string, number> = {};
    activeCurrencies.forEach((c: Currency) => {
      const val = prices[c.code];
      productPrices[c.code] = val && val.trim() !== '' ? parseFloat(val) : 0;
    });
    const baseCurrencyCode = defaultCurrency?.code || 'TRY';
    const productPrice = productPrices[baseCurrencyCode] || 0;
    const productStock = stock && stock.trim() !== '' ? parseInt(stock) : 0;
    
    const productData = {
      sku,
      baseSKU: baseSKU.trim() || null,
      name,
      brand: brand?.name || '',
      brandId,
      categoryId,
      description,
      price: productPrice,
      prices: productPrices,
      stock: productStock,
      images: productImages,
      imageUrl: productImages[0] || '',
      attributes: productAttributes,
      customAttributes: customAttributes,
      status,
      // Preserve variant-related fields when editing (FR-2.1)
      parentProductId: isEdit && existingProduct ? existingProduct.parentProductId : null,
      variantAttributes: isEdit && existingProduct ? existingProduct.variantAttributes : null,
      isBaseProduct: false, // All products are created at the lowest level
      createdBy: isEdit && existingProduct ? existingProduct.createdBy : (currentUser?.id || 1),
      updatedBy: currentUser?.id || 1,
    };

    if (isEdit && existingProduct) {
      updateProduct(existingProduct.id, productData);
      // Show success message and navigate to product detail page to show changes immediately (FR-2.1)
      setSaveSuccess(true);
      setTimeout(() => {
        navigate(`/products/${existingProduct.id}`);
      }, 500); // Brief delay to show success message
    } else {
      const newProduct = createProduct(productData);
      // Navigate to new product detail page
      navigate(`/products/${newProduct.id}`);
    }
  };

  const handleAttributeChange = (attrId: number, value: string | number | boolean) => {
    setProductAttributes({
      ...productAttributes,
      [attrId]: { value },
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {saveSuccess && (
        <div className="card p-4 bg-green-50 border border-green-200">
          <p className="text-green-800 font-medium">
            ✓ Product updated successfully! Redirecting to product detail page...
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Basic Information</h2>
              <div className="space-y-4">
                {/* SKU */}
                <div>
                  <label className="label">SKU *</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => handleSkuChange(e.target.value)}
                    onBlur={() => {
                      if (sku.trim() && !checkSkuUniqueness(sku)) {
                        setSkuError('This SKU already exists. Please use a unique SKU.');
                      }
                    }}
                    className={`input ${errors.sku || skuError ? 'border-red-500' : ''}`}
                    placeholder="VK-PROD-001"
                  />
                  {(errors.sku || skuError) && (
                    <p className="text-sm text-red-600 mt-1">{errors.sku || skuError}</p>
                  )}
                  {sku.trim() && !skuError && !errors.sku && checkSkuUniqueness(sku) && (
                    <p className="text-sm text-green-600 mt-1">✓ SKU is available</p>
                  )}
                  {sku.trim() && !skuError && !errors.sku && getSkuFormatWarning(sku) && (
                    <p className="text-sm text-yellow-600 mt-1">⚠ {getSkuFormatWarning(sku)}</p>
                  )}
                  {sku.trim() && !skuError && !errors.sku && !getSkuFormatWarning(sku) && (
                    <p className="text-sm text-[#5C5C5C] mt-1">Format: Alphanumeric, no spaces (recommended)</p>
                  )}
                </div>

                {/* Base SKU */}
                <div>
                  <label className="label">Base SKU</label>
                  <input
                    type="text"
                    value={baseSKU}
                    onChange={(e) => setBaseSKU(e.target.value)}
                    className="input"
                    placeholder="VK-PROD-BASE-001"
                  />
                  <p className="text-sm text-[#5C5C5C] mt-1">
                    Use this to group product variants. Products with the same Base SKU are considered variants of the same main product.
                  </p>
                </div>

                {/* Name Field - Localized */}
                <LocalizedTextField
                  label="Product Name"
                  value={name}
                  onChange={setName}
                  required={true}
                  error={errors.name}
                  type="input"
                  placeholder="Product Name"
                />

                {/* Brand */}
                <div>
                  <label className="label">Brand *</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(parseInt(e.target.value))}
                    className={`input ${errors.brand ? 'border-red-500' : ''}`}
                  >
                    <option value={0}>Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                  {errors.brand && <p className="text-sm text-red-600 mt-1">{errors.brand}</p>}
                </div>

                {/* Category */}
                <div>
                  <CategoryPicker
                    categories={categories}
                    selectedCategoryId={categoryId || null}
                    onSelect={(id) => setCategoryId(id)}
                    label="Category"
                    required={true}
                  />
                  {errors.category && <p className="text-sm text-red-600 mt-1">{errors.category}</p>}
                </div>
              </div>
            </div>

            {/* Description - Localized */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Description</h2>
              <LocalizedTextField
                label="Description"
                value={description}
                onChange={setDescription}
                required={false}
                type="textarea"
                rows={5}
                placeholder="Product description..."
                helpText="Provide detailed product information"
              />
            </div>

            {/* Attributes */}
            {categoryAttributes.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-[#171717] mb-4">Attributes</h2>
                <div className="space-y-4">
                  {categoryAttributes.map((attr) => {
                    const currentValue = productAttributes[attr.id]?.value;
                    const attributeType = attr.attributeType || attr.type || 'freeText';
                    const attributeVariableType = attr.attributeVariableType || 'string';
                    
                    return (
                      <div key={attr.id}>
                        <label className="label">
                          {getText(attr.name)}
                          {attr.required && ' *'}
                        </label>
                        
                        {/* Select type */}
                        {attributeType === 'select' && (
                          <select
                            value={String(currentValue || '')}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                            className="input"
                          >
                            <option value="">Select...</option>
                            {attr.validation?.options?.map((opt: any) => (
                              <option key={opt.value} value={opt.value}>
                                {getText(opt.label)}
                              </option>
                            ))}
                          </select>
                        )}
                        
                        {/* FreeText - String */}
                        {attributeType === 'freeText' && attributeVariableType === 'string' && (
                          <input
                            type="text"
                            value={String(currentValue || '')}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                            className="input"
                            placeholder={`Enter ${getText(attr.name).toLowerCase()}...`}
                          />
                        )}
                        
                        {/* FreeText - Number */}
                        {attributeType === 'freeText' && attributeVariableType === 'number' && (
                          <input
                            type="number"
                            value={currentValue !== null && currentValue !== undefined ? Number(currentValue) : ''}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value ? parseFloat(e.target.value) : '')}
                            className="input"
                            placeholder={`Enter ${getText(attr.name).toLowerCase()}...`}
                            step="any"
                          />
                        )}
                        
                        {/* FreeText - Boolean */}
                        {attributeType === 'freeText' && attributeVariableType === 'boolean' && (
                          <select
                            value={String(currentValue !== null && currentValue !== undefined ? currentValue : '')}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value === 'true')}
                            className="input"
                          >
                            <option value="">Select...</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        )}
                        
                        {/* Legacy support for old type system */}
                        {!attr.attributeType && attr.type === 'textarea' && (
                          <textarea
                            value={String(currentValue || '')}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                            className="input min-h-[80px]"
                            placeholder={`Enter ${getText(attr.name).toLowerCase()}...`}
                          />
                        )}
                        
                        {!attr.attributeType && attr.type === 'date' && (
                          <input
                            type="date"
                            value={String(currentValue || '')}
                            onChange={(e) => handleAttributeChange(attr.id, e.target.value)}
                            className="input"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Attributes */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#171717]">Custom Attributes</h2>
                  <p className="text-sm text-[#5C5C5C] mt-1">
                    Add product-specific attributes that are not inherited from the category
                  </p>
                </div>
                {!showAddCustomAttr && (
                  <button
                    type="button"
                    onClick={() => setShowAddCustomAttr(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Custom Attribute
                  </button>
                )}
              </div>

              {/* Add New Custom Attribute Form */}
              {showAddCustomAttr && (
                <div className="mb-4 p-4 bg-[#F7F7F7] rounded-lg border border-[#EBEBEB]">
                  <div className="space-y-3">
                    <div>
                      <label className="label">Attribute Name *</label>
                      <input
                        type="text"
                        value={newCustomAttrName}
                        onChange={(e) => setNewCustomAttrName(e.target.value)}
                        className="input"
                        placeholder="e.g., Material, Color, Size..."
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="label">Attribute Value</label>
                      <input
                        type="text"
                        value={newCustomAttrValue}
                        onChange={(e) => setNewCustomAttrValue(e.target.value)}
                        className="input"
                        placeholder="Enter value (optional, can be added later)"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (newCustomAttrName.trim()) {
                            setCustomAttributes({
                              ...customAttributes,
                              [newCustomAttrName.trim()]: newCustomAttrValue
                            });
                            setNewCustomAttrName('');
                            setNewCustomAttrValue('');
                            setShowAddCustomAttr(false);
                          } else {
                            alert('Please enter an attribute name');
                          }
                        }}
                        className="btn btn-primary"
                      >
                        Add Attribute
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCustomAttrName('');
                          setNewCustomAttrValue('');
                          setShowAddCustomAttr(false);
                        }}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Custom Attributes */}
              {Object.keys(customAttributes).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(customAttributes).map(([attrName, attrValue]) => (
                    <div key={attrName} className="flex items-start gap-3">
                      <div className="flex-1">
                        <label className="label">{attrName}</label>
                        <input
                          type="text"
                          value={attrValue}
                          onChange={(e) => setCustomAttributes({
                            ...customAttributes,
                            [attrName]: e.target.value
                          })}
                          className="input"
                          placeholder={`Enter ${attrName.toLowerCase()}...`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const { [attrName]: removed, ...rest } = customAttributes;
                          setCustomAttributes(rest);
                        }}
                        className="btn btn-secondary p-2 mt-8"
                        title="Remove attribute"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !showAddCustomAttr ? (
                <div className="text-center py-8 border-2 border-dashed border-[#EBEBEB] rounded-lg">
                  <p className="text-[#5C5C5C]">No custom attributes added yet</p>
                  <p className="text-sm text-[#A4A4A4] mt-1">
                    Click "Add Custom Attribute" to create product-specific attributes
                  </p>
                </div>
              ) : null}
            </div>

            {/* Images */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#171717]">Images</h2>
                {productImages.length > 0 && (
                  <span className="text-xs text-[#5C5C5C]">Drag to reorder</span>
                )}
              </div>
              {productImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {productImages.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedImageIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());
                      }}
                      onDragEnd={() => {
                        setDraggedImageIndex(null);
                        setDragOverIndex(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverIndex !== index) {
                          setDragOverIndex(index);
                        }
                      }}
                      onDragLeave={() => {
                        setDragOverIndex(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedImageIndex !== null && draggedImageIndex !== index) {
                          const newImages = [...productImages];
                          const draggedImage = newImages[draggedImageIndex];
                          newImages.splice(draggedImageIndex, 1);
                          newImages.splice(index, 0, draggedImage);
                          setProductImages(newImages);
                        }
                        setDraggedImageIndex(null);
                        setDragOverIndex(null);
                      }}
                      className={`relative group cursor-grab active:cursor-grabbing rounded-lg transition-all ${
                        draggedImageIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverIndex === index && draggedImageIndex !== index
                          ? 'ring-2 ring-primary ring-offset-2'
                          : ''
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={`Product image ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                        draggable={false}
                      />
                      {/* Drag Handle */}
                      <div className="absolute top-2 left-2 p-1 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                        <GripVertical size={14} />
                      </div>
                      {index === 0 && (
                        <span className="absolute top-2 left-10 bg-primary text-white text-xs px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Confirmation dialog for image deletion (FR-7.1)
                          if (window.confirm(`Are you sure you want to remove this image?${index === 0 ? ' This is the primary image.' : ''}`)) {
                            const newImages = productImages.filter((_, i) => i !== index);
                            setProductImages(newImages);
                          }
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                        title="Remove image"
                      >
                        <X size={14} />
                      </button>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const newImages = [...productImages];
                            [newImages[0], newImages[index]] = [newImages[index], newImages[0]];
                            setProductImages(newImages);
                          }}
                          className="absolute bottom-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary-hover"
                        >
                          Set Primary
                        </button>
                      )}
                      {/* Position indicator */}
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </span>
                    </div>
                  ))}
                  {/* Add Images Button as Grid Item */}
                  <label className="border-2 border-dashed border-[#EBEBEB] rounded-lg h-32 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-[#25984F]-light transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newImages: string[] = [];
                        let loadedCount = 0;
                        
                        files.forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              newImages.push(event.target.result as string);
                              loadedCount++;
                              
                              // When all files are loaded, update state once
                              if (loadedCount === files.length) {
                                setProductImages((prev) => [...prev, ...newImages]);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                        
                        // Reset input so same file can be selected again
                        e.target.value = '';
                      }}
                    />
                    <Plus size={24} className="text-[#A4A4A4]" />
                    <span className="text-sm text-[#5C5C5C]">Add Images</span>
                  </label>
                </div>
              ) : (
                <div className="border-2 border-dashed border-[#EBEBEB] rounded-lg p-8 text-center">
                  <ImageIcon size={48} className="mx-auto text-[#A4A4A4] mb-2" />
                  <p className="text-[#5C5C5C] mb-4">No images selected</p>
                  <label className="btn btn-primary inline-flex items-center gap-2 cursor-pointer">
                    <Plus size={18} />
                    Upload Images
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const newImages: string[] = [];
                        let loadedCount = 0;
                        
                        files.forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              newImages.push(event.target.result as string);
                              loadedCount++;
                              
                              // When all files are loaded, update state once
                              if (loadedCount === files.length) {
                                setProductImages((prev) => [...prev, ...newImages]);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        });
                        
                        // Reset input so same file can be selected again
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="card p-6" data-status-section>
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Status</h2>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as ProductStatus)}
                className={`input ${statusError ? 'border-red-500' : ''}`}
              >
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                {isAdmin && <option value="complete">Complete</option>}
              </select>
              {!isAdmin && (
                <p className="text-xs text-[#5C5C5C] mt-2 flex items-start gap-1">
                  <Info size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Set to "Pending Review" when ready. Admins will review and mark as Complete.</span>
                </p>
              )}
              {statusError && (
                <p className="text-sm text-red-600 mt-2">{statusError}</p>
              )}
              {statusWarnings.length > 0 && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-900 mb-1">⚠ Translation Warnings:</p>
                  <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                    {statusWarnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-700 mt-2">
                    English translations are recommended but optional. Product can still be marked as complete.
                  </p>
                </div>
              )}
              {status === 'draft' && (
                <p className="text-sm text-[#5C5C5C] mt-2">
                  Draft products are work-in-progress and may be incomplete.
                </p>
              )}
              {status === 'pending' && !statusError && (
                <p className="text-sm text-blue-600 mt-2">
                  ✓ Product is ready for admin review. All required fields are complete.
                </p>
              )}
              {status === 'complete' && !statusError && statusWarnings.length === 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Product has all required fields and is approved for use.
                </p>
              )}
              {status === 'complete' && !statusError && statusWarnings.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Product is approved. English translations are recommended for better internationalization.
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Pricing</h2>
              <div className="space-y-4">
                {activeCurrencies.map((currency: Currency) => (
                  <div key={currency.code}>
                    <label className="label flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-[#F7F7F7] text-xs font-medium text-[#5C5C5C]">
                        {currency.symbol}
                      </span>
                      {currency.name} ({currency.code})
                      {currency.isDefault && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Base</span>
                      )}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C] text-sm">{currency.symbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={prices[currency.code] || ''}
                        onChange={(e) => setPrices({ ...prices, [currency.code]: e.target.value })}
                        className={`input pl-8 ${errors[`price_${currency.code}`] ? 'border-red-500' : ''}`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors[`price_${currency.code}`] && (
                      <p className="text-sm text-red-600 mt-1">{errors[`price_${currency.code}`]}</p>
                    )}
                  </div>
                ))}
                {activeCurrencies.length === 0 && (
                  <p className="text-sm text-[#5C5C5C]">No active currencies configured. Go to Settings to add currencies.</p>
                )}
                <p className="text-xs text-[#5C5C5C]">
                  Set prices for each active currency. Empty fields default to 0.
                </p>
              </div>
            </div>

            {/* Stock */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Inventory</h2>
              <div>
                <label className="label">Stock</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`input ${errors.stock ? 'border-red-500' : ''}`}
                  placeholder="0 (defaults to 0 if not provided)"
                />
                {errors.stock && <p className="text-sm text-red-600 mt-1">{errors.stock}</p>}
                {!errors.stock && (
                  <p className="text-sm text-[#5C5C5C] mt-1">Defaults to 0 if not provided</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EBEBEB]">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save size={18} />
            Save
          </button>
        </div>
      </form>

    </div>
  );
};

export default ProductFormPage;


import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon, GripVertical, Globe } from 'lucide-react';
import type { MultiLangText, ProductStatus } from '../types';
import CategoryPicker from '../components/CategoryPicker';

const ProductFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, getText } = useLanguage();
  const { getProduct, createProduct, updateProduct, brands, categories, attributes, products, settings } = useData();
  const { currentUser } = useAuth();

  const isEdit = Boolean(id);
  const existingProduct = isEdit ? getProduct(parseInt(id!)) : null;


  // Form state
  const [sku, setSku] = useState('');
  const [baseSKU, setBaseSKU] = useState('');
  const [name, setName] = useState<MultiLangText>({ tr: '', en: '' });
  const [brandId, setBrandId] = useState<number>(0);
  const [model, setModel] = useState('');
  const [categoryId, setCategoryId] = useState<number>(0);
  const [description, setDescription] = useState<MultiLangText>({ tr: '', en: '' });
  const [price, setPrice] = useState('');
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
      const existingName = typeof existingProduct.name === 'string' 
        ? { tr: '', en: existingProduct.name } 
        : { tr: '', en: existingProduct.name.en || existingProduct.name.tr || '' };
      setName(existingName);
      setBrandId(existingProduct.brandId);
      setModel(existingProduct.model || '');
      setCategoryId(existingProduct.categoryId);
      const existingDescription = typeof existingProduct.description === 'string'
        ? { tr: '', en: existingProduct.description }
        : { tr: '', en: existingProduct.description.en || existingProduct.description.tr || '' };
      setDescription(existingDescription);
      setPrice(existingProduct.price.toString());
      setStock(existingProduct.stock.toString());
      setStatus(existingProduct.status);
      setProductAttributes(existingProduct.attributes);
      setCustomAttributes((existingProduct as any).customAttributes || {});
      setProductImages(existingProduct.images || []);
    }
  }, [existingProduct]);

  // Get category-specific attributes
  const categoryAttributes = attributes.filter((attr) => 
    categoryId > 0 && attr.categoryIds.includes(categoryId)
  );

  // Get selected category
  const selectedCategory = categories.find((c) => c.id === categoryId);

  // Check if product has all required fields for "complete" status (FR-1.2, FR-7.1)
  const canSetCompleteStatus = (): { canSet: boolean; missingFields: string[]; warnings: string[] } => {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!sku.trim()) missingFields.push('SKU');
    if (!name.en.trim()) missingFields.push('Product Name');
    if (brandId === 0) missingFields.push('Brand');
    if (categoryId === 0) missingFields.push('Category');
    if (!description.en.trim()) missingFields.push('Description');

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
    
    // If trying to set to "complete", validate required fields
    if (newStatus === 'complete') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        setStatusError(
          `Cannot set status to "Complete". Missing required fields: ${validation.missingFields.join(', ')}`
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
    if (status === 'complete') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        // Update error message with current missing fields
        setStatusError(
          `Missing required fields: ${validation.missingFields.join(', ')}`
        );
        setStatusWarnings([]);
      } else {
        setStatusError('');
        // Show warnings for missing optional EN translations (FR-7.1)
        setStatusWarnings(validation.warnings);
      }
    } else {
      setStatusError('');
      setStatusWarnings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sku, name.en, brandId, categoryId, description.en, productAttributes, status]);

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
    
    if (!name.en.trim()) newErrors.name_en = 'Product name is required';
    if (brandId === 0) newErrors.brand = 'Brand is required';
    if (categoryId === 0) newErrors.category = 'Category is required';
    
    // Price: if not provided, defaults to 0. If provided, must be >= 0
    if (price && price.trim() !== '' && (isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      newErrors.price = 'Price must be a non-negative number';
    }
    
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

    // Validate status change to "complete" (FR-1.2)
    if (status === 'complete') {
      const validation = canSetCompleteStatus();
      if (!validation.canSet) {
        setStatusError(
          `Cannot save product with "Complete" status. Missing required fields: ${validation.missingFields.join(', ')}`
        );
        // Scroll to status section
        setTimeout(() => {
          const statusElement = document.querySelector('[data-status-section]');
          statusElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        return;
      }
    }

    const brand = brands.find((b) => b.id === brandId);
    
    // Default price and stock to 0 if not provided (per FR-1.1)
    const productPrice = price && price.trim() !== '' ? parseFloat(price) : 0;
    const productStock = stock && stock.trim() !== '' ? parseInt(stock) : 0;
    
    const productData = {
      sku,
      baseSKU: baseSKU.trim() || null,
      name,
      brand: brand?.name || '',
      brandId,
      model: model || null,
      categoryId,
      description,
      price: productPrice,
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

                {/* Name Field */}
                <div>
                  <label className="label">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name.en}
                    onChange={(e) => setName({ ...name, en: e.target.value })}
                    className={`input ${errors.name_en ? 'border-red-500' : ''}`}
                    placeholder="Product Name"
                  />
                  {errors.name_en && <p className="text-sm text-red-600 mt-1">{errors.name_en}</p>}
                </div>

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

                {/* Model */}
                <div>
                  <label className="label">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="input"
                    placeholder="Model"
                  />
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

            {/* Description */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Description</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Description *</label>
                  <textarea
                    value={description.en}
                    onChange={(e) => setDescription({ ...description, en: e.target.value })}
                    className="input min-h-[120px]"
                    placeholder="Product description..."
                  />
                </div>
              </div>
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
                <option value="complete">Complete</option>
              </select>
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
              {status === 'complete' && !statusError && statusWarnings.length === 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Product has all required fields and is ready for use.
                </p>
              )}
              {status === 'complete' && !statusError && statusWarnings.length > 0 && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ Product has all required fields. English translations are recommended for better internationalization.
                </p>
              )}
            </div>

            {/* Pricing */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Pricing</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Price (₺)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={`input ${errors.price ? 'border-red-500' : ''}`}
                    placeholder="0.00 (defaults to 0 if not provided)"
                  />
                  {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
                  {!errors.price && (
                    <p className="text-sm text-[#5C5C5C] mt-1">Defaults to 0 if not provided</p>
                  )}
                </div>
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


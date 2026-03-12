import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Plus, X, Image as ImageIcon } from 'lucide-react';
import type { ProductStatus } from '../types';

const VariantFormPage: React.FC = () => {
  const { id, variantId } = useParams<{ id: string; variantId?: string }>();
  const navigate = useNavigate();
  const { t, getText } = useLanguage();
  const { getProduct, createProduct, updateProduct, attributes, products, settings } = useData();
  const { currentUser } = useAuth();

  const baseProduct = getProduct(parseInt(id!));
  const existingVariant = variantId ? getProduct(parseInt(variantId)) : null;
  const isEdit = Boolean(variantId);

  // Get variant attributes for this category
  const variantAttributes = attributes.filter(
    (attr) =>
      baseProduct &&
      attr.categoryIds.includes(baseProduct.categoryId) &&
      attr.isVariantAttribute &&
      (attr.type === 'select' || attr.type === 'multiselect')
  );

  // Form state
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [status, setStatus] = useState<ProductStatus>('draft');
  const [variantAttributeValues, setVariantAttributeValues] = useState<Record<string, string | number>>({});
  const [variantImages, setVariantImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingVariant && baseProduct) {
      setSku(existingVariant.sku);
      setPrice(existingVariant.price.toString());
      setStock(existingVariant.stock.toString());
      setStatus(existingVariant.status);
      setVariantAttributeValues(existingVariant.variantAttributes || {});
      setVariantImages(existingVariant.images || []);
    }
  }, [existingVariant, baseProduct]);

  const checkSkuUniqueness = (skuValue: string): boolean => {
    if (!skuValue.trim()) return true;
    const existingProductWithSku = products.find(
      (p) =>
        p.sku.toLowerCase() === skuValue.toLowerCase().trim() &&
        (!isEdit || p.id !== existingVariant?.id)
    );
    return !existingProductWithSku;
  };

  const checkVariantUniqueness = (): boolean => {
    if (!baseProduct) return true;
    const existingVariants = products.filter((p) => p.parentProductId === baseProduct.id && (!isEdit || p.id !== existingVariant?.id));
    
    return !existingVariants.some((variant) => {
      return variantAttributes.every((attr) => {
        const variantValue = variant.variantAttributes?.[attr.id.toString()];
        const currentValue = variantAttributeValues[attr.id.toString()];
        return variantValue === currentValue;
      });
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!sku.trim()) {
      newErrors.sku = 'SKU is required';
    } else if (!checkSkuUniqueness(sku)) {
      newErrors.sku = 'SKU must be unique';
    }

    variantAttributes.forEach((attr) => {
      if (!variantAttributeValues[attr.id.toString()]) {
        newErrors[`attr_${attr.id}`] = `${getText(attr.name)} is required`;
      }
    });

    if (!checkVariantUniqueness()) {
      newErrors.variant = 'A variant with this combination already exists';
    }

    if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
    if (!stock || parseInt(stock) < 0) newErrors.stock = 'Valid stock is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !baseProduct) {
      return;
    }

    const variantData = {
      sku,
      name: baseProduct.name,
      brand: baseProduct.brand,
      brandId: baseProduct.brandId,
      categoryId: baseProduct.categoryId,
      description: baseProduct.description,
      keywords: baseProduct.keywords,
      price: parseFloat(price),
      stock: parseInt(stock),
      images: variantImages.length > 0 ? variantImages : baseProduct.images, // Use variant images or inherit from base
      imageUrl: variantImages.length > 0 ? variantImages[0] : (baseProduct.images[0] || ''),
      attributes: baseProduct.attributes, // Inherit base product attributes
      status,
      parentProductId: baseProduct.id,
      variantAttributes: variantAttributeValues,
      isBaseProduct: false,
      createdBy: currentUser?.id || 1,
      updatedBy: currentUser?.id || 1,
    };

    if (isEdit && existingVariant) {
      updateProduct(existingVariant.id, variantData);
    } else {
      createProduct(variantData);
    }

    navigate(`/products/${baseProduct.id}`);
  };

  if (!baseProduct) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[#5C5C5C]">Base product not found</p>
          <button onClick={() => navigate('/products')} className="btn btn-secondary mt-4">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variant Attributes */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[#171717] mb-4">Variant Attributes</h2>
            <div className="space-y-4">
              {variantAttributes.length === 0 ? (
                <p className="text-[#5C5C5C]">
                  No variant attributes defined for this category. Mark attributes as "Variant Attribute" in Attribute Management.
                </p>
              ) : (
                variantAttributes.map((attr) => (
                  <div key={attr.id}>
                    <label className="label">
                      {getText(attr.name)} *
                    </label>
                    {attr.type === 'select' && attr.validation.options && (
                      <select
                        value={variantAttributeValues[attr.id.toString()] || ''}
                        onChange={(e) =>
                          setVariantAttributeValues({
                            ...variantAttributeValues,
                            [attr.id.toString()]: e.target.value,
                          })
                        }
                        className={`input ${errors[`attr_${attr.id}`] ? 'border-red-500' : ''}`}
                      >
                        <option value="">Select...</option>
                        {attr.validation.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {getText(opt.label)}
                          </option>
                        ))}
                      </select>
                    )}
                    {errors[`attr_${attr.id}`] && (
                      <p className="text-sm text-red-600 mt-1">{errors[`attr_${attr.id}`]}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Variant-Specific Data */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-[#171717] mb-4">Variant Details</h2>
            <div className="space-y-4">
              {/* SKU */}
              <div>
                <label className="label">{t('products.sku')} *</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className={`input ${errors.sku ? 'border-red-500' : ''}`}
                  placeholder="VK-VARIANT-001"
                />
                {errors.sku && <p className="text-sm text-red-600 mt-1">{errors.sku}</p>}
                {sku.trim() && !errors.sku && checkSkuUniqueness(sku) && (
                  <p className="text-sm text-green-600 mt-1">✓ SKU is available</p>
                )}
              </div>

              {/* Price */}
              <div>
                <label className="label">{t('products.price')} (₺) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`input ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="0.00"
                />
                {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
              </div>

              {/* Stock */}
              <div>
                <label className="label">{t('products.stock')} *</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className={`input ${errors.stock ? 'border-red-500' : ''}`}
                  placeholder="0"
                />
                {errors.stock && <p className="text-sm text-red-600 mt-1">{errors.stock}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="label">{t('products.status')}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="input"
                >
                  <option value="draft">{t('products.draft')}</option>
                  <option value="complete">{t('products.complete')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Variant-Specific Images (Optional) */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-[#171717] mb-4">Variant Images (Optional)</h2>
          <p className="text-sm text-[#5C5C5C] mb-4">
            Add variant-specific images. If no images are added, variant will inherit images from base product.
          </p>
          {variantImages.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {variantImages.map((imageUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={imageUrl}
                    alt={`Variant image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newImages = variantImages.filter((_, i) => i !== index);
                      setVariantImages(newImages);
                    }}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#5C5C5C]">Add image URLs in the input field above</p>
          )}
        </div>

        {errors.variant && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{errors.variant}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-[#EBEBEB]">
          <button
            type="button"
            onClick={() => navigate(`/products/${baseProduct.id}`)}
            className="btn btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn btn-primary flex items-center gap-2">
            <Save size={18} />
            {t('common.save')}
          </button>
        </div>
      </form>

    </div>
  );
};

export default VariantFormPage;


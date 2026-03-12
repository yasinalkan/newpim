import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Edit, Trash2, Package, Info, Tags, Image as ImageIcon, Clock, Plus, Layers, CheckCircle, FileText, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { calculateProductCompleteness, getCompletenessColor } from '../utils/completeness';
import type { ProductStatus } from '../types';

type TabType = 'overview' | 'attributes' | 'images' | 'history' | 'pricing';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, getText } = useLanguage();
  const { getProduct, deleteProduct, categories, attributes, products, updateProduct, hasProductOrders, getProductOrders } = useData();
  const { hasPermission, currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const product = getProduct(parseInt(id!));
  const category = categories.find((c) => c.id === product?.categoryId);
  const variants = product?.isBaseProduct ? products.filter(p => p.parentProductId === product.id) : [];
  const baseProduct = product?.parentProductId ? products.find(p => p.id === product.parentProductId) : null;

  const canEdit = hasPermission('products', 'edit');
  const canDelete = hasPermission('products', 'update');
  const canUpdate = hasPermission('products', 'update');
  const isAdmin = currentUser?.role === 'admin';
  
  const [statusChangeSuccess, setStatusChangeSuccess] = useState(false);

  if (!product) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">Product not found</h3>
          <Link to="/products" className="text-primary hover:text-primary-hover">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // Handle product deletion with order checking (FR-3.1, FR-10.7)
  const handleDelete = () => {
    // Check for orders on product (FR-3.1)
    if (hasProductOrders(product.id)) {
      const productOrders = getProductOrders(product.id);
      const orderCount = productOrders.length;
      const orderNumbers = productOrders.map(o => o.orderNumber).join(', ');
      
      alert(
        `Cannot delete this product. It has ${orderCount} associated order${orderCount !== 1 ? 's' : ''}:\n${orderNumbers}\n\nProducts with orders cannot be deleted.`
      );
      return;
    }

    // Handle variant deletion (FR-10.7)
    if (baseProduct) {
      // This is a variant product
      const allVariants = products.filter(p => p.parentProductId === baseProduct.id);
      const isLastVariant = allVariants.length === 1;
      
      if (isLastVariant) {
        // Last variant deletion - offer options (FR-10.7)
        const choice = window.confirm(
          `This is the last variant of "${getText(baseProduct.name)}".\n\n` +
          `Click OK to delete the variant and convert the base product to standalone.\n` +
          `Click Cancel to abort deletion.`
        );
        
        if (choice) {
          // Delete variant
          deleteProduct(product.id);
          // Convert base product to standalone
          updateProduct(baseProduct.id, {
            isBaseProduct: false,
            updatedBy: currentUser?.id || 1,
          });
          navigate('/products');
        }
        return;
      } else {
        // Not the last variant - just delete it
        if (window.confirm(`Are you sure you want to delete this variant? The base product will remain with ${allVariants.length - 1} other variant${allVariants.length - 1 !== 1 ? 's' : ''}.`)) {
          deleteProduct(product.id);
          navigate(`/products/${baseProduct.id}`);
        }
        return;
      }
    }

    // Handle base product deletion (FR-10.7)
    if (product.isBaseProduct && variants.length > 0) {
      // Check for orders on variants
      const variantsWithOrders = variants.filter(v => hasProductOrders(v.id));
      if (variantsWithOrders.length > 0) {
        const variantOrderInfo = variantsWithOrders.map(v => {
          const orders = getProductOrders(v.id);
          return `${v.sku} (${orders.length} order${orders.length !== 1 ? 's' : ''})`;
        }).join('\n');
        
        alert(
          `Cannot delete this product. Some variants have associated orders:\n${variantOrderInfo}\n\nProducts with orders cannot be deleted.`
        );
        return;
      }

      // Confirmation dialog for base product deletion
      if (window.confirm(`This will delete the base product and all ${variants.length} variant${variants.length !== 1 ? 's' : ''}. This action cannot be undone. Continue?`)) {
        // Delete all variants first
        variants.forEach(v => {
          if (!hasProductOrders(v.id)) {
            deleteProduct(v.id);
          }
        });
        deleteProduct(product.id);
        navigate('/products');
      }
      return;
    }

    // Handle standalone product deletion
    if (window.confirm(`Are you sure you want to delete this product? This action cannot be undone.`)) {
      deleteProduct(product.id);
      navigate('/products');
    }
  };

  // Handle status change with confirmation (FR-2.2)
  const handleStatusChange = (newStatus: ProductStatus) => {
    const currentStatus = product.status;
    
    // Don't show confirmation if status is the same
    if (currentStatus === newStatus) {
      return;
    }
    
    // Check permission - only admins can set to complete
    if (newStatus === 'complete' && !isAdmin) {
      alert('Only administrators can mark products as Complete. Please set to Pending for admin review.');
      return;
    }

    // Validate if trying to set to "complete" or "pending"
    if (newStatus === 'complete' || newStatus === 'pending') {
      // Check required fields
      const missingFields: string[] = [];
      if (!product.sku.trim()) missingFields.push('SKU');
      if (!getText(product.name).trim()) missingFields.push('Product Name');
      if (!product.brandId) missingFields.push('Brand');
      if (!product.categoryId) missingFields.push('Category');
      if (!getText(product.description).trim()) missingFields.push('Description');

      // Check required attributes
      if (category && category.requiredAttributeIds) {
        category.requiredAttributeIds.forEach((attrId) => {
          const attrValue = product.attributes[attrId];
          if (!attrValue || attrValue.value === null || attrValue.value === undefined || attrValue.value === '') {
            const attr = attributes.find((a) => a.id === attrId);
            if (attr) {
              missingFields.push(getText(attr.name));
            }
          }
        });
      }

      if (missingFields.length > 0) {
        const statusLabel = newStatus === 'complete' ? 'Complete' : 'Pending';
        alert(`Cannot set status to "${statusLabel}". Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
    }

    // Confirmation dialog (FR-2.2)
    const statusLabels = {
      draft: 'Draft',
      pending: 'Pending Review',
      complete: 'Complete'
    };
    
    let confirmMessage = '';
    if (newStatus === 'complete') {
      confirmMessage = `Approve this product as "${statusLabels[newStatus]}"? This indicates the product is finalized and ready for use.`;
    } else if (newStatus === 'pending') {
      confirmMessage = `Mark this product as "${statusLabels[newStatus]}"? This will notify admins that it's ready for review.`;
    } else {
      confirmMessage = `Revert this product to "${statusLabels[newStatus]}"? This indicates the product is work-in-progress and may be incomplete.`;
    }

    if (window.confirm(confirmMessage)) {
      // Update status (FR-2.2)
      updateProduct(product.id, {
        status: newStatus,
        updatedBy: currentUser?.id || 1,
      });

      // Show success message
      setStatusChangeSuccess(true);
      
      // Navigate back to products list with appropriate tab after short delay
      setTimeout(() => {
        // Navigate to the appropriate tab based on new status
        if (newStatus === 'pending') {
          navigate('/products', { state: { tab: 'pending' } });
        } else if (newStatus === 'complete') {
          navigate('/products', { state: { tab: 'active' } });
        } else {
          navigate('/products', { state: { tab: 'draft' } });
        }
      }, 1500);

      // Status change is logged via updatedAt timestamp (FR-2.2)
      // The history tab will show the status change through updatedAt
    }
  };

  // Get category-specific attributes (inherited attributes) (FR-3.2)
  const categoryAttributes = product && category
    ? attributes.filter((attr) => attr.categoryIds.includes(category.id))
    : [];

  // Format attribute value for display (FR-3.2)
  const formatAttributeValue = (attribute: any, value: string | number | boolean | undefined): string => {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // For select type, show the label instead of value
    if (attribute.attributeType === 'select' && attribute.validation?.options) {
      const option = attribute.validation.options.find((opt: any) => opt.value === value);
      if (option) {
        return getText(option.label);
      }
    }

    // For boolean type
    if (attribute.attributeVariableType === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return String(value);
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#171717] transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Back to Products</span>
        </button>
      </div>

      {/* Product Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#171717] mb-2">
              {getText(product.name)}
            </h1>
            <div className="flex items-center gap-4 text-sm text-[#5C5C5C]">
              <span className="font-medium">SKU: {product.sku}</span>
              <span>•</span>
              <span>Brand: {product.brand}</span>
              {product.baseSKU && (
                <>
                  <span>•</span>
                  <span>Base SKU: {product.baseSKU}</span>
                </>
              )}
            </div>
          </div>
          {product.images[0] && (
            <img
              src={product.images[0]}
              alt={getText(product.name)}
              className="w-24 h-24 object-cover rounded-lg"
            />
          )}
        </div>
      </div>

      {/* Success Message */}
      {statusChangeSuccess && (
        <div className="card p-4 bg-green-50 border border-green-200">
          <p className="text-green-800 font-medium">
            ✓ Product status updated successfully!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 mb-6">
        {/* Status Section */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#5C5C5C]">Status:</span>
          <span
            className={`badge ${
              product.status === 'complete' 
                ? 'badge-success' 
                : product.status === 'pending'
                ? 'bg-blue-100 text-blue-700'
                : 'badge-warning'
            }`}
          >
            {product.status === 'complete' 
              ? 'Complete' 
              : product.status === 'pending' 
              ? 'Pending Review' 
              : 'Draft'}
          </span>
          {canUpdate && (
            <>
              {product.status === 'draft' && (
                <>
                  {isAdmin && (
                    <button
                      onClick={() => handleStatusChange('complete')}
                      className="btn btn-sm btn-primary flex items-center gap-1"
                      title="Mark as Complete"
                    >
                      <CheckCircle size={14} />
                      Approve as Complete
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusChange('pending')}
                    className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                    title="Submit for Review"
                  >
                    <Clock size={14} />
                    Submit for Review
                  </button>
                </>
              )}
              {product.status === 'pending' && (
                <>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleStatusChange('complete')}
                        className="btn btn-sm btn-primary flex items-center gap-1"
                        title="Approve as Complete"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusChange('draft')}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                        title="Return to Draft"
                      >
                        <FileText size={14} />
                        Return to Draft
                      </button>
                    </>
                  )}
                  {!isAdmin && (
                    <button
                      onClick={() => handleStatusChange('draft')}
                      className="btn btn-sm btn-secondary flex items-center gap-1"
                      title="Revert to Draft"
                    >
                      <FileText size={14} />
                      Revert to Draft
                    </button>
                  )}
                </>
              )}
              {product.status === 'complete' && (
                <>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleStatusChange('pending')}
                        className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
                        title="Move to Pending"
                      >
                        <Clock size={14} />
                        Move to Pending
                      </button>
                      <button
                        onClick={() => handleStatusChange('draft')}
                        className="btn btn-sm btn-secondary flex items-center gap-1"
                        title="Revert to Draft"
                      >
                        <FileText size={14} />
                        Revert to Draft
                      </button>
                    </>
                  )}
                  {!isAdmin && (
                    <span className="text-xs text-[#5C5C5C] italic">
                      Contact an admin to change status
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link
              to={`/products/${product.id}/edit`}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Edit size={18} />
              Edit
            </Link>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="btn btn-danger flex items-center gap-2">
              <Trash2 size={18} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Completeness Card for Draft/Pending Products */}
      {(product.status === 'draft' || product.status === 'pending') && (() => {
        const completeness = calculateProductCompleteness(product, category, attributes, getText);
        const colors = getCompletenessColor(completeness.percentage);
        
        return (
          <div className={`card p-6 ${colors.bg} border ${colors.border}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className={`font-semibold ${colors.text} mb-2`}>
                  Product Completeness: {completeness.percentage}%
                </h3>
                <p className="text-sm text-[#5C5C5C] mb-4">
                  {completeness.completedFields} of {completeness.totalFields} required fields completed
                </p>
                
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="bg-white rounded-full overflow-hidden h-3 shadow-inner">
                    <div
                      className={`${colors.bar} h-3 transition-all duration-300 flex items-center justify-end pr-2`}
                      style={{ width: `${completeness.percentage}%` }}
                    >
                      {completeness.percentage > 20 && (
                        <span className="text-xs font-semibold text-white">
                          {completeness.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Missing Fields */}
                {completeness.missingFields.length > 0 && (
                  <div>
                    <p className={`text-sm font-medium ${colors.text} mb-2`}>
                      Missing Required Fields:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {completeness.missingFields.map((field, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border}`}
                        >
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {completeness.percentage === 100 && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle size={18} />
                    <span className="text-sm font-medium">
                      All required fields completed! Ready to submit for review.
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Action */}
              {completeness.percentage === 100 && product.status === 'draft' && canUpdate && (
                <button
                  onClick={() => handleStatusChange('pending')}
                  className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                >
                  <Clock size={16} />
                  Submit for Review
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-[#EBEBEB]">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#5C5C5C] hover:border-[#EBEBEB]'
              }`}
            >
              <Info size={18} />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'images'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#5C5C5C] hover:border-[#EBEBEB]'
              }`}
            >
              <ImageIcon size={18} />
              Images ({product.images.length})
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'pricing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#5C5C5C] hover:border-[#EBEBEB]'
              }`}
            >
              <DollarSign size={18} />
              Pricing & Stock
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#5C5C5C] hover:border-[#EBEBEB]'
              }`}
            >
              <Clock size={18} />
              History
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Variant-Specific Information (FR-10.4) */}
              {baseProduct && (
                <div className="card p-6 bg-green-50 border border-green-200">
                  <h2 className="text-lg font-semibold text-[#171717] mb-4">Variant-Specific Information</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#5C5C5C]">Variant Attributes</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {product.variantAttributes && Object.entries(product.variantAttributes).map(([attrId, value]) => {
                          const attr = attributes.find(a => a.id === parseInt(attrId));
                          return attr ? (
                            <span key={attrId} className="badge badge-info">
                              {getText(attr.name)}: {String(value)}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-[#5C5C5C]">SKU</p>
                      <p className="font-medium text-[#171717]">{product.sku}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5C5C5C]">Stock</p>
                      <p className="font-medium text-[#171717]">{product.stock.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#5C5C5C]">Price</p>
                      <p className="font-medium text-[#171717]">₺{product.price.toLocaleString()}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <Link
                        to={`/products/${baseProduct.id}/variants/${product.id}`}
                        className="btn btn-primary text-sm inline-flex items-center gap-2"
                      >
                        <Edit size={16} />
                        Edit Variant
                      </Link>
                    </div>
                  )}
                </div>
              )}
              
              {/* Basic Info */}
              <div>
                <h2 className="text-lg font-semibold text-[#171717] mb-4">Basic Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  {product.baseSKU && (
                    <div>
                      <p className="text-sm text-[#5C5C5C]">Base SKU</p>
                      <Link
                        to={`/products/base/${product.baseSKU}`}
                        className="font-medium text-primary hover:text-primary-hover hover:underline"
                      >
                        {product.baseSKU}
                      </Link>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-[#5C5C5C]">Brand</p>
                    <p className="font-medium text-[#171717]">{product.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#5C5C5C]">Category</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[#171717]">{category ? getText(category.name) : '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Images Gallery */}
              {product.images.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-[#171717] mb-4">Images</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {product.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={image}
                          alt={`${getText(product.name)} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                            Primary
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {product.images.length > 4 && (
                    <button
                      onClick={() => setActiveTab('images')}
                      className="mt-4 text-primary hover:text-primary-hover text-sm font-medium"
                    >
                      View all {product.images.length} images →
                    </button>
                  )}
                </div>
              )}

              {/* Description */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-[#171717]">Description</h2>
                </div>
                <p className="text-[#5C5C5C] whitespace-pre-wrap">{getText(product.description)}</p>
              </div>

              {/* Variants Info */}
              {product.isBaseProduct && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#171717]">Variants</h2>
                    {canEdit && (
                      <button
                        onClick={() => navigate(`/products/${product.id}/variants/new`)}
                        className="btn btn-primary flex items-center gap-2 text-sm"
                      >
                        <Plus size={16} />
                        Add Variant
                      </button>
                    )}
                  </div>
                  {variants.length > 0 ? (
                    <div className="space-y-4">
                      {/* Summary Statistics (FR-10.4) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-[#F7F7F7] rounded-lg">
                        <div>
                          <p className="text-xs text-[#5C5C5C]">Total Variants</p>
                          <p className="text-lg font-semibold text-[#171717]">{variants.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5C5C5C]">Total Stock</p>
                          <p className="text-lg font-semibold text-[#171717]">
                            {variants.reduce((sum, v) => sum + v.stock, 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5C5C5C]">Price Range</p>
                          <p className="text-lg font-semibold text-[#171717]">
                            {variants.length > 0 ? (
                              <>
                                ₺{Math.min(...variants.map(v => v.price)).toLocaleString()} - ₺{Math.max(...variants.map(v => v.price)).toLocaleString()}
                              </>
                            ) : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#5C5C5C]">Complete Variants</p>
                          <p className="text-lg font-semibold text-[#171717]">
                            {variants.filter(v => v.status === 'complete').length} / {variants.length}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-[#5C5C5C] mb-3">This product has {variants.length} variant{variants.length !== 1 ? 's' : ''}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {variants.map((variant) => (
                          <Link
                            key={variant.id}
                            to={`/products/${variant.id}`}
                            className="card p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-[#171717]">{variant.sku}</p>
                                {variant.variantAttributes && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Object.entries(variant.variantAttributes).map(([attrId, value]) => {
                                      const attr = attributes.find(a => a.id === parseInt(attrId));
                                      return attr ? (
                                        <span key={attrId} className="text-xs badge badge-info">
                                          {getText(attr.name)}: {String(value)}
                                        </span>
                                      ) : null;
                                    })}
                                  </div>
                                )}
                                <p className="text-sm text-[#5C5C5C] mt-2">
                                  Stock: {variant.stock} | Price: ₺{variant.price.toLocaleString()}
                                </p>
                              </div>
                              <span className={`badge ${variant.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                                {variant.status}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-[#EBEBEB] rounded-lg">
                      <Layers size={48} className="mx-auto text-[#A4A4A4] mb-2" />
                      <p className="text-[#5C5C5C] mb-4">No variants yet</p>
                      {canEdit && (
                        <button
                          onClick={() => navigate(`/products/${product.id}/variants/new`)}
                          className="btn btn-primary inline-flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Create First Variant
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Variant Detail View: Show inherited base product information (FR-10.4) */}
              {baseProduct && (
                <div className="card p-6 bg-blue-50 border border-blue-200">
                  <h2 className="text-lg font-semibold text-[#171717] mb-4">Base Product Information (Inherited)</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-[#5C5C5C]">Base Product</p>
                      <Link
                        to={`/products/${baseProduct.id}`}
                        className="text-primary hover:text-primary-hover font-medium"
                      >
                        {getText(baseProduct.name)}
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[#5C5C5C]">Brand</p>
                        <p className="font-medium text-[#171717]">{baseProduct.brand}</p>
                      </div>
                      <div>
                        <p className="text-sm text-[#5C5C5C]">Category</p>
                        <p className="font-medium text-[#171717]">
                          {category ? getText(category.name) : '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-[#5C5C5C]">Description</p>
                        <p className="text-[#5C5C5C] whitespace-pre-wrap">{getText(baseProduct.description)}</p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="pt-3 border-t border-blue-200">
                        <Link
                          to={`/products/${baseProduct.id}/edit`}
                          className="text-sm text-primary hover:text-primary-hover font-medium"
                        >
                          Edit Base Product →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attributes Section - FR-3.2: Product Attribute Assignment */}
              <div className="border-t border-[#EBEBEB] pt-6 mt-6">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-[#171717]">Attributes</h2>
                  {category && (
                    <p className="text-sm text-[#5C5C5C] mt-1">
                      Inherited from category: {getText(category.name)}
                    </p>
                  )}
                </div>

                {categoryAttributes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[#EBEBEB]">
                          <th className="text-left py-3 px-4 font-semibold text-[#171717]">Attribute Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-[#171717]">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryAttributes.map((attribute) => {
                          const currentValue = product.attributes[attribute.id]?.value;
                          const hasValue = currentValue !== null && currentValue !== undefined && currentValue !== '';

                          return (
                            <tr key={attribute.id} className="border-b border-gray-100 hover:bg-[#F7F7F7]">
                              <td className="py-3 px-4">
                                <span className="font-medium text-[#171717]">{getText(attribute.name)}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-medium ${hasValue ? 'text-[#171717]' : 'text-[#A4A4A4]'}`}>
                                  {formatAttributeValue(attribute, currentValue)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-[#EBEBEB] rounded-lg">
                    <Tags size={48} className="mx-auto text-[#A4A4A4] mb-2" />
                    <p className="text-[#5C5C5C] mb-1">No attributes available</p>
                    {!category && (
                      <p className="text-sm text-[#5C5C5C]">Assign a category to this product to inherit attributes</p>
                    )}
                    {category && categoryAttributes.length === 0 && (
                      <p className="text-sm text-[#5C5C5C]">No attributes are assigned to this category</p>
                    )}
                  </div>
                )}

                {/* Custom Attributes Section */}
                {(product as any).customAttributes && Object.keys((product as any).customAttributes).length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[#EBEBEB]">
                    <h2 className="text-lg font-semibold text-[#171717] mb-4">Custom Attributes</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[#EBEBEB]">
                            <th className="text-left py-3 px-4 font-semibold text-[#171717]">Attribute Name</th>
                            <th className="text-left py-3 px-4 font-semibold text-[#171717]">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries((product as any).customAttributes || {}).map(([attrName, attrValue]) => (
                            <tr key={attrName} className="border-b border-gray-100 hover:bg-[#F7F7F7]">
                              <td className="py-3 px-4">
                                <span className="font-medium text-[#171717]">{attrName}</span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-medium ${attrValue ? 'text-[#171717]' : 'text-[#A4A4A4]'}`}>
                                  {String(attrValue) || '-'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div>
              <h2 className="text-lg font-semibold text-[#171717] mb-4">{t('products.images')}</h2>
              {product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {product.images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`${getText(product.name)} ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {index === 0 && (
                        <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full h-48 bg-white rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon size={48} className="mx-auto text-[#A4A4A4] mb-2" />
                    <p className="text-[#5C5C5C]">No images</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div>
              <h2 className="text-lg font-semibold text-[#171717] mb-4">History</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4 pb-4 border-b border-[#EBEBEB]">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium text-[#171717]">Product Created</p>
                    <p className="text-sm text-[#5C5C5C]">
                      {format(new Date(product.createdAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pb-4 border-b border-[#EBEBEB]">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="font-medium text-[#171717]">Last Updated</p>
                    <p className="text-sm text-[#5C5C5C]">
                      {format(new Date(product.updatedAt), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                {product.status === 'complete' && (
                  <div className="flex items-start gap-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-[#171717]">Status Changed to Complete</p>
                      <p className="text-sm text-[#5C5C5C]">
                        {format(new Date(product.updatedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing & Stock Tab */}
          {activeTab === 'pricing' && (
            <div>
              <h2 className="text-lg font-semibold text-[#171717] mb-4">Pricing & Stock</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-[#5C5C5C]">Price</p>
                  <p className="text-2xl font-bold text-[#171717]">₺{product.price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-[#5C5C5C]">Stock</p>
                  <p
                    className={`text-2xl font-bold ${
                      product.stock === 0
                        ? 'text-red-600'
                        : product.stock < 10
                        ? 'text-orange-600'
                        : 'text-green-600'
                    }`}
                  >
                    {product.stock}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;


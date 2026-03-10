import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Package } from 'lucide-react';

const MainProductDetailPage: React.FC = () => {
  const { baseSKU } = useParams<{ baseSKU: string }>();
  const { getText } = useLanguage();
  const { products, attributes, categories } = useData();

  // Find all variants with this baseSKU
  const variants = products.filter(p => p.baseSKU === baseSKU);

  if (!baseSKU || variants.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Package size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">No products found for this baseSKU</h3>
          <Link to="/products" className="text-primary hover:text-primary-hover">
            ← Back to Products
          </Link>
        </div>
      </div>
    );
  }

  // Get common information from first variant (they should share these)
  const firstVariant = variants[0];
  const category = categories.find(c => c.id === firstVariant.categoryId);

  // Calculate summary statistics
  const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

  // Find attributes that differ between variants (variant-differentiating attributes)
  const getVariantDifferentiatingAttributes = () => {
    const differentiatingAttrIds = new Set<number>();
    
    // Get all attribute IDs from all variants
    const allAttrIds = new Set<number>();
    variants.forEach(variant => {
      Object.keys(variant.attributes).forEach(attrId => {
        allAttrIds.add(parseInt(attrId));
      });
    });
    
    // Check each attribute to see if it has different values across variants
    allAttrIds.forEach(attrId => {
      const values = new Set<string>();
      variants.forEach(variant => {
        const attrValue = variant.attributes[attrId];
        if (attrValue && attrValue.value !== null && attrValue.value !== undefined) {
          values.add(String(attrValue.value));
        }
      });
      
      // If there's more than one unique value, this attribute differentiates variants
      if (values.size > 1) {
        differentiatingAttrIds.add(attrId);
      }
    });
    
    return differentiatingAttrIds;
  };

  const differentiatingAttrIds = getVariantDifferentiatingAttributes();

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-[#5C5C5C] mb-1">Total Variants</p>
            <p className="text-2xl font-bold text-[#171717]">{variants.length}</p>
          </div>
          <div>
            <p className="text-sm text-[#5C5C5C] mb-1">Total Stock</p>
            <p className="text-2xl font-bold text-[#171717]">
              {totalStock.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Common Information */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">Common Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-[#5C5C5C]">Brand</p>
            <p className="font-medium text-[#171717]">{firstVariant.brand}</p>
          </div>
          <div>
            <p className="text-sm text-[#5C5C5C]">Category</p>
            <p className="font-medium text-[#171717]">{category ? getText(category.name) : '-'}</p>
          </div>
        </div>
      </div>

      {/* All Variants */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-[#171717] mb-4">All Variants</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                <th className="text-left py-3 px-4 font-semibold text-[#171717]">SKU</th>
                <th className="text-left py-3 px-4 font-semibold text-[#171717]">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-[#171717]">Attributes</th>
                <th className="text-left py-3 px-4 font-semibold text-[#171717]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b border-gray-100 hover:bg-[#F7F7F7]">
                  <td className="py-3 px-4">
                    <span className="font-mono text-sm text-[#171717]">{variant.sku}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-[#171717]">{getText(variant.name)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(variant.attributes)
                        .filter(([attrId]) => differentiatingAttrIds.has(parseInt(attrId)))
                        .map(([attrId, attrValue]) => {
                          const attr = attributes.find(a => a.id === parseInt(attrId));
                          if (!attr) return null;
                          
                          return (
                            <span key={attrId} className="text-xs badge badge-info">
                              {getText(attr.name)}: {String(attrValue.value)}
                            </span>
                          );
                        })}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Link
                      to={`/products/${variant.id}`}
                      className="text-primary hover:text-primary-hover font-medium text-sm"
                    >
                      View Details →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MainProductDetailPage;

import React, { useState, useMemo } from 'react';
import { useData } from '../../../contexts/DataContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface ProductExportProps {
  selectedChannelId: string | null;
}

const ProductExport: React.FC<ProductExportProps> = ({ selectedChannelId }) => {
  const {
    channels,
    products,
    categoryMappings,
    attributeMappings,
    attributeValueMappings,
    createExportLog,
  } = useData();
  const { currentUser } = useAuth();
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'xml'>('csv');
  const [showPreview, setShowPreview] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const selectedChannel = channels.find(c => c.id === selectedChannelId);
  const completeProducts = products.filter(p => p.status === 'complete');

  const toggleProduct = (productId: number) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProductIds(newSet);
  };

  const toggleAll = () => {
    if (selectedProductIds.size === completeProducts.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(completeProducts.map(p => p.id)));
    }
  };

  // Apply category mapping for product export (FR-10.7)
  const applyMappings = (product: any) => {
    // 1. Product has master category assigned
    if (!product.categoryId) {
      return {
        ...product,
        channelCategoryId: null,
        mappingStatus: 'no_category' as const,
        mappingError: 'Product has no master category assigned',
      };
    }

    // 2. System looks up channel category mapping for that master category and target channel
    const categoryMapping = categoryMappings.find(
      m => m.masterCategoryId === product.categoryId && m.channelId === selectedChannelId && m.isActive
    );

    // 3. Product is assigned the single mapped channel category for export (one-to-one mapping)
    const channelCategoryId = categoryMapping?.channelCategoryId || null;

    // 4. Business rule: If no mapping exists, product may not be exportable
    const mappingStatus = channelCategoryId ? 'mapped' as const : 'unmapped' as const;

    const mappedAttributes: Record<string, any> = {};
    Object.entries(product.attributes || {}).forEach(([attrId, attrValue]: [string, any]) => {
      const attrMapping = attributeMappings.find(
        m => m.masterAttributeId === Number(attrId) && m.channelId === selectedChannelId && m.isActive
      );
      if (attrMapping && attrMapping.channelAttributeIds.length > 0) {
        const channelAttrId = attrMapping.channelAttributeIds[0];
        // Apply value mapping if exists
        const valueMapping = attributeValueMappings.find(
          m =>
            m.masterAttributeId === Number(attrId) &&
            m.channelId === selectedChannelId &&
            String(m.masterValue) === String(attrValue.value) &&
            m.isActive
        );
        mappedAttributes[channelAttrId] = {
          value: valueMapping ? valueMapping.channelValue : attrValue.value,
        };
      }
    });

    return {
      ...product,
      channelCategoryId, // Exactly one channel category per product per channel (FR-10.7)
      mappingStatus,
      mappingError: mappingStatus === 'unmapped' ? 'No category mapping found for this product' : null,
      attributes: mappedAttributes,
    };
  };

  const exportData = useMemo(() => {
    return Array.from(selectedProductIds)
      .map(id => products.find(p => p.id === id))
      .filter(Boolean)
      .map(product => applyMappings(product));
  }, [selectedProductIds, products, selectedChannelId, categoryMappings, attributeMappings, attributeValueMappings]);

  // Check export readiness (FR-10.7)
  const exportReadiness = useMemo(() => {
    const unmappedProducts = exportData.filter(p => p.mappingStatus === 'unmapped' || p.mappingStatus === 'no_category');
    const mappedProducts = exportData.filter(p => p.mappingStatus === 'mapped');
    
    return {
      total: exportData.length,
      mapped: mappedProducts.length,
      unmapped: unmappedProducts.length,
      canExport: unmappedProducts.length === 0, // Only export if all products are mapped
      unmappedProducts: unmappedProducts.map(p => ({
        id: p.id,
        sku: p.sku,
        name: typeof p.name === 'object' ? p.name.en || p.name.tr : p.name,
        reason: p.mappingError || 'No category mapping found',
      })),
    };
  }, [exportData]);

  const handleExport = async () => {
    if (!selectedChannelId || selectedProductIds.size === 0) {
      alert('Please select a channel and at least one product');
      return;
    }

    // FR-10.7: Check if products have category mappings
    if (exportReadiness.unmapped > 0) {
      const proceed = window.confirm(
        `Warning: ${exportReadiness.unmapped} product(s) do not have category mappings:\n\n` +
        exportReadiness.unmappedProducts.slice(0, 5).map(p => `- ${p.sku}: ${p.reason}`).join('\n') +
        (exportReadiness.unmappedProducts.length > 5 ? `\n... and ${exportReadiness.unmappedProducts.length - 5} more` : '') +
        `\n\nThese products will be exported without channel categories. Continue?`
      );
      if (!proceed) {
        return;
      }
    }

    setIsExporting(true);

    try {
      let exportContent = '';
      let mimeType = '';

      // Filter products to export (FR-10.7)
      const productsToExport = exportData.filter(p => p.mappingStatus === 'mapped' || p.mappingStatus === 'unmapped');

      if (exportFormat === 'csv') {
        // CSV export with channel category (FR-10.7)
        const headers = ['SKU', 'Name', 'Channel Category', 'Price', 'Stock', 'Mapping Status'];
        const rows = productsToExport.map(p => [
          p.sku,
          typeof p.name === 'object' ? p.name.en || p.name.tr : p.name,
          p.channelCategoryId || 'UNMAPPED', // Show unmapped status
          p.price,
          p.stock,
          p.mappingStatus === 'mapped' ? 'Mapped' : 'Unmapped',
        ]);
        exportContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        mimeType = 'text/csv';
      } else if (exportFormat === 'json') {
        // JSON export with channel category (FR-10.7)
        exportContent = JSON.stringify(productsToExport.map(p => ({
          ...p,
          channelCategoryId: p.channelCategoryId || null, // Exactly one channel category per product
        })), null, 2);
        mimeType = 'application/json';
      } else if (exportFormat === 'xml') {
        // XML export with channel category (FR-10.7)
        exportContent = `<?xml version="1.0" encoding="UTF-8"?>\n<products>\n${productsToExport.map(p => 
          `  <product>\n    <sku>${p.sku}</sku>\n    <name>${typeof p.name === 'object' ? p.name.en || p.name.tr : p.name}</name>\n    <channelCategoryId>${p.channelCategoryId || 'UNMAPPED'}</channelCategoryId>\n  </product>`
        ).join('\n')}\n</products>`;
        mimeType = 'application/xml';
      }

      // Create download
      const blob = new Blob([exportContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${selectedChannelId}-${Date.now()}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      // Log export with mapping status (FR-10.7)
      createExportLog({
        channelId: selectedChannelId,
        productIds: Array.from(selectedProductIds),
        exportFormat,
        status: exportReadiness.unmapped > 0 ? 'partial' : 'success',
        errorCount: exportReadiness.unmapped,
        warningCount: exportReadiness.unmapped,
        exportedBy: currentUser?.id || 1,
        completedAt: new Date().toISOString(),
      });

      const successMessage = exportReadiness.unmapped > 0
        ? `Exported ${exportReadiness.mapped} product(s) successfully. ${exportReadiness.unmapped} product(s) exported without category mappings.`
        : `Exported ${exportReadiness.mapped} product(s) successfully with category mappings.`;
      
      alert(successMessage);
      setSelectedProductIds(new Set());
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!selectedChannelId) {
    return (
      <div className="card p-12 text-center">
        <p className="text-[#5C5C5C]">Please select a channel from the Channels tab</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#171717]">
            Product Export: {selectedChannel?.name}
          </h3>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Export products to channel with applied mappings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
            className="input"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
          </select>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="btn btn-secondary"
          >
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button
            onClick={handleExport}
            disabled={selectedProductIds.size === 0 || isExporting}
            className="btn btn-primary flex items-center gap-2"
          >
            <Upload size={18} />
            {isExporting ? 'Exporting...' : `Export ${selectedProductIds.size} Product(s)`}
          </button>
        </div>
      </div>

      {/* Export Readiness Status (FR-10.7) */}
      {selectedProductIds.size > 0 && (
        <div className={`card p-4 ${exportReadiness.canExport ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-[#171717]">
                Export Readiness: {exportReadiness.mapped} mapped, {exportReadiness.unmapped} unmapped
              </p>
              {exportReadiness.unmapped > 0 && (
                <p className="text-sm text-yellow-800 mt-1">
                  {exportReadiness.unmapped} product(s) do not have category mappings and may not be exportable
                </p>
              )}
            </div>
            {exportReadiness.canExport ? (
              <CheckCircle size={24} className="text-green-600" />
            ) : (
              <AlertCircle size={24} className="text-yellow-600" />
            )}
          </div>
        </div>
      )}

      {/* Product Selection */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold">Select Products to Export</h4>
          <button onClick={toggleAll} className="btn btn-secondary text-sm">
            {selectedProductIds.size === completeProducts.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2">
          {completeProducts.length === 0 ? (
            <p className="text-[#5C5C5C] text-center py-8">No complete products available</p>
          ) : (
            completeProducts.map((product) => {
              const categoryMapping = categoryMappings.find(
                m => m.masterCategoryId === product.categoryId && m.channelId === selectedChannelId && m.isActive
              );
              const isMapped = !!categoryMapping;
              return (
                <label
                  key={product.id}
                  className={`flex items-center gap-3 p-3 rounded border cursor-pointer ${
                    selectedProductIds.has(product.id)
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-[#F7F7F7] border-[#EBEBEB]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.has(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
                  />
                  <div className="flex-1">
                    <div className="font-medium">
                      {typeof product.name === 'object' ? product.name.en || product.name.tr : product.name}
                    </div>
                    <div className="text-sm text-[#5C5C5C]">SKU: {product.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isMapped ? (
                      <span className="badge badge-success flex items-center gap-1">
                        <CheckCircle size={14} />
                        Mapped
                      </span>
                    ) : (
                      <span className="badge badge-warning flex items-center gap-1">
                        <AlertCircle size={14} />
                        Unmapped
                      </span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* Preview */}
      {showPreview && exportData.length > 0 && (
        <div className="card p-4">
          <h4 className="font-semibold mb-4">Export Preview ({exportData.length} products)</h4>
          <div className="max-h-96 overflow-y-auto">
            <pre className="bg-[#F7F7F7] p-4 rounded text-xs overflow-x-auto">
              {exportFormat === 'json'
                ? JSON.stringify(exportData.slice(0, 3), null, 2)
                : exportFormat === 'xml'
                ? `<?xml version="1.0"?>\n<products>\n${exportData.slice(0, 3).map(p => `  <product sku="${p.sku}" />`).join('\n')}\n</products>`
                : exportData.slice(0, 3).map(p => `${p.sku},${typeof p.name === 'object' ? p.name.en || p.name.tr : p.name}`).join('\n')}
              {exportData.length > 3 && '\n...'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductExport;


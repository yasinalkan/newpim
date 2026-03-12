import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Download,
  AlertCircle,
  ArrowLeft,
  FileSpreadsheet,
} from 'lucide-react';
import {
  parseCSV,
  parseProductsFromCSV,
  parseStatusUpdatesFromCSV,
  generateProductImportTemplate,
  generateStatusUpdateTemplate,
  type ParsedProduct,
  type ParsedStatusUpdate,
  type ValidationError,
} from '../utils/csvParser';
import type { ProductStatus, Currency } from '../types';

type ImportMode = 'products' | 'status';

const BulkImportPage: React.FC = () => {
  const { t, getText } = useLanguage();
  const { products, brands, categories, createProduct, updateProduct, getProduct, settings } = useData();
  const activeCurrencies = settings.currencies?.filter((c: Currency) => c.isActive) || [];
  const defaultCurrency = activeCurrencies.find((c: Currency) => c.isDefault) || activeCurrencies[0];
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Helper function to replace placeholders in translation strings
  const translate = (key: string, params?: Record<string, string | number>): string => {
    let text = t(key);
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }
    return text;
  };

  const [importMode, setImportMode] = useState<ImportMode>('products');
  const [file, setFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [parsedStatusUpdates, setParsedStatusUpdates] = useState<ParsedStatusUpdate[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validExtensions = ['.csv', '.txt'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert(t('products.selectCsvFile') || 'Please select a CSV file (.csv or .txt)');
      return;
    }

    setFile(selectedFile);
    setValidationErrors([]);
    setParsedProducts([]);
    setParsedStatusUpdates([]);
    setImportResults(null);
    setShowPreview(false);

    // Read file content
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      parseFileContent(content);
    };
    reader.readAsText(selectedFile);
  };

  const parseFileContent = (content: string) => {
    try {
      const rows = parseCSV(content);
      
      if (importMode === 'products') {
        const { products: parsed, errors } = parseProductsFromCSV(rows, brands, categories);
        setParsedProducts(parsed);
        setValidationErrors(errors);
        setShowPreview(true);
      } else {
        const { updates, errors } = parseStatusUpdatesFromCSV(rows);
        setParsedStatusUpdates(updates);
        setValidationErrors(errors);
        setShowPreview(true);
      }
    } catch (error) {
      alert(t('products.csvParseError') || 'Error parsing CSV file: ' + (error as Error).message);
    }
  };

  const handleModeChange = (mode: ImportMode) => {
    setImportMode(mode);
    setFile(null);
    setCsvContent('');
    setParsedProducts([]);
    setParsedStatusUpdates([]);
    setValidationErrors([]);
    setImportResults(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = importMode === 'products' 
      ? generateProductImportTemplate()
      : generateStatusUpdateTemplate();
    
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', importMode === 'products' ? 'product_import_template.csv' : 'status_update_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (importMode === 'products') {
      if (parsedProducts.length === 0) {
        alert(t('products.noValidProducts'));
        return;
      }

      setIsImporting(true);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const parsedProduct of parsedProducts) {
        try {
          // Check if product with SKU already exists
          const existingProduct = products.find(p => p.sku === parsedProduct.sku);
          
          if (existingProduct) {
            // Update existing product
            const importPrice = parsedProduct.price || 0;
            const importPrices = { ...(existingProduct.prices || {}), [defaultCurrency?.code || 'TRY']: importPrice };
            updateProduct(existingProduct.id, {
              name: {
                tr: parsedProduct.nameTr,
                en: parsedProduct.nameEn,
              },
              brand: parsedProduct.brand,
              brandId: parsedProduct.brandId,
              categoryId: parsedProduct.categoryId,
              description: {
                tr: parsedProduct.descriptionTr || '',
                en: parsedProduct.descriptionEn || '',
              },
              price: importPrice,
              prices: importPrices,
              stock: parsedProduct.stock || 0,
              status: parsedProduct.status || 'draft',
              images: parsedProduct.images || [],
              imageUrl: parsedProduct.images?.[0] || '',
            });
            success++;
          } else {
            // Create new product
            if (!parsedProduct.brandId || !parsedProduct.categoryId) {
              errors.push(`${t('products.sku')} ${parsedProduct.sku}: ${t('products.missingBrandOrCategory') || 'Missing brand or category'}`);
              failed++;
              continue;
            }

            const newPrice = parsedProduct.price || 0;
            createProduct({
              sku: parsedProduct.sku,
              name: {
                tr: parsedProduct.nameTr,
                en: parsedProduct.nameEn,
              },
              brand: parsedProduct.brand,
              brandId: parsedProduct.brandId,
              categoryId: parsedProduct.categoryId,
              description: {
                tr: parsedProduct.descriptionTr || '',
                en: parsedProduct.descriptionEn || '',
              },
              keywords: null,
              stock: parsedProduct.stock || 0,
              price: newPrice,
              prices: { [defaultCurrency?.code || 'TRY']: newPrice },
              images: parsedProduct.images || [],
              imageUrl: parsedProduct.images?.[0] || '',
              attributes: {},
              status: parsedProduct.status || 'draft',
              parentProductId: null,
              variantAttributes: null,
              isBaseProduct: true,
              createdBy: currentUser?.id || 1,
              updatedBy: currentUser?.id || 1,
            });
            success++;
          }
        } catch (error) {
          errors.push(`SKU ${parsedProduct.sku}: ${(error as Error).message}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      setIsImporting(false);
    } else {
      // Status update mode
      if (parsedStatusUpdates.length === 0) {
        alert(t('products.noValidStatusUpdates'));
        return;
      }

      setIsImporting(true);
      let success = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const update of parsedStatusUpdates) {
        try {
          const product = products.find(p => p.sku === update.sku);
          if (!product) {
            errors.push(`${t('products.sku')} ${update.sku}: ${t('products.productNotFound')}`);
            failed++;
            continue;
          }

          // Validate status change (draft -> complete requires required fields)
          if (update.status === 'complete' && product.status === 'draft') {
            if (!product.name.tr || !product.name.en || !product.sku || !product.categoryId || !product.brandId) {
              errors.push(`${t('products.sku')} ${update.sku}: ${t('products.missingRequiredFields')}`);
              failed++;
              continue;
            }
          }

          updateProduct(product.id, { status: update.status });
          success++;
        } catch (error) {
          errors.push(`SKU ${update.sku}: ${(error as Error).message}`);
          failed++;
        }
      }

      setImportResults({ success, failed, errors });
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validExtensions = ['.csv', '.txt'];
      const fileExtension = droppedFile.name.toLowerCase().substring(droppedFile.name.lastIndexOf('.'));
      
      if (validExtensions.includes(fileExtension)) {
        setFile(droppedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setCsvContent(content);
          parseFileContent(content);
        };
        reader.readAsText(droppedFile);
      } else {
        alert(t('products.selectCsvFile') || 'Please drop a CSV file (.csv or .txt)');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div className="card p-4">
        <div className="flex gap-4">
          <button
            onClick={() => handleModeChange('products')}
            className={`flex-1 btn ${importMode === 'products' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileSpreadsheet size={18} className="mr-2" />
            {t('products.importProducts')}
          </button>
          <button
            onClick={() => handleModeChange('status')}
            className={`flex-1 btn ${importMode === 'status' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <FileText size={18} className="mr-2" />
            {t('products.updateStatuses')}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">
          {importMode === 'products' ? t('products.importInstructions') : t('products.statusUpdateInstructions')}
        </h2>
        <div className="space-y-3 text-[#5C5C5C]">
          {importMode === 'products' ? (
            <>
              <p>{t('products.step1')}</p>
              <p>{t('products.step2')}</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>{t('products.sku')}</strong> - {t('products.csvColumnSku')}</li>
                <li><strong>Name (TR)</strong> - {t('products.csvColumnNameTr')}</li>
                <li><strong>Name (EN)</strong> - {t('products.csvColumnNameEn')}</li>
                <li><strong>{t('products.brand')}</strong> - {t('products.csvColumnBrand')}</li>
                <li><strong>{t('products.category')}</strong> - {t('products.csvColumnCategory')}</li>
                <li><strong>Description (TR)</strong> - {t('products.csvColumnDescTr')}</li>
                <li><strong>Description (EN)</strong> - {t('products.csvColumnDescEn')}</li>
                <li><strong>{t('products.price')}</strong> - {t('products.csvColumnPrice')}</li>
                <li><strong>{t('products.stock')}</strong> - {t('products.csvColumnStock')}</li>
                <li><strong>{t('products.status')}</strong> - {t('products.csvColumnStatus')}</li>
                <li><strong>{t('products.images')}</strong> - {t('products.csvColumnImages')}</li>
              </ul>
              <p>{t('products.step3')}</p>
              <p>{t('products.step4')}</p>
              <p>{t('products.step5')}</p>
            </>
          ) : (
            <>
              <p>{t('products.step1')}</p>
              <p>{t('products.step2Status')}</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>{t('products.sku')}</strong> - {t('products.csvStatusColumnSku')}</li>
                <li><strong>{t('products.status')}</strong> - {t('products.csvStatusColumnStatus')}</li>
              </ul>
              <p>{t('products.step3Status')}</p>
              <p>{t('products.step4Status')}</p>
              <p>{t('products.step5Status')}</p>
            </>
          )}
        </div>
        <button
          onClick={downloadTemplate}
          className="btn btn-secondary mt-4 flex items-center gap-2"
        >
          <Download size={18} />
          {t('products.downloadTemplate')}
        </button>
      </div>

      {/* File Upload */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">{t('products.uploadCsvFile')}</h2>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-[#EBEBEB] rounded-lg p-12 text-center hover:border-primary transition-colors"
        >
          <Upload size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <p className="text-[#5C5C5C] mb-4">
            {t('products.dragDropFile')}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            className="hidden"
            id="csv-upload"
          />
          <label htmlFor="csv-upload" className="btn btn-primary cursor-pointer">
            {t('products.selectFile')}
          </label>
          {file && (
            <div className="mt-4">
              <p className="text-sm text-[#5C5C5C]">
                {translate('products.selectedFile', { filename: file.name, size: (file.size / 1024).toFixed(2) })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="card p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-500" size={20} />
            <h3 className="text-lg font-semibold text-red-700">
              {t('products.validationErrors')} ({validationErrors.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm text-[#5C5C5C] bg-red-50 p-2 rounded">
                <strong>{t('products.row')} {error.row}</strong>
                {error.field && ` - ${error.field}: `}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {showPreview && validationErrors.length === 0 && (
        <div className="card p-6 border-l-4 border-green-500">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-500" size={20} />
            <h3 className="text-lg font-semibold text-green-700">
              {t('products.previewReady')}
            </h3>
          </div>
          {importMode === 'products' ? (
            <div>
              <p className="text-[#5C5C5C] mb-4">
                {translate('products.productsReady', { count: parsedProducts.length })}
              </p>
              <div className="max-h-64 overflow-y-auto">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>{t('products.sku')}</th>
                      <th>Name (TR)</th>
                      <th>Name (EN)</th>
                      <th>{t('products.brand')}</th>
                      <th>{t('products.category')}</th>
                      <th>{t('products.price')}</th>
                      <th>{t('products.stock')}</th>
                      <th>{t('products.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedProducts.slice(0, 10).map((product, index) => (
                      <tr key={index}>
                        <td>{product.sku}</td>
                        <td>{product.nameTr}</td>
                        <td>{product.nameEn}</td>
                        <td>{product.brand}</td>
                        <td>{product.category}</td>
                        <td>{defaultCurrency?.symbol || '₺'}{product.price?.toLocaleString() || '0'}</td>
                        <td>{product.stock || '0'}</td>
                        <td>
                          <span className={`badge ${product.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                            {product.status === 'complete' ? t('products.complete') : t('products.draft')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedProducts.length > 10 && (
                  <p className="text-sm text-[#5C5C5C] mt-2">
                    {translate('products.andMore', { count: parsedProducts.length - 10 })}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[#5C5C5C] mb-4">
                {translate('products.statusUpdatesReady', { count: parsedStatusUpdates.length })}
              </p>
              <div className="max-h-64 overflow-y-auto">
                <table className="table text-sm">
                  <thead>
                    <tr>
                      <th>{t('products.sku')}</th>
                      <th>{t('products.newStatus') || 'New Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStatusUpdates.slice(0, 20).map((update, index) => (
                      <tr key={index}>
                        <td>{update.sku}</td>
                        <td>
                          <span className={`badge ${update.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                            {update.status === 'complete' ? t('products.complete') : t('products.draft')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedStatusUpdates.length > 20 && (
                  <p className="text-sm text-[#5C5C5C] mt-2">
                    {translate('products.andMoreUpdates', { count: parsedStatusUpdates.length - 20 })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResults && (
        <div className={`card p-6 border-l-4 ${importResults.failed > 0 ? 'border-yellow-500' : 'border-green-500'}`}>
          <div className="flex items-center gap-2 mb-4">
            {importResults.failed > 0 ? (
              <AlertCircle className="text-yellow-500" size={20} />
            ) : (
              <CheckCircle className="text-green-500" size={20} />
            )}
            <h3 className="text-lg font-semibold">
              {t('products.importResults')}
            </h3>
          </div>
          <div className="space-y-2">
            <p className="text-[#5C5C5C]">
              <strong className="text-green-600">{t('products.success')}:</strong> {importResults.success}
            </p>
            {importResults.failed > 0 && (
              <p className="text-[#5C5C5C]">
                <strong className="text-red-600">{t('products.failed')}:</strong> {importResults.failed}
              </p>
            )}
            {importResults.errors.length > 0 && (
              <div className="mt-4">
                <p className="font-semibold mb-2">{t('products.errors')}:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto bg-[#F7F7F7] p-3 rounded">
                  {importResults.errors.map((error, index) => (
                    <p key={index} className="text-sm text-red-600">{error}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showPreview && validationErrors.length === 0 && !importResults && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setFile(null);
              setCsvContent('');
              setParsedProducts([]);
              setParsedStatusUpdates([]);
              setShowPreview(false);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="btn btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="btn btn-primary"
          >
            {isImporting ? t('products.importing') : importMode === 'products' ? t('products.importProducts') : t('products.updateStatuses')}
          </button>
        </div>
      )}

      {importResults && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => navigate('/products')}
            className="btn btn-primary"
          >
            {t('products.goToProducts')}
          </button>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;


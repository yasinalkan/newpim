import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Upload,
  Download,
  FileSpreadsheet,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Package,
  DollarSign,
  TrendingUp,
  Edit,
  Loader,
} from 'lucide-react';
import {
  parseCSV,
  parseProductsFromCSV,
  generateProductImportTemplate,
  type ParsedProduct,
  type ValidationError,
} from '../utils/csvParser';
import type { ProductStatus, Currency } from '../types';

type ActionTab = 'create' | 'update' | 'price' | 'stock';

interface BulkPriceUpdate {
  sku: string;
  price: number;
}

interface BulkStockUpdate {
  sku: string;
  stock: number;
}

interface BulkProductUpdate {
  sku: string;
  [key: string]: any;
}

const BulkActionsPage: React.FC = () => {
  const { products, brands, categories, createProduct, updateProduct, getProduct, settings } = useData();
  const activeCurrencies = settings.currencies?.filter((c: Currency) => c.isActive) || [];
  const defaultCurrency = activeCurrencies.find((c: Currency) => c.isDefault) || activeCurrencies[0];
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActionTab>('create');
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Create/Update states
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Price update states
  const [priceUpdates, setPriceUpdates] = useState<BulkPriceUpdate[]>([]);

  // Stock update states
  const [stockUpdates, setStockUpdates] = useState<BulkStockUpdate[]>([]);

  // Product update states
  const [productUpdates, setProductUpdates] = useState<BulkProductUpdate[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate templates for download
  const handleDownloadTemplate = () => {
    let csvContent = '';
    let filename = '';

    switch (activeTab) {
      case 'create':
        csvContent = generateProductImportTemplate();
        filename = 'bulk_create_products_template.csv';
        break;
      case 'update':
        csvContent = generateBulkUpdateTemplate();
        filename = 'bulk_update_products_template.csv';
        break;
      case 'price':
        csvContent = generatePriceUpdateTemplate();
        filename = 'bulk_price_update_template.csv';
        break;
      case 'stock':
        csvContent = generateStockUpdateTemplate();
        filename = 'bulk_stock_update_template.csv';
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const validExtensions = ['.csv', '.txt'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Please select a CSV file (.csv or .txt)');
      return;
    }

    setFile(selectedFile);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      parseFileContent(content);
    };
    reader.readAsText(selectedFile);
  };

  const parseFileContent = (content: string) => {
    try {
      const rows = parseCSV(content);
      
      switch (activeTab) {
        case 'create':
          const { products: parsed, errors } = parseProductsFromCSV(rows, brands, categories);
          setParsedProducts(parsed);
          setValidationErrors(errors);
          break;
        case 'update':
          parseUpdateProducts(rows);
          break;
        case 'price':
          parsePriceUpdates(rows);
          break;
        case 'stock':
          parseStockUpdates(rows);
          break;
      }
    } catch (error) {
      alert(`Error parsing file: ${(error as Error).message}`);
    }
  };

  const parseUpdateProducts = (rows: any[]) => {
    const updates: BulkProductUpdate[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const sku = row['SKU'] || row['sku'];
      if (!sku) {
        errors.push(`Row ${index + 2}: SKU is required`);
        return;
      }

      updates.push({ ...row, sku });
    });

    setProductUpdates(updates);
    if (errors.length > 0) {
      setResults({ success: 0, failed: errors.length, errors, warnings: [] });
    }
  };

  const parsePriceUpdates = (rows: any[]) => {
    const updates: BulkPriceUpdate[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const sku = row['SKU'] || row['sku'];
      const priceStr = row['Price'] || row['price'];

      if (!sku) {
        errors.push(`Row ${index + 2}: SKU is required`);
        return;
      }

      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) {
        errors.push(`Row ${index + 2}: Invalid price value`);
        return;
      }

      updates.push({ sku, price });
    });

    setPriceUpdates(updates);
    if (errors.length > 0) {
      setResults({ success: 0, failed: errors.length, errors, warnings: [] });
    }
  };

  const parseStockUpdates = (rows: any[]) => {
    const updates: BulkStockUpdate[] = [];
    const errors: string[] = [];

    rows.forEach((row, index) => {
      const sku = row['SKU'] || row['sku'];
      const stockStr = row['Stock'] || row['stock'];

      if (!sku) {
        errors.push(`Row ${index + 2}: SKU is required`);
        return;
      }

      const stock = parseInt(stockStr);
      if (isNaN(stock) || stock < 0) {
        errors.push(`Row ${index + 2}: Invalid stock value`);
        return;
      }

      updates.push({ sku, stock });
    });

    setStockUpdates(updates);
    if (errors.length > 0) {
      setResults({ success: 0, failed: errors.length, errors, warnings: [] });
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    let success = 0;
    let failed = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      switch (activeTab) {
        case 'create':
          await processCreateProducts(parsedProducts, { success, failed, errors, warnings });
          break;
        case 'update':
          await processUpdateProducts(productUpdates, { success, failed, errors, warnings });
          break;
        case 'price':
          await processPriceUpdates(priceUpdates, { success, failed, errors, warnings });
          break;
        case 'stock':
          await processStockUpdates(stockUpdates, { success, failed, errors, warnings });
          break;
      }
    } catch (error) {
      errors.push(`Processing error: ${(error as Error).message}`);
    }

    setIsProcessing(false);
  };

  const processCreateProducts = async (
    items: ParsedProduct[],
    stats: { success: number; failed: number; errors: string[]; warnings: string[] }
  ) => {
    for (const item of items) {
      try {
        const brand = brands.find(b => b.id === item.brandId);
        
        const itemPrice = item.price || 0;
        createProduct({
          sku: item.sku,
          baseSKU: null,
          name: { tr: item.nameTr, en: item.nameEn },
          brand: brand?.name || '',
          brandId: item.brandId!,
          categoryId: item.categoryId!,
          description: { tr: item.descriptionTr || '', en: item.descriptionEn || '' },
          keywords: null,
          stock: item.stock || 0,
          price: itemPrice,
          prices: { [defaultCurrency?.code || 'TRY']: itemPrice },
          images: item.images || [],
          imageUrl: item.images?.[0] || '',
          attributes: {},
          status: item.status || 'draft',
          parentProductId: null,
          variantAttributes: null,
          isBaseProduct: false,
          createdBy: currentUser?.id || 1,
          updatedBy: currentUser?.id || 1,
        });
        
        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push(`SKU ${item.sku}: ${(error as Error).message}`);
      }
    }

    setResults(stats);
  };

  const processUpdateProducts = async (
    items: BulkProductUpdate[],
    stats: { success: number; failed: number; errors: string[]; warnings: string[] }
  ) => {
    for (const item of items) {
      try {
        const existingProduct = products.find(p => p.sku === item.sku);
        if (!existingProduct) {
          stats.failed++;
          stats.errors.push(`SKU ${item.sku}: Product not found`);
          continue;
        }

        const updateData: any = {};
        
        // Map CSV columns to product fields
        if (item['Name (TR)'] || item['name_tr']) {
          updateData.name = {
            ...(typeof existingProduct.name === 'object' ? existingProduct.name : {}),
            tr: item['Name (TR)'] || item['name_tr']
          };
        }
        
        if (item['Name (EN)'] || item['name_en']) {
          updateData.name = {
            ...updateData.name,
            en: item['Name (EN)'] || item['name_en']
          };
        }

        if (item['Price'] || item['price']) {
          const newPrice = parseFloat(item['Price'] || item['price']);
          updateData.price = newPrice;
          updateData.prices = { ...(existingProduct.prices || {}), [defaultCurrency?.code || 'TRY']: newPrice };
        }

        if (item['Stock'] || item['stock']) {
          updateData.stock = parseInt(item['Stock'] || item['stock']);
        }

        if (item['Status'] || item['status']) {
          updateData.status = item['Status'] || item['status'];
        }

        updateData.updatedBy = currentUser?.id || 1;

        updateProduct(existingProduct.id, updateData);
        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push(`SKU ${item.sku}: ${(error as Error).message}`);
      }
    }

    setResults(stats);
  };

  const processPriceUpdates = async (
    items: BulkPriceUpdate[],
    stats: { success: number; failed: number; errors: string[]; warnings: string[] }
  ) => {
    for (const item of items) {
      try {
        const existingProduct = products.find(p => p.sku === item.sku);
        if (!existingProduct) {
          stats.failed++;
          stats.errors.push(`SKU ${item.sku}: Product not found`);
          continue;
        }

        updateProduct(existingProduct.id, {
          price: item.price,
          prices: { ...(existingProduct.prices || {}), [defaultCurrency?.code || 'TRY']: item.price },
          updatedBy: currentUser?.id || 1,
        });
        
        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push(`SKU ${item.sku}: ${(error as Error).message}`);
      }
    }

    setResults(stats);
  };

  const processStockUpdates = async (
    items: BulkStockUpdate[],
    stats: { success: number; failed: number; errors: string[]; warnings: string[] }
  ) => {
    for (const item of items) {
      try {
        const existingProduct = products.find(p => p.sku === item.sku);
        if (!existingProduct) {
          stats.failed++;
          stats.errors.push(`SKU ${item.sku}: Product not found`);
          continue;
        }

        updateProduct(existingProduct.id, {
          stock: item.stock,
          updatedBy: currentUser?.id || 1,
        });
        
        stats.success++;
      } catch (error) {
        stats.failed++;
        stats.errors.push(`SKU ${item.sku}: ${(error as Error).message}`);
      }
    }

    setResults(stats);
  };

  const getTotalItems = () => {
    switch (activeTab) {
      case 'create':
        return parsedProducts.length;
      case 'update':
        return productUpdates.length;
      case 'price':
        return priceUpdates.length;
      case 'stock':
        return stockUpdates.length;
      default:
        return 0;
    }
  };

  const canProcess = () => {
    const total = getTotalItems();
    return total > 0 && validationErrors.length === 0 && !isProcessing;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-[#5C5C5C] hover:text-[#171717] transition-colors mb-4"
        >
          <ArrowLeft size={18} />
          <span>Back to Products</span>
        </button>
        <h1 className="text-2xl font-bold text-[#171717]">Bulk Actions</h1>
        <p className="text-[#5C5C5C] mt-1">
          Perform bulk operations on products using CSV files
        </p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-[#EBEBEB]">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('create');
                setFile(null);
                setResults(null);
                setParsedProducts([]);
                setValidationErrors([]);
              }}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'create'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#171717] hover:border-[#EBEBEB]'
              }`}
            >
              <Package size={18} />
              Create Products
            </button>
            <button
              onClick={() => {
                setActiveTab('update');
                setFile(null);
                setResults(null);
                setProductUpdates([]);
              }}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'update'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#171717] hover:border-[#EBEBEB]'
              }`}
            >
              <Edit size={18} />
              Update Products
            </button>
            <button
              onClick={() => {
                setActiveTab('price');
                setFile(null);
                setResults(null);
                setPriceUpdates([]);
              }}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'price'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#171717] hover:border-[#EBEBEB]'
              }`}
            >
              <DollarSign size={18} />
              Update Prices
            </button>
            <button
              onClick={() => {
                setActiveTab('stock');
                setFile(null);
                setResults(null);
                setStockUpdates([]);
              }}
              className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'stock'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#171717] hover:border-[#EBEBEB]'
              }`}
            >
              <TrendingUp size={18} />
              Update Stock
            </button>
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {/* Tab Content */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#171717]">Bulk Create Products</h3>
              <p className="text-sm text-[#5C5C5C]">
                Upload a CSV file to create multiple products at once. Download the template to see the required format.
              </p>
            </div>
          )}

          {activeTab === 'update' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#171717]">Bulk Update Products</h3>
              <p className="text-sm text-[#5C5C5C]">
                Upload a CSV file to update existing products. Only include the fields you want to update.
              </p>
            </div>
          )}

          {activeTab === 'price' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#171717]">Bulk Update Prices</h3>
              <p className="text-sm text-[#5C5C5C]">
                Upload a CSV file with SKU and Price columns to update product prices in bulk.
              </p>
            </div>
          )}

          {activeTab === 'stock' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-[#171717]">Bulk Update Stock</h3>
              <p className="text-sm text-[#5C5C5C]">
                Upload a CSV file with SKU and Stock columns to update product stock levels in bulk.
              </p>
            </div>
          )}

          {/* Download Template */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="btn btn-secondary flex items-center gap-2"
            >
              <Download size={18} />
              Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-[#EBEBEB] rounded-lg p-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!file ? (
              <div className="text-center">
                <Upload size={48} className="mx-auto text-[#A4A4A4] mb-4" />
                <h4 className="font-medium text-[#171717] mb-2">Upload CSV File</h4>
                <p className="text-sm text-[#5C5C5C] mb-4">
                  Drag and drop or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-primary"
                >
                  Select File
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet size={24} className="text-primary" />
                  <div>
                    <p className="font-medium text-[#171717]">{file.name}</p>
                    <p className="text-sm text-[#5C5C5C]">
                      {getTotalItems()} items found
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setResults(null);
                    setParsedProducts([]);
                    setValidationErrors([]);
                    setPriceUpdates([]);
                    setStockUpdates([]);
                    setProductUpdates([]);
                  }}
                  className="btn btn-secondary"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 mb-2">Validation Errors</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {validationErrors.slice(0, 10).map((error, index) => (
                      <li key={index}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                    {validationErrors.length > 10 && (
                      <li className="font-medium">
                        ...and {validationErrors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Process Button */}
          {file && getTotalItems() > 0 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#EBEBEB]">
              <div>
                <p className="font-medium text-[#171717]">
                  Ready to process {getTotalItems()} items
                </p>
                <p className="text-sm text-[#5C5C5C]">
                  {validationErrors.length === 0 ? 'No errors found' : `${validationErrors.length} errors to fix`}
                </p>
              </div>
              <button
                onClick={handleProcess}
                disabled={!canProcess()}
                className="btn btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Process
                  </>
                )}
              </button>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-4 pt-4 border-t border-[#EBEBEB]">
              <h4 className="font-semibold text-[#171717]">Results</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={24} className="text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">{results.success}</p>
                      <p className="text-sm text-green-700">Successful</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <XCircle size={24} className="text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-red-900">{results.failed}</p>
                      <p className="text-sm text-red-700">Failed</p>
                    </div>
                  </div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h5 className="font-semibold text-red-900 mb-2">Errors</h5>
                  <ul className="text-sm text-red-800 space-y-1">
                    {results.errors.slice(0, 10).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {results.errors.length > 10 && (
                      <li className="font-medium">
                        ...and {results.errors.length - 10} more errors
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {results.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h5 className="font-semibold text-yellow-900 mb-2">Warnings</h5>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    {results.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Template generators
function generateBulkUpdateTemplate(): string {
  return `SKU,Name (TR),Name (EN),Price,Stock,Status
SAMPLE-001,Örnek Ürün,Sample Product,99.99,100,complete
SAMPLE-002,Test Ürünü,Test Product,149.99,50,draft`;
}

function generatePriceUpdateTemplate(): string {
  return `SKU,Price
SAMPLE-001,99.99
SAMPLE-002,149.99
SAMPLE-003,199.99`;
}

function generateStockUpdateTemplate(): string {
  return `SKU,Stock
SAMPLE-001,100
SAMPLE-002,50
SAMPLE-003,75`;
}

export default BulkActionsPage;

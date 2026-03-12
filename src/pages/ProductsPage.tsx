import React, { useState, useMemo, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  X,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  MoreVertical,
  Tag,
  Tags,
  DollarSign,
  Package2,
  ChevronDown,
  ChevronRight,
  Upload,
  Download,
  Copy,
  Clock,
} from 'lucide-react';
import Pagination from '../components/Pagination';
import { calculateProductCompleteness, getCompletenessColor } from '../utils/completeness';
import type { Product, ProductStatus, Currency } from '../types';

const ProductsPage: React.FC = () => {
  const location = useLocation();
  const { t, getText, defaultLanguage } = useLanguage();
  const { 
    products, 
    deleteProduct,
    updateProduct,
    brands, 
    categories,
    attributes,
    hasProductOrders, 
    getProductOrders,
    bulkDeleteProducts,
    bulkUpdateProductStatus,
    bulkUpdatePrice,
    bulkUpdateStock,
    channels,
    createExportLog,
    settings,
  } = useData();
  const activeCurrencies = settings.currencies?.filter((c: Currency) => c.isActive) || [];
  const defaultCurrency = activeCurrencies.find((c: Currency) => c.isDefault) || activeCurrencies[0];
  const { hasPermission, currentUser } = useAuth();

  // Search and filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<number | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [stockMinFilter, setStockMinFilter] = useState<string>('');
  const [stockMaxFilter, setStockMaxFilter] = useState<string>('');
  const [priceMinFilter, setPriceMinFilter] = useState<string>('');
  const [priceMaxFilter, setPriceMaxFilter] = useState<string>('');
  const [createdDateFromFilter, setCreatedDateFromFilter] = useState<string>('');
  const [createdDateToFilter, setCreatedDateToFilter] = useState<string>('');
  const [updatedDateFromFilter, setUpdatedDateFromFilter] = useState<string>('');
  const [updatedDateToFilter, setUpdatedDateToFilter] = useState<string>('');
  const [baseProductFilter, setBaseProductFilter] = useState<number | 'all'>('all'); // FR-10.6: Filter by base product
  const [variantAttributeFilters, setVariantAttributeFilters] = useState<Record<number, string>>({}); // FR-10.6: Filter by variant attributes
  const [productAttributeFilters, setProductAttributeFilters] = useState<Record<number, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'draft'>(
    (location.state as { tab?: string } | null)?.tab === 'pending' ? 'pending'
    : (location.state as { tab?: string } | null)?.tab === 'draft' ? 'draft'
    : 'active'
  );
  const [sortBy, setSortBy] = useState<'name' | 'sku' | 'brand' | 'category' | 'status' | 'price' | 'stock' | 'createdAt' | 'updatedAt'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Expanded base products state (for showing variants)
  const [expandedBaseProducts, setExpandedBaseProducts] = useState<Set<number>>(new Set());
  
  // Bulk selection state (FR-3.5)
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  
  // Bulk action modals state
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [showBulkStockModal, setShowBulkStockModal] = useState(false);
  const [bulkStatusTarget, setBulkStatusTarget] = useState<ProductStatus>('complete');
  const [bulkPriceMethod, setBulkPriceMethod] = useState<'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent'>('set');
  const [bulkPriceValue, setBulkPriceValue] = useState<string>('');
  const [bulkStockMethod, setBulkStockMethod] = useState<'set' | 'increase' | 'decrease'>('set');
  const [bulkStockValue, setBulkStockValue] = useState<string>('');

  // Bulk publish to channels state
  const [showBulkPublishModal, setShowBulkPublishModal] = useState(false);
  const [bulkPublishType, setBulkPublishType] = useState<'stock' | 'price' | 'product'>('product');
  const [bulkPublishChannelIds, setBulkPublishChannelIds] = useState<Set<string>>(new Set());
  
  // Inline editing state
  const [editingStock, setEditingStock] = useState<number | null>(null);
  const [editingPrice, setEditingPrice] = useState<number | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');
  const [editingPriceValue, setEditingPriceValue] = useState<string>('');

  // Permissions
  const canEdit = hasPermission('products', 'edit');
  const canDelete = hasPermission('products', 'update');
  const canCreate = currentUser?.role === 'admin' || hasPermission('products', 'edit');
  const isAdmin = currentUser?.role === 'admin';

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter((product) => {
      // Tab filter: Active tab shows complete products, Pending tab shows pending products, Draft tab shows draft
      if (activeTab === 'active' && product.status !== 'complete') return false;
      if (activeTab === 'pending' && product.status !== 'pending') return false;
      if (activeTab === 'draft' && product.status !== 'draft') return false;

      // Search filter (FR-5.1: Product Search, FR-10.6: Variant Search)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const name = getText(product.name).toLowerCase();
        const sku = product.sku.toLowerCase();
        const brand = product.brand.toLowerCase();
        const model = (product.model || '').toLowerCase();
        const description = typeof product.description === 'string'
          ? product.description.toLowerCase()
          : (getText(product.description) || '').toLowerCase();

        // Search variant attributes (FR-10.6)
        let variantAttributeMatch = false;
        if (product.variantAttributes) {
          const variantAttrValues = Object.values(product.variantAttributes)
            .map(v => String(v).toLowerCase())
            .join(' ');
          variantAttributeMatch = variantAttrValues.includes(query);
          
          // Also check attribute names
          const variantAttrNames = Object.keys(product.variantAttributes).map(attrId => {
            const attr = attributes.find(a => a.id === parseInt(attrId));
            return attr ? getText(attr.name).toLowerCase() : '';
          }).join(' ');
          variantAttributeMatch = variantAttributeMatch || variantAttrNames.includes(query);
        }

        // Multi-field search: name (TR/EN), SKU, brand, model, description keywords, variant attributes
        if (
          !name.includes(query) &&
          !sku.includes(query) &&
          !brand.includes(query) &&
          !model.includes(query) &&
          !description.includes(query) &&
          !variantAttributeMatch
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && product.status !== statusFilter) {
        return false;
      }

      // Brand filter
      if (brandFilter !== 'all' && product.brandId !== brandFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && product.categoryId !== categoryFilter) {
        return false;
      }

      // Stock range filter
      if (stockMinFilter) {
        const minStock = parseInt(stockMinFilter);
        if (!isNaN(minStock) && product.stock < minStock) {
          return false;
        }
      }
      if (stockMaxFilter) {
        const maxStock = parseInt(stockMaxFilter);
        if (!isNaN(maxStock) && product.stock > maxStock) {
          return false;
        }
      }

      // Price range filter (FR-5.2)
      if (priceMinFilter) {
        const minPrice = parseFloat(priceMinFilter);
        if (!isNaN(minPrice) && product.price < minPrice) {
          return false;
        }
      }
      if (priceMaxFilter) {
        const maxPrice = parseFloat(priceMaxFilter);
        if (!isNaN(maxPrice) && product.price > maxPrice) {
          return false;
        }
      }

      // Created date range filter (FR-5.2)
      if (createdDateFromFilter) {
        const fromDate = new Date(createdDateFromFilter);
        const productDate = new Date(product.createdAt);
        if (productDate < fromDate) {
          return false;
        }
      }
      if (createdDateToFilter) {
        const toDate = new Date(createdDateToFilter);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        const productDate = new Date(product.createdAt);
        if (productDate > toDate) {
          return false;
        }
      }

      // Updated date range filter (FR-5.2)
      if (updatedDateFromFilter) {
        const fromDate = new Date(updatedDateFromFilter);
        const productDate = new Date(product.updatedAt);
        if (productDate < fromDate) {
          return false;
        }
      }
      if (updatedDateToFilter) {
        const toDate = new Date(updatedDateToFilter);
        toDate.setHours(23, 59, 59, 999); // Include entire day
        const productDate = new Date(product.updatedAt);
        if (productDate > toDate) {
          return false;
        }
      }

      // Base product filter (FR-10.6)
      if (baseProductFilter !== 'all') {
        if (baseProductFilter === 0) {
          // Filter for base products only
          if (!product.isBaseProduct) return false;
        } else {
          // Filter for variants of specific base product
          if (product.parentProductId !== baseProductFilter) return false;
        }
      }

      // Variant attribute filters (FR-10.6)
      if (Object.keys(variantAttributeFilters).length > 0) {
        // Only apply variant filters to variant products
        if (!product.parentProductId) return false;
        
        // Check if product matches all selected variant attribute filters
        for (const [attrId, filterValue] of Object.entries(variantAttributeFilters)) {
          if (filterValue && filterValue !== 'all') {
            const productVariantValue = product.variantAttributes?.[attrId];
            if (String(productVariantValue) !== filterValue) {
              return false;
            }
          }
        }
      }

      // Product attribute filters
      for (const [attrId, filterValue] of Object.entries(productAttributeFilters)) {
        if (filterValue && filterValue !== '') {
          const productAttrValue = product.attributes?.[attrId]?.value;
          if (productAttrValue === undefined || productAttrValue === null || productAttrValue === '') {
            return false;
          }
          if (String(productAttrValue).toLowerCase() !== filterValue.toLowerCase()) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = getText(a.name).toLowerCase();
          bValue = getText(b.name).toLowerCase();
          break;
        case 'sku':
          aValue = a.sku.toLowerCase();
          bValue = b.sku.toLowerCase();
          break;
        case 'brand':
          aValue = a.brand.toLowerCase();
          bValue = b.brand.toLowerCase();
          break;
        case 'category':
          const aCategory = categories.find(c => c.id === a.categoryId);
          const bCategory = categories.find(c => c.id === b.categoryId);
          aValue = aCategory ? getText(aCategory.name).toLowerCase() : '';
          bValue = bCategory ? getText(bCategory.name).toLowerCase() : '';
          break;
        case 'status':
          // Sort: 'complete' comes before 'draft' alphabetically, but we want 'complete' first
          aValue = a.status === 'complete' ? 0 : a.status === 'pending' ? 1 : 2;
          bValue = b.status === 'complete' ? 0 : b.status === 'pending' ? 1 : 2;
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'stock':
          aValue = a.stock;
          bValue = b.stock;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [products, categories, attributes, searchQuery, activeTab, statusFilter, brandFilter, categoryFilter, stockMinFilter, stockMaxFilter, priceMinFilter, priceMaxFilter, createdDateFromFilter, createdDateToFilter, updatedDateFromFilter, updatedDateToFilter, baseProductFilter, variantAttributeFilters, productAttributeFilters, sortBy, sortOrder, getText]);

  // Group products by base product for hierarchical display
  const groupedProducts = useMemo(() => {
    const baseProducts: Product[] = [];
    const variantsByBase: Record<number, Product[]> = {};
    const processedVariants = new Set<number>();
    
    filteredProducts.forEach(product => {
      // Skip variants - we'll process them when we find their base product
      if (product.parentProductId && !product.isBaseProduct) {
        processedVariants.add(product.id);
        return;
      }
      
      // This is a base product or standalone product
      baseProducts.push(product);
      
      // Find variants of this base product
      const variants = filteredProducts.filter(p => 
        p.parentProductId === product.id && !p.isBaseProduct
      );
      if (variants.length > 0) {
        variantsByBase[product.id] = variants;
        variants.forEach(v => processedVariants.add(v.id));
      }
    });
    
    // Handle orphaned variants (base product not in filtered results)
    filteredProducts.forEach(product => {
      if (product.parentProductId && !processedVariants.has(product.id)) {
        baseProducts.push(product);
      }
    });
    
    return { baseProducts, variantsByBase };
  }, [filteredProducts]);

  // Get products to display (base products + expanded variants)
  const displayProducts = useMemo(() => {
    const result: Array<{ product: Product; isVariant: boolean; baseProductId?: number }> = [];
    
    groupedProducts.baseProducts.forEach(baseProduct => {
      result.push({ product: baseProduct, isVariant: false });
      
      // Add variants if base product is expanded
      if (expandedBaseProducts.has(baseProduct.id) && groupedProducts.variantsByBase[baseProduct.id]) {
        groupedProducts.variantsByBase[baseProduct.id].forEach(variant => {
          result.push({ product: variant, isVariant: true, baseProductId: baseProduct.id });
        });
      }
    });
    
    return result;
  }, [groupedProducts, expandedBaseProducts]);

  // Pagination
  const totalPages = Math.ceil(displayProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = displayProducts.slice(startIndex, endIndex);
  
  // Toggle expand/collapse for base product
  const toggleExpandBaseProduct = (baseProductId: number) => {
    setExpandedBaseProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(baseProductId)) {
        newSet.delete(baseProductId);
      } else {
        newSet.add(baseProductId);
      }
      return newSet;
    });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeTab, statusFilter, brandFilter, categoryFilter, stockMinFilter, stockMaxFilter, priceMinFilter, priceMaxFilter, createdDateFromFilter, createdDateToFilter, updatedDateFromFilter, updatedDateToFilter, productAttributeFilters]);

  // Clear selection when filters change (FR-3.5)
  useEffect(() => {
    setSelectedProductIds(new Set());
    setLastSelectedIndex(null);
  }, [searchQuery, statusFilter, brandFilter, categoryFilter, stockMinFilter, stockMaxFilter, priceMinFilter, priceMaxFilter, createdDateFromFilter, createdDateToFilter, updatedDateFromFilter, updatedDateToFilter, baseProductFilter, variantAttributeFilters, productAttributeFilters, sortBy, sortOrder]);

  // Handle product deletion with order checking (FR-3.1, FR-10.7)
  const handleDelete = (product: Product) => {
    // Check for orders on product (FR-3.1)
    if (hasProductOrders(product.id)) {
      const productOrders = getProductOrders(product.id);
      const orderCount = productOrders.length;
      const orderNumbers = productOrders.map(o => o.orderNumber).join(', ');
      
      alert(
        `Cannot delete product "${getText(product.name)}". It has ${orderCount} associated order${orderCount !== 1 ? 's' : ''}:\n${orderNumbers}\n\nProducts with orders cannot be deleted.`
      );
      return;
    }

    // Handle variant deletion (FR-10.7)
    if (product.parentProductId) {
      const baseProduct = products.find(p => p.id === product.parentProductId);
      if (baseProduct) {
        const allVariants = products.filter(p => p.parentProductId === baseProduct.id);
        const isLastVariant = allVariants.length === 1;
        
        if (isLastVariant) {
          // Last variant deletion - offer to convert base to standalone (FR-10.7)
          const choice = window.confirm(
            `This is the last variant of "${getText(baseProduct.name)}".\n\n` +
            `Click OK to delete the variant and convert the base product to standalone.\n` +
            `Click Cancel to abort deletion.`
          );
          
          if (choice) {
            deleteProduct(product.id);
            // Convert base product to standalone (FR-10.7)
            updateProduct(baseProduct.id, {
              isBaseProduct: false,
            });
          }
          return;
        } else {
          // Not the last variant
          if (window.confirm(`Delete variant "${product.sku}"? The base product will remain with ${allVariants.length - 1} other variant${allVariants.length - 1 !== 1 ? 's' : ''}.`)) {
            deleteProduct(product.id);
          }
          return;
        }
      }
    }

    // Handle base product deletion (FR-10.7)
    if (product.isBaseProduct) {
      const variants = products.filter(p => p.parentProductId === product.id);
      if (variants.length > 0) {
        // Check for orders on variants
        const variantsWithOrders = variants.filter(v => hasProductOrders(v.id));
        if (variantsWithOrders.length > 0) {
          const variantOrderInfo = variantsWithOrders.map(v => {
            const orders = getProductOrders(v.id);
            return `${v.sku} (${orders.length} order${orders.length !== 1 ? 's' : ''})`;
          }).join('\n');
          
          alert(
            `Cannot delete product "${getText(product.name)}". Some variants have associated orders:\n${variantOrderInfo}\n\nProducts with orders cannot be deleted.`
          );
          return;
        }

        if (window.confirm(`Delete base product "${getText(product.name)}" and all ${variants.length} variant${variants.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
          // Delete all variants first
          variants.forEach(v => {
            if (!hasProductOrders(v.id)) {
              deleteProduct(v.id);
            }
          });
          deleteProduct(product.id);
        }
        return;
      }
    }

    // Handle standalone product deletion
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(product.id);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setBrandFilter('all');
    setCategoryFilter('all');
    setStockMinFilter('');
    setStockMaxFilter('');
    setPriceMinFilter('');
    setPriceMaxFilter('');
    setCreatedDateFromFilter('');
    setCreatedDateToFilter('');
    setUpdatedDateFromFilter('');
    setUpdatedDateToFilter('');
    setBaseProductFilter('all');
    setVariantAttributeFilters({});
    setProductAttributeFilters({});
  };

  const hasActiveFilters = statusFilter !== 'all' || brandFilter !== 'all' || categoryFilter !== 'all' || stockMinFilter !== '' || stockMaxFilter !== '' || priceMinFilter !== '' || priceMaxFilter !== '' || createdDateFromFilter !== '' || createdDateToFilter !== '' || updatedDateFromFilter !== '' || updatedDateToFilter !== '' || baseProductFilter !== 'all' || Object.keys(variantAttributeFilters).length > 0 || Object.values(productAttributeFilters).some(v => v !== '');

  // Bulk selection handlers (FR-3.5)
  const toggleProductSelection = (productId: number, index: number, event?: React.MouseEvent) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (event?.shiftKey && lastSelectedIndex !== null) {
        // Range selection (Shift+Click)
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const isCurrentlySelected = newSet.has(productId);
        
        for (let i = start; i <= end; i++) {
          const id = paginatedProducts[i].product.id;
          if (isCurrentlySelected) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
        }
      } else {
        // Individual selection
        if (newSet.has(productId)) {
          newSet.delete(productId);
        } else {
          newSet.add(productId);
        }
      }
      return newSet;
    });
    setLastSelectedIndex(index);
  };

  const toggleSelectAllOnPage = () => {
    const allSelected = paginatedProducts.length > 0 && paginatedProducts.every(item => selectedProductIds.has(item.product.id));
    if (allSelected) {
      // Deselect all on page
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        paginatedProducts.forEach(item => newSet.delete(item.product.id));
        return newSet;
      });
    } else {
      // Select all on page
      setSelectedProductIds(prev => {
        const newSet = new Set(prev);
        paginatedProducts.forEach(item => newSet.add(item.product.id));
        return newSet;
      });
    }
    setLastSelectedIndex(null);
  };

  const selectAllMatchingFilters = () => {
    const count = filteredProducts.length;
    if (count > 100) {
      if (!window.confirm(`This will select ${count} products. Continue?`)) {
        return;
      }
    }
    setSelectedProductIds(new Set(filteredProducts.map(p => p.id)));
    setLastSelectedIndex(null);
  };

  const clearSelection = () => {
    setSelectedProductIds(new Set());
    setLastSelectedIndex(null);
  };

  const isAllSelectedOnPage = paginatedProducts.length > 0 && paginatedProducts.every(item => selectedProductIds.has(item.product.id));
  const selectedCount = selectedProductIds.size;

  // Get products that cannot be deleted (FR-3.6)
  const getProductsWithOrders = () => {
    const productIds = Array.from(selectedProductIds);
    return productIds
      .filter(id => hasProductOrders(id))
      .map(id => {
        const product = products.find(p => p.id === id);
        const orders = getProductOrders(id);
        return {
          id,
          name: product ? getText(product.name) : `Product #${id}`,
          sku: product?.sku || '',
          orderCount: orders.length,
          orderNumbers: orders.map(o => o.orderNumber).join(', '),
        };
      });
  };

  // Get products that don't meet status change criteria (FR-3.7)
  const getProductsInvalidForStatus = (targetStatus: ProductStatus) => {
    const productIds = Array.from(selectedProductIds);
    return productIds
      .map(id => {
        const product = products.find(p => p.id === id);
        if (!product) {
          return { id, name: `Product #${id}`, sku: '', reason: 'Product not found', missingFields: [] };
        }

        // Validate status change (draft/pending -> complete requires all required fields)
        if (targetStatus === 'complete' && (product.status === 'draft' || product.status === 'pending')) {
          const missingFields: string[] = [];
          
          // Check required fields in default language
          const defaultLangCode = defaultLanguage?.code || 'en';
          const productName = typeof product.name === 'string' ? product.name : product.name[defaultLangCode];
          const productDesc = typeof product.description === 'string' ? product.description : product.description[defaultLangCode];
          
          if (!productName?.trim()) missingFields.push(`Name (${defaultLanguage?.name || 'Default Language'})`);
          if (!product.sku?.trim()) missingFields.push('SKU');
          if (!product.categoryId) missingFields.push('Category');
          if (!product.brandId) missingFields.push('Brand');
          if (!productDesc?.trim()) missingFields.push(`Description (${defaultLanguage?.name || 'Default Language'})`);

          // Check required attributes from category
          if (product.categoryId) {
            const category = categories.find(c => c.id === product.categoryId);
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
          }

          if (missingFields.length > 0) {
            return {
              id,
              name: getText(product.name),
              sku: product.sku,
              reason: 'Missing required fields',
              missingFields,
            };
          }
        }

        return null;
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  };

  // Bulk action handlers
  const handleBulkDelete = () => {
    const productIds = Array.from(selectedProductIds);
    const result = bulkDeleteProducts(productIds);
    
    // Show success/failure summary (FR-3.6)
    if (result.failed.length > 0) {
      const failedProducts = result.failed.map(f => {
        const product = products.find(p => p.id === f.id);
        return product ? `${getText(product.name)} (${product.sku})` : `Product #${f.id}`;
      }).join('\n');
      
      alert(
        `Successfully deleted ${result.success} product(s).\n\n` +
        `Could not delete ${result.failed.length} product(s) (have associated orders):\n${failedProducts}`
      );
    } else {
      alert(`Successfully deleted ${result.success} product(s).`);
    }
    
    clearSelection();
    setShowBulkDeleteModal(false);
  };

  const handleBulkStatusChange = () => {
    const productIds = Array.from(selectedProductIds);
    const result = bulkUpdateProductStatus(productIds, bulkStatusTarget);
    
    if (result.failed.length > 0) {
      const failedProducts = result.failed.map(f => {
        const product = products.find(p => p.id === f.id);
        return product ? `${getText(product.name)} (${product.sku})` : `Product #${f.id}`;
      }).join('\n');
      
      alert(
        `Successfully updated ${result.success} product(s) to "${bulkStatusTarget}".\n\n` +
        `Could not update ${result.failed.length} product(s):\n${failedProducts}\n\n` +
        `Reason: ${result.failed[0].reason}`
      );
    } else {
      alert(`Successfully updated ${result.success} product(s) to "${bulkStatusTarget}".`);
    }
    
    clearSelection();
    setShowBulkStatusModal(false);
  };

  // Get common attributes across selected products (FR-3.9)

  const handleBulkPriceUpdate = () => {
    const value = parseFloat(bulkPriceValue);
    if (isNaN(value) || value < 0) {
      alert('Invalid price value');
      return;
    }
    
    const productIds = Array.from(selectedProductIds);
    bulkUpdatePrice(productIds, bulkPriceMethod, value);
    alert(`Successfully updated prices for ${productIds.length} product(s).`);
    
    clearSelection();
    setShowBulkPriceModal(false);
    setBulkPriceValue('');
    setBulkPriceMethod('set');
  };

  const handleBulkStockUpdate = () => {
    const value = parseInt(bulkStockValue);
    if (isNaN(value) || value < 0) {
      alert('Invalid stock value');
      return;
    }
    
    const productIds = Array.from(selectedProductIds);
    bulkUpdateStock(productIds, bulkStockMethod, value);
    alert(`Successfully updated stock for ${productIds.length} product(s).`);
    
    clearSelection();
    setShowBulkStockModal(false);
    setBulkStockValue('');
    setBulkStockMethod('set');
  };

  // Bulk publish handlers
  const handleBulkPublish = () => {
    if (bulkPublishChannelIds.size === 0) {
      alert('Please select at least one channel to publish to.');
      return;
    }

    const productIds = Array.from(selectedProductIds);
    const channelIdsArray = Array.from(bulkPublishChannelIds);
    const selectedChannels = channels.filter(c => bulkPublishChannelIds.has(c.id));

    // Create export log entries for each selected channel
    channelIdsArray.forEach(channelId => {
      createExportLog({
        channelId,
        productIds,
        exportFormat: 'api',
        status: 'success',
        errorCount: 0,
        warningCount: 0,
        exportedBy: currentUser?.id || 1,
        exportData: {
          type: bulkPublishType,
        },
      });
    });

    const channelNames = selectedChannels.map(c => c.name).join(', ');
    alert(
      `Queued ${bulkPublishType === 'product' ? 'product data' : bulkPublishType} export ` +
      `for ${productIds.length} product(s) to ${bulkPublishChannelIds.size} channel(s): ${channelNames}`
    );

    setShowBulkPublishModal(false);
    setBulkPublishChannelIds(new Set());
    clearSelection();
  };

  const toggleChannelSelection = (channelId: string) => {
    setBulkPublishChannelIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(channelId)) {
        newSet.delete(channelId);
      } else {
        newSet.add(channelId);
      }
      return newSet;
    });
  };

  const selectAllChannels = () => {
    setBulkPublishChannelIds(new Set(channels.map(c => c.id)));
  };

  const deselectAllChannels = () => {
    setBulkPublishChannelIds(new Set());
  };

  // Handle column header click for sorting (FR-5.3)
  const handleColumnSort = (column: 'name' | 'sku' | 'brand' | 'category' | 'status' | 'price' | 'stock' | 'createdAt' | 'updatedAt') => {
    if (sortBy === column) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new column and default to ascending
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort indicator for column header
  const getSortIndicator = (column: 'name' | 'sku' | 'brand' | 'category' | 'status' | 'price' | 'stock' | 'createdAt' | 'updatedAt') => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? <ArrowUp size={14} className="inline ml-1 text-primary" /> : <ArrowDown size={14} className="inline ml-1 text-primary" />;
  };

  // Get header button class for sorted column
  const getHeaderButtonClass = (column: 'name' | 'sku' | 'brand' | 'category' | 'status' | 'price' | 'stock' | 'createdAt' | 'updatedAt') => {
    const baseClass = "flex items-center hover:text-primary transition-colors font-medium";
    return sortBy === column ? `${baseClass} text-primary` : baseClass;
  };



  return (
    <div className="space-y-0">
      {/* Header */}
      {canCreate && (
        <div className="flex items-center justify-end px-6 py-4">
          <Link to="/products/new" className="btn btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add Product
          </Link>
        </div>
      )}

      {/* Tab Menu */}
      <div className="flex items-start px-6 py-2.5 bg-white border-b border-[#EBEBEB] gap-5">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-1.5 px-0 py-0 text-sm font-medium leading-5 tracking-[-0.006em] transition-colors relative ${
            activeTab === 'active' 
              ? 'text-[#171717]' 
              : 'text-[#5C5C5C]'
          }`}
        >
          <span>Active</span>
          <span className="text-xs text-[#A4A4A4]">
            ({products.filter(p => p.status === 'complete').length})
          </span>
          {activeTab === 'active' && (
            <div className="absolute bottom-[-14px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-1.5 px-0 py-0 text-sm font-medium leading-5 tracking-[-0.006em] transition-colors relative ${
            activeTab === 'pending' 
              ? 'text-[#171717]' 
              : 'text-[#5C5C5C]'
          }`}
        >
          <span>Pending Review</span>
          <span className={`text-xs ${
            activeTab === 'pending' ? 'text-blue-600' : 'text-[#A4A4A4]'
          }`}>
            ({products.filter(p => p.status === 'pending').length})
          </span>
          {activeTab === 'pending' && (
            <div className="absolute bottom-[-14px] left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('draft')}
          className={`flex items-center gap-1.5 px-0 py-0 text-sm font-medium leading-5 tracking-[-0.006em] transition-colors relative ${
            activeTab === 'draft' 
              ? 'text-[#171717]' 
              : 'text-[#5C5C5C]'
          }`}
        >
          <span>Draft</span>
          <span className="text-xs text-[#A4A4A4]">
            ({products.filter(p => p.status === 'draft').length})
          </span>
          {activeTab === 'draft' && (
            <div className="absolute bottom-[-14px] left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="px-6 py-4 space-y-4">

      {/* Search and Filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <div className="flex items-center gap-2 px-2.5 py-2 bg-white border border-[#EBEBEB] rounded-lg shadow-[0px_1px_2px_rgba(10,13,20,0.03)]">
            <Search size={20} className="text-[#A4A4A4] flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 bg-transparent border-0 outline-0 text-sm leading-5 text-[#A4A4A4] placeholder:text-[#A4A4A4]"
            />
          </div>
        </div>

        {/* Quick Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg shadow-[0px_1px_2px_rgba(10,13,20,0.03)] text-sm text-[#5C5C5C] hover:border-[#171717] transition-colors outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {typeof category.name === 'string' ? category.name : (category.name.en || category.name.tr || '')}
            </option>
          ))}
        </select>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg border transition-colors ${
            hasActiveFilters
              ? 'bg-white border-[#171717] shadow-[0px_0px_0px_2px_#FFFFFF,0px_0px_0px_4px_rgba(153,160,174,0.16)] text-[#171717]'
              : 'bg-white border-[#EBEBEB] shadow-[0px_1px_2px_rgba(10,13,20,0.03)] text-[#5C5C5C] hover:border-[#171717]'
          }`}
        >
          <span className="text-sm font-medium leading-5 tracking-[-0.006em]">
            Filter
          </span>
          <ArrowUp size={20} className={hasActiveFilters ? 'text-[#171717]' : 'text-[#5C5C5C]'} />
        </button>
      </div>

      {/* Variant Expand/Collapse Controls */}
      {Object.keys(groupedProducts.variantsByBase).length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // Expand all base products with variants
              const allBaseIds = new Set<number>();
              Object.keys(groupedProducts.variantsByBase).forEach(id => {
                allBaseIds.add(parseInt(id));
              });
              setExpandedBaseProducts(allBaseIds);
            }}
            className="btn btn-sm btn-secondary flex items-center gap-1"
            title="Expand all variants"
          >
            <ChevronDown size={14} />
            Expand All
          </button>
          <button
            onClick={() => setExpandedBaseProducts(new Set())}
            className="btn btn-sm btn-secondary flex items-center gap-1"
            title="Collapse all variants"
          >
            <ChevronRight size={14} />
            Collapse All
          </button>
        </div>
      )}

        {/* Bulk Selection Toolbar (FR-3.5) */}
        {selectedCount > 0 && (
          <div className="card p-4 bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-[#171717]">
                  {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={clearSelection}
                  className="text-sm text-[#5C5C5C] hover:text-[#171717] flex items-center gap-1"
                >
                  <X size={14} />
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllMatchingFilters}
                  className="btn btn-sm btn-secondary"
                >
                  Select all ({filteredProducts.length})
                </button>
                
                {/* Bulk Action Buttons */}
                {canDelete && (
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="btn btn-sm btn-danger flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Bulk Delete
                  </button>
                )}
                
                {canEdit && (
                  <>
                    <button
                      onClick={() => {
                        setBulkStatusTarget('complete');
                        setShowBulkStatusModal(true);
                      }}
                      className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                      <Tag size={14} />
                      Mark as Complete
                    </button>
                    
                    <button
                      onClick={() => {
                        setBulkStatusTarget('draft');
                        setShowBulkStatusModal(true);
                      }}
                      className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                      <Tag size={14} />
                      Mark as Draft
                    </button>
                    
                    <button
                      onClick={() => setShowBulkPriceModal(true)}
                      className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                      <DollarSign size={14} />
                      Update Price
                    </button>
                    
                    <button
                      onClick={() => setShowBulkStockModal(true)}
                      className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                      <Package2 size={14} />
                      Update Stock
                    </button>

                    {/* Channel publish actions */}
                    {channels.length > 0 && (
                      <>
                        <button
                          onClick={() => {
                            setBulkPublishType('stock');
                            setShowBulkPublishModal(true);
                          }}
                          className="btn btn-sm btn-secondary flex items-center gap-2"
                        >
                          <Upload size={14} />
                          Publish Stock
                        </button>
                        <button
                          onClick={() => {
                            setBulkPublishType('price');
                            setShowBulkPublishModal(true);
                          }}
                          className="btn btn-sm btn-secondary flex items-center gap-2"
                        >
                          <Upload size={14} />
                          Publish Price
                        </button>
                        <button
                          onClick={() => {
                            setBulkPublishType('product');
                            setShowBulkPublishModal(true);
                          }}
                          className="btn btn-sm btn-secondary flex items-center gap-2"
                        >
                          <Upload size={14} />
                          Publish Product
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters Drawer */}
        {showFilters && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 z-40 transition-opacity"
              onClick={() => setShowFilters(false)}
            />
            
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#EBEBEB]">
                <h2 className="text-xl font-semibold text-[#171717]">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-white rounded-lg transition-colors"
                  title="Close filters"
                >
                  <X size={20} className="text-[#5C5C5C]" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status Filter */}
            <div>
              <label className="label">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductStatus | 'all')}
                className="input"
              >
                <option value="all">All</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="label">Brand</label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="input"
              >
                <option value="all">All</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="label">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                className="input"
              >
                <option value="all">All</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getText(category.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Attribute Filters */}
            {attributes.length > 0 && (
              <div className="space-y-4">
                <label className="label">Attributes</label>
                {attributes.map((attr) => {
                  const uniqueValues = new Set<string>();
                  products.forEach(p => {
                    const val = p.attributes?.[attr.id]?.value;
                    if (val !== undefined && val !== null && val !== '') {
                      uniqueValues.add(String(val));
                    }
                  });
                  if (uniqueValues.size === 0) return null;

                  return (
                    <div key={attr.id}>
                      <label className="text-xs font-medium text-[#5C5C5C] mb-1 block">{getText(attr.name)}</label>
                      <select
                        value={productAttributeFilters[attr.id] || ''}
                        onChange={(e) => {
                          setProductAttributeFilters(prev => ({
                            ...prev,
                            [attr.id]: e.target.value,
                          }));
                        }}
                        className="input"
                      >
                        <option value="">All</option>
                        {Array.from(uniqueValues).sort().map((value) => {
                          const option = attr.validation?.options?.find(opt => opt.value === value);
                          return (
                            <option key={value} value={value}>
                              {option ? getText(option.label) : value}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stock Range Filter */}
            <div>
              <label className="label">Stock Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={stockMinFilter}
                  onChange={(e) => setStockMinFilter(e.target.value)}
                  placeholder="Min"
                  className="input flex-1"
                  min="0"
                  step="1"
                />
                <input
                  type="number"
                  value={stockMaxFilter}
                  onChange={(e) => setStockMaxFilter(e.target.value)}
                  placeholder="Max"
                  className="input flex-1"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            {/* Price Range Filter (FR-5.2) */}
            <div>
              <label className="label">Price Range</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={priceMinFilter}
                  onChange={(e) => setPriceMinFilter(e.target.value)}
                  placeholder="Min"
                  className="input flex-1"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  value={priceMaxFilter}
                  onChange={(e) => setPriceMaxFilter(e.target.value)}
                  placeholder="Max"
                  className="input flex-1"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {/* Created Date Range Filter (FR-5.2) */}
            <div>
              <label className="label">Created Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={createdDateFromFilter}
                  onChange={(e) => setCreatedDateFromFilter(e.target.value)}
                  placeholder="From"
                  className="input flex-1"
                />
                <input
                  type="date"
                  value={createdDateToFilter}
                  onChange={(e) => setCreatedDateToFilter(e.target.value)}
                  placeholder="To"
                  className="input flex-1"
                />
              </div>
            </div>

            {/* Updated Date Range Filter (FR-5.2) */}
            <div>
              <label className="label">Updated Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={updatedDateFromFilter}
                  onChange={(e) => setUpdatedDateFromFilter(e.target.value)}
                  placeholder="From"
                  className="input flex-1"
                />
                <input
                  type="date"
                  value={updatedDateToFilter}
                  onChange={(e) => setUpdatedDateToFilter(e.target.value)}
                  placeholder="To"
                  className="input flex-1"
                />
              </div>
            </div>

            {/* Base Product Filter (FR-10.6) */}
            <div>
              <label className="label">Product Type</label>
              <select
                value={baseProductFilter}
                onChange={(e) => setBaseProductFilter(e.target.value === 'all' ? 'all' : (e.target.value === 'base' ? 0 : parseInt(e.target.value)))}
                className="input"
              >
                <option value="all">All</option>
                <option value="base">Base Products Only</option>
                {products.filter(p => p.isBaseProduct).map((base) => (
                  <option key={base.id} value={base.id}>
                    Variants of: {getText(base.name)}
                  </option>
                ))}
              </select>
            </div>

            {/* Variant Attribute Filters (FR-10.6) */}
            {(() => {
              // Get all variant attributes from products
              const variantAttrs = attributes.filter(attr => attr.isVariantAttribute);
              if (variantAttrs.length === 0) return null;
              
              return variantAttrs.map((attr) => {
                // Get unique values for this attribute from all variants
                const uniqueValues = new Set<string>();
                products.filter(p => p.parentProductId && p.variantAttributes?.[attr.id.toString()]).forEach(p => {
                  const value = String(p.variantAttributes![attr.id.toString()]);
                  if (value) uniqueValues.add(value);
                });
                
                if (uniqueValues.size === 0) return null;
                
                return (
                  <div key={attr.id}>
                    <label className="label">{getText(attr.name)}</label>
                    <select
                      value={variantAttributeFilters[attr.id] || 'all'}
                      onChange={(e) => {
                        setVariantAttributeFilters({
                          ...variantAttributeFilters,
                          [attr.id]: e.target.value === 'all' ? '' : e.target.value,
                        });
                      }}
                      className="input"
                    >
                      <option value="all">All</option>
                      {Array.from(uniqueValues).map((value) => {
                        // Find the option label
                        const option = attr.validation.options?.find(opt => opt.value === value);
                        return (
                          <option key={value} value={value}>
                            {option ? getText(option.label) : value}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              });
            })()}

              </div>

              {/* Drawer Footer */}
              <div className="border-t border-[#EBEBEB] p-6 flex gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="btn btn-secondary flex items-center gap-2 flex-1"
                  >
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(false)}
                  className="btn btn-primary flex-1"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pending Tab Info Banner */}
      {activeTab === 'pending' && groupedProducts.baseProducts.length > 0 && isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Clock size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">Products Awaiting Review</h4>
              <p className="text-sm text-blue-800">
                These products have been submitted by users and are ready for your review. 
                Click "View" to review details, then "Approve" to mark as Complete or "Return to Draft" if changes are needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {groupedProducts.baseProducts.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={48} className="mx-auto text-[#A4A4A4] mb-4" />
          <h3 className="text-lg font-medium text-[#171717] mb-2">
            {searchQuery || hasActiveFilters 
              ? 'No products found' 
              : activeTab === 'pending'
              ? 'No products pending review'
              : 'No products'}
          </h3>
          <p className="text-[#5C5C5C] mb-6">
            {searchQuery || hasActiveFilters
              ? 'Try adjusting your search or filters'
              : activeTab === 'pending'
              ? isAdmin 
                ? 'When users submit products for review, they will appear here for your approval.'
                : 'Products you submit for review will appear here.'
              : 'Get started by creating your first product'}
          </p>
          {canCreate && !searchQuery && !hasActiveFilters && activeTab !== 'pending' && (
            <Link to="/products/new" className="btn btn-primary inline-flex items-center gap-2">
              <Plus size={18} />
              Create Product
            </Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-12">
                    <button
                      onClick={toggleSelectAllOnPage}
                      className="p-1 hover:bg-white rounded"
                      title={isAllSelectedOnPage ? 'Deselect all on page' : 'Select all on page'}
                    >
                      {isAllSelectedOnPage ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} className="text-[#A4A4A4]" />
                      )}
                    </button>
                  </th>
                  <th>Image</th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('name')}
                      className={getHeaderButtonClass('name')}
                    >
                      Product Name
                      {getSortIndicator('name')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('sku')}
                      className={getHeaderButtonClass('sku')}
                    >
                      SKU
                      {getSortIndicator('sku')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('brand')}
                      className={getHeaderButtonClass('brand')}
                    >
                      Brand
                      {getSortIndicator('brand')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('category')}
                      className={getHeaderButtonClass('category')}
                    >
                      Category
                      {getSortIndicator('category')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('status')}
                      className={getHeaderButtonClass('status')}
                    >
                      Status
                      {getSortIndicator('status')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('stock')}
                      className={getHeaderButtonClass('stock')}
                    >
                      Stock
                      {getSortIndicator('stock')}
                    </button>
                  </th>
                  <th>
                    <button
                      onClick={() => handleColumnSort('price')}
                      className={getHeaderButtonClass('price')}
                    >
                      Price
                      {getSortIndicator('price')}
                    </button>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((item, index) => {
                  const { product, isVariant, baseProductId } = item;
                  const category = categories.find((c) => c.id === product.categoryId);
                  const isSelected = selectedProductIds.has(product.id);
                  const hasVariants = !isVariant && groupedProducts.variantsByBase[product.id]?.length > 0;
                  const isExpanded = expandedBaseProducts.has(product.id);
                  const variantCount = hasVariants ? groupedProducts.variantsByBase[product.id].length : 0;

                  return (
                    <tr 
                      key={product.id}
                      className={`${isSelected ? 'bg-primary/5' : ''} ${isVariant ? 'bg-[#F7F7F7]/50' : ''}`}
                    >
                      <td>
                        <div className="flex items-center gap-1">
                          {hasVariants && (
                            <button
                              onClick={() => toggleExpandBaseProduct(product.id)}
                              className="p-0.5 hover:bg-white rounded"
                              title={isExpanded ? 'Collapse variants' : 'Expand variants'}
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} className="text-[#5C5C5C]" />
                              ) : (
                                <ChevronRight size={16} className="text-[#5C5C5C]" />
                              )}
                            </button>
                          )}
                          {!hasVariants && isVariant && (
                            <div className="w-5 flex-shrink-0" /> // Spacer for alignment with expand button
                          )}
                          <button
                            onClick={(e) => toggleProductSelection(product.id, index, e)}
                            className="p-1 hover:bg-white rounded"
                            title="Select product"
                          >
                            {isSelected ? (
                              <CheckSquare size={18} className="text-primary" />
                            ) : (
                              <Square size={18} className="text-[#A4A4A4]" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={getText(product.name)}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-[#F7F7F7] rounded flex items-center justify-center">
                            <Package size={20} className="text-[#A4A4A4]" />
                          </div>
                        )}
                      </td>
                      <td className="font-medium">
                        <div className="flex items-center gap-2">
                          {isVariant && (
                            <span className="text-xs text-[#A4A4A4] mr-1">└─</span>
                          )}
                          <span className={isVariant ? 'text-[#5C5C5C]' : ''}>
                            {getText(product.name)}
                          </span>
                          {hasVariants && (
                            <span className="text-xs text-[#5C5C5C] ml-1">
                              ({variantCount} variant{variantCount !== 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`text-[#5C5C5C] ${isVariant ? 'text-sm' : ''}`}>{product.sku}</td>
                      <td className={`text-[#5C5C5C] ${isVariant ? 'text-sm' : ''}`}>{product.brand}</td>
                      <td className={`text-[#5C5C5C] ${isVariant ? 'text-sm' : ''}`}>
                        {category ? (
                          <div className="flex items-center gap-2">
                            {getText(category.name)}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <div className="space-y-1">
                          <span
                            className={`badge ${
                              product.status === 'complete' 
                                ? 'badge-success' 
                                : product.status === 'pending'
                                ? 'bg-blue-100 text-blue-700'
                                : 'badge-warning'
                            } ${isVariant ? 'text-xs' : ''}`}
                          >
                            {product.status === 'complete' 
                              ? 'Complete' 
                              : product.status === 'pending' 
                              ? 'Pending' 
                              : 'Draft'}
                          </span>
                          {/* Show completeness for draft and pending products */}
                          {(product.status === 'draft' || product.status === 'pending') && (() => {
                            const completeness = calculateProductCompleteness(product, category, attributes, getText);
                            const colors = getCompletenessColor(completeness.percentage);
                            return (
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 bg-gray-200 rounded-full overflow-hidden h-1.5 min-w-[60px]">
                                  <div
                                    className={`${colors.bar} h-1.5`}
                                    style={{ width: `${completeness.percentage}%` }}
                                  />
                                </div>
                                <span className={`text-xs font-medium ${colors.text} whitespace-nowrap`}>
                                  {completeness.percentage}%
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>
                      <td>
                        {editingStock === product.id ? (
                          <input
                            type="number"
                            min="0"
                            value={editingStockValue}
                            onChange={(e) => setEditingStockValue(e.target.value)}
                            onBlur={() => {
                              const newStock = parseInt(editingStockValue);
                              if (!isNaN(newStock) && newStock >= 0) {
                                updateProduct(product.id, {
                                  stock: newStock,
                                  updatedBy: currentUser?.id || 1,
                                });
                              }
                              setEditingStock(null);
                              setEditingStockValue('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newStock = parseInt(editingStockValue);
                                if (!isNaN(newStock) && newStock >= 0) {
                                  updateProduct(product.id, {
                                    stock: newStock,
                                    updatedBy: currentUser?.id || 1,
                                  });
                                }
                                setEditingStock(null);
                                setEditingStockValue('');
                              } else if (e.key === 'Escape') {
                                setEditingStock(null);
                                setEditingStockValue('');
                              }
                            }}
                            className="w-20 px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (canEdit) {
                                setEditingStock(product.id);
                                setEditingStockValue(product.stock.toString());
                              }
                            }}
                            className={`font-medium cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors ${product.stock === 0
                                ? 'text-red-600'
                                : product.stock < 10
                                  ? 'text-orange-600'
                                  : 'text-[#5C5C5C]'
                              } ${isVariant ? 'text-sm' : ''} ${canEdit ? 'hover:bg-white' : ''}`}
                            title={canEdit ? 'Click to edit stock' : ''}
                          >
                            {product.stock}
                          </span>
                        )}
                      </td>
                      <td className={`text-[#171717] font-medium ${isVariant ? 'text-sm' : ''}`}>
                        {editingPrice === product.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm">{defaultCurrency?.symbol || '₺'}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editingPriceValue}
                              onChange={(e) => setEditingPriceValue(e.target.value)}
                              onBlur={() => {
                                const newPrice = parseFloat(editingPriceValue);
                                if (!isNaN(newPrice) && newPrice >= 0) {
                                  const updatedPrices = { ...(product.prices || {}), [defaultCurrency?.code || 'TRY']: newPrice };
                                  updateProduct(product.id, {
                                    price: newPrice,
                                    prices: updatedPrices,
                                    updatedBy: currentUser?.id || 1,
                                  });
                                }
                                setEditingPrice(null);
                                setEditingPriceValue('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const newPrice = parseFloat(editingPriceValue);
                                  if (!isNaN(newPrice) && newPrice >= 0) {
                                    const updatedPrices = { ...(product.prices || {}), [defaultCurrency?.code || 'TRY']: newPrice };
                                    updateProduct(product.id, {
                                      price: newPrice,
                                      prices: updatedPrices,
                                      updatedBy: currentUser?.id || 1,
                                    });
                                  }
                                  setEditingPrice(null);
                                  setEditingPriceValue('');
                                } else if (e.key === 'Escape') {
                                  setEditingPrice(null);
                                  setEditingPriceValue('');
                                }
                              }}
                              className="w-24 px-2 py-1 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <span
                            onClick={() => {
                              if (canEdit) {
                                setEditingPrice(product.id);
                                setEditingPriceValue(product.price.toString());
                              }
                            }}
                            className={`cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors ${canEdit ? 'hover:bg-white' : ''}`}
                            title={canEdit ? 'Click to edit base price' : ''}
                          >
                            {defaultCurrency?.symbol || '₺'}{product.price.toLocaleString()}
                            {product.prices && Object.keys(product.prices).length > 1 && (
                              <span className="text-xs text-[#A4A4A4] ml-1">+{Object.keys(product.prices).length - 1}</span>
                            )}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/products/${product.id}`}
                            className="p-1 text-[#5C5C5C] hover:text-primary rounded"
                            title="View"
                          >
                            <Eye size={18} />
                          </Link>
                          {canEdit && (
                            <Link
                              to={`/products/${product.id}/edit`}
                              className="p-1 text-[#5C5C5C] hover:text-primary rounded"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </Link>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(product)}
                              className="p-1 text-[#5C5C5C] hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={displayProducts.length}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(value) => setItemsPerPage(value as number)}
            itemsPerPageOptions={[10, 20, 50, 100]}
          />
        </div>
      )}

      {/* Bulk Delete Modal (FR-3.6) */}
      {showBulkDeleteModal && (() => {
        const productsWithOrders = getProductsWithOrders();
        const canDeleteCount = selectedCount - productsWithOrders.length;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Bulk Delete Products</h3>
              
              {/* Show products that cannot be deleted (FR-3.6) */}
              {productsWithOrders.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-900 mb-2">
                    {productsWithOrders.length} product(s) cannot be deleted (have associated orders):
                  </p>
                  <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                    {productsWithOrders.map(p => (
                      <li key={p.id} className="flex items-start gap-2">
                        <span className="font-medium">• {p.name}</span>
                        <span className="text-[#5C5C5C]">({p.sku})</span>
                        <span className="text-xs text-[#5C5C5C]">- {p.orderCount} order(s): {p.orderNumbers}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Confirmation message (FR-3.6) */}
              <p className="text-[#5C5C5C] mb-6">
                {canDeleteCount > 0 ? (
                  <>
                    Are you sure you want to delete <strong>{canDeleteCount}</strong> product(s)?
                    {productsWithOrders.length > 0 && (
                      <span className="block mt-2 text-sm text-orange-600">
                        Note: {productsWithOrders.length} product(s) will not be deleted due to associated orders.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-red-600">
                    None of the selected products can be deleted. All have associated orders.
                  </span>
                )}
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="btn btn-danger"
                  disabled={canDeleteCount === 0}
                >
                  Delete {canDeleteCount > 0 ? `${canDeleteCount} product(s)` : ''}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Status Change Modal (FR-3.7) */}
      {showBulkStatusModal && (() => {
        const invalidProducts = bulkStatusTarget === 'complete' ? getProductsInvalidForStatus('complete') : [];
        const canUpdateCount = selectedCount - invalidProducts.length;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Bulk Status Change</h3>
              
              {/* Show products that don't meet criteria (FR-3.7) */}
              {invalidProducts.length > 0 && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm font-medium text-orange-900 mb-2">
                    {invalidProducts.length} product(s) cannot be updated to "{bulkStatusTarget}" (missing required fields):
                  </p>
                  <ul className="text-sm text-orange-800 space-y-2 max-h-48 overflow-y-auto">
                    {invalidProducts.map(p => (
                      <li key={p.id} className="flex flex-col gap-1">
                        <div className="flex items-start gap-2">
                          <span className="font-medium">• {p.name}</span>
                          <span className="text-[#5C5C5C]">({p.sku})</span>
                        </div>
                        <div className="text-xs text-[#5C5C5C] ml-4">
                          Missing: {p.missingFields.join(', ')}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Confirmation message (FR-3.7) */}
              <p className="text-[#5C5C5C] mb-6">
                {canUpdateCount > 0 ? (
                  <>
                    Are you sure you want to change status to <strong>"{bulkStatusTarget}"</strong> for <strong>{canUpdateCount}</strong> product(s)?
                    {invalidProducts.length > 0 && (
                      <span className="block mt-2 text-sm text-orange-600">
                        Note: {invalidProducts.length} product(s) will not be updated due to missing required fields.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-red-600">
                    None of the selected products can be updated to "{bulkStatusTarget}". All are missing required fields.
                  </span>
                )}
              </p>
              
              {bulkStatusTarget === 'complete' && canUpdateCount > 0 && (
                <p className="text-sm text-[#5C5C5C] mb-6">
                  Required fields for "complete" status: Name (TR/EN), SKU, Category, Brand, Description (TR/EN), and all category-required attributes.
                </p>
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowBulkStatusModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStatusChange}
                  className="btn btn-primary"
                  disabled={canUpdateCount === 0}
                >
                  Update {canUpdateCount > 0 ? `${canUpdateCount} product(s)` : ''} to {bulkStatusTarget}
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Bulk Price Update Modal (FR-3.10) */}
      {showBulkPriceModal && (() => {
        const productIds = Array.from(selectedProductIds);
        const selectedProducts = productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
        
        // Calculate price preview (FR-3.10)
        const calculateNewPrice = (currentPrice: number): number => {
          if (!bulkPriceValue || bulkPriceValue.trim() === '') return currentPrice;
          
          const value = parseFloat(bulkPriceValue);
          if (isNaN(value) || value < 0) return currentPrice;

          let newPrice = currentPrice;
          switch (bulkPriceMethod) {
            case 'set':
              newPrice = value;
              break;
            case 'increase_amount':
              newPrice = currentPrice + value;
              break;
            case 'increase_percent':
              newPrice = currentPrice * (1 + value / 100);
              break;
            case 'decrease_amount':
              newPrice = Math.max(0, currentPrice - value);
              break;
            case 'decrease_percent':
              newPrice = currentPrice * (1 - value / 100);
              break;
          }
          return Math.max(0, newPrice);
        };

        const pricePreviews = selectedProducts.slice(0, 10).map(product => ({
          id: product!.id,
          name: getText(product!.name),
          sku: product!.sku,
          currentPrice: product!.price,
          newPrice: calculateNewPrice(product!.price),
        }));

        const totalCurrentPrice = selectedProducts.reduce((sum, p) => sum + (p?.price || 0), 0);
        const totalNewPrice = selectedProducts.reduce((sum, p) => sum + calculateNewPrice(p?.price || 0), 0);
        const priceChange = totalNewPrice - totalCurrentPrice;
        const priceChangePercent = totalCurrentPrice > 0 ? ((priceChange / totalCurrentPrice) * 100) : 0;

        const isValidValue = bulkPriceValue && !isNaN(parseFloat(bulkPriceValue)) && parseFloat(bulkPriceValue) >= 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Bulk Price Update</h3>
              
              <p className="text-[#5C5C5C] mb-4">
                Update prices for <strong>{selectedCount}</strong> product(s)
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="label">Update Method</label>
                  <select
                    value={bulkPriceMethod}
                    onChange={(e) => setBulkPriceMethod(e.target.value as typeof bulkPriceMethod)}
                    className="input w-full"
                  >
                    <option value="set">Set Fixed Price</option>
                    <option value="increase_amount">Increase by Amount</option>
                    <option value="increase_percent">Increase by Percentage</option>
                    <option value="decrease_amount">Decrease by Amount</option>
                    <option value="decrease_percent">Decrease by Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="label">
                    {bulkPriceMethod.includes('percent') ? 'Percentage' : `Amount (${defaultCurrency?.symbol || '₺'})`}
                  </label>
                  <input
                    type="number"
                    value={bulkPriceValue}
                    onChange={(e) => setBulkPriceValue(e.target.value)}
                    placeholder={bulkPriceMethod.includes('percent') ? 'e.g., 10 for 10%' : 'e.g., 100'}
                    className="input w-full"
                    min="0"
                    step={bulkPriceMethod.includes('percent') ? '0.1' : '0.01'}
                  />
                  {bulkPriceValue && !isValidValue && (
                    <p className="text-sm text-red-600 mt-1">Please enter a valid positive number</p>
                  )}
                </div>
              </div>

              {/* Price Preview (FR-3.10) */}
              {isValidValue && bulkPriceValue && (
                <div className="mb-6 space-y-4">
                  {/* Summary Statistics */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[#5C5C5C]">Total Current Price</p>
                        <p className="text-lg font-semibold text-[#171717]">{defaultCurrency?.symbol || '₺'}{totalCurrentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[#5C5C5C]">Total New Price</p>
                        <p className="text-lg font-semibold text-blue-900">{defaultCurrency?.symbol || '₺'}{totalNewPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div>
                        <p className="text-[#5C5C5C]">Change</p>
                        <p className={`text-lg font-semibold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {priceChange >= 0 ? '+' : ''}{defaultCurrency?.symbol || '₺'}{priceChange.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          {bulkPriceMethod.includes('percent') && ` (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(1)}%)`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Price Preview Table */}
                  <div>
                    <p className="text-sm font-medium text-[#171717] mb-2">
                      Price Preview {selectedProducts.length > 10 && `(showing first 10 of ${selectedProducts.length})`}
                    </p>
                    <div className="border border-[#EBEBEB] rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F7F7F7]">
                            <tr>
                              <th className="px-4 py-2 text-left text-[#5C5C5C] font-medium">Product</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">Current Price</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">New Price</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">Change</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {pricePreviews.map(preview => {
                              const change = preview.newPrice - preview.currentPrice;
                              return (
                                <tr key={preview.id}>
                                  <td className="px-4 py-2">
                                    <div>
                                      <p className="font-medium text-[#171717]">{preview.name}</p>
                                      <p className="text-xs text-[#5C5C5C]">{preview.sku}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right text-[#5C5C5C]">
                                    {defaultCurrency?.symbol || '₺'}{preview.currentPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-4 py-2 text-right font-medium text-blue-900">
                                    {defaultCurrency?.symbol || '₺'}{preview.newPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className={`px-4 py-2 text-right font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change >= 0 ? '+' : ''}{defaultCurrency?.symbol || '₺'}{change.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBulkPriceModal(false);
                    setBulkPriceValue('');
                    setBulkPriceMethod('set');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPriceUpdate}
                  className="btn btn-primary"
                  disabled={!isValidValue}
                >
                  Update Prices for {selectedCount} product(s)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Stock Update Modal (FR-3.11) */}
      {showBulkStockModal && (() => {
        const productIds = Array.from(selectedProductIds);
        const selectedProducts = productIds.map(id => products.find(p => p.id === id)).filter(Boolean);
        
        // Calculate stock preview (FR-3.11)
        const calculateNewStock = (currentStock: number): number => {
          if (!bulkStockValue || bulkStockValue.trim() === '') return currentStock;
          
          const value = parseInt(bulkStockValue);
          if (isNaN(value) || value < 0) return currentStock;

          let newStock = currentStock;
          switch (bulkStockMethod) {
            case 'set':
              newStock = value;
              break;
            case 'increase':
              newStock = currentStock + value;
              break;
            case 'decrease':
              newStock = currentStock - value;
              break;
          }
          return Math.max(0, newStock);
        };

        const stockPreviews = selectedProducts.slice(0, 10).map(product => ({
          id: product!.id,
          name: getText(product!.name),
          sku: product!.sku,
          currentStock: product!.stock,
          newStock: calculateNewStock(product!.stock),
          wouldGoNegative: bulkStockMethod === 'decrease' && product!.stock - parseInt(bulkStockValue || '0') < 0,
        }));

        const totalCurrentStock = selectedProducts.reduce((sum, p) => sum + (p?.stock || 0), 0);
        const totalNewStock = selectedProducts.reduce((sum, p) => sum + calculateNewStock(p?.stock || 0), 0);
        const stockChange = totalNewStock - totalCurrentStock;
        const productsGoingNegative = stockPreviews.filter(p => p.wouldGoNegative);

        const isValidValue = bulkStockValue && !isNaN(parseInt(bulkStockValue)) && parseInt(bulkStockValue) >= 0;

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Bulk Stock Update</h3>
              
              <p className="text-[#5C5C5C] mb-4">
                Update stock for <strong>{selectedCount}</strong> product(s)
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="label">Update Method</label>
                  <select
                    value={bulkStockMethod}
                    onChange={(e) => setBulkStockMethod(e.target.value as typeof bulkStockMethod)}
                    className="input w-full"
                  >
                    <option value="set">Set Fixed Stock</option>
                    <option value="increase">Increase by Amount</option>
                    <option value="decrease">Decrease by Amount</option>
                  </select>
                </div>
                <div>
                  <label className="label">Quantity</label>
                  <input
                    type="number"
                    value={bulkStockValue}
                    onChange={(e) => setBulkStockValue(e.target.value)}
                    placeholder="e.g., 100"
                    className="input w-full"
                    min="0"
                    step="1"
                  />
                  {bulkStockValue && !isValidValue && (
                    <p className="text-sm text-red-600 mt-1">Please enter a valid non-negative integer</p>
                  )}
                </div>
              </div>

              {/* Stock Preview (FR-3.11) */}
              {isValidValue && bulkStockValue && (
                <div className="mb-6 space-y-4">
                  {/* Warning for products going negative */}
                  {productsGoingNegative.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm font-medium text-red-900 mb-2">
                        ⚠️ Warning: {productsGoingNegative.length} product(s) would go negative:
                      </p>
                      <ul className="text-sm text-red-800 space-y-1">
                        {productsGoingNegative.map(p => (
                          <li key={p.id}>
                            • {p.name} ({p.sku}): {p.currentStock} → {p.newStock} (will be set to 0)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary Statistics */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-[#5C5C5C]">Total Current Stock</p>
                        <p className="text-lg font-semibold text-[#171717]">{totalCurrentStock.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[#5C5C5C]">Total New Stock</p>
                        <p className="text-lg font-semibold text-blue-900">{totalNewStock.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[#5C5C5C]">Change</p>
                        <p className={`text-lg font-semibold ${stockChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {stockChange >= 0 ? '+' : ''}{stockChange.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Preview Table */}
                  <div>
                    <p className="text-sm font-medium text-[#171717] mb-2">
                      Stock Preview {selectedProducts.length > 10 && `(showing first 10 of ${selectedProducts.length})`}
                    </p>
                    <div className="border border-[#EBEBEB] rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-[#F7F7F7]">
                            <tr>
                              <th className="px-4 py-2 text-left text-[#5C5C5C] font-medium">Product</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">Current Stock</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">New Stock</th>
                              <th className="px-4 py-2 text-right text-[#5C5C5C] font-medium">Change</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {stockPreviews.map(preview => {
                              const change = preview.newStock - preview.currentStock;
                              return (
                                <tr key={preview.id} className={preview.wouldGoNegative ? 'bg-red-50' : ''}>
                                  <td className="px-4 py-2">
                                    <div>
                                      <p className="font-medium text-[#171717]">{preview.name}</p>
                                      <p className="text-xs text-[#5C5C5C]">{preview.sku}</p>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-right text-[#5C5C5C]">
                                    {preview.currentStock.toLocaleString()}
                                  </td>
                                  <td className={`px-4 py-2 text-right font-medium ${preview.wouldGoNegative ? 'text-red-600' : 'text-blue-900'}`}>
                                    {preview.newStock.toLocaleString()}
                                    {preview.wouldGoNegative && (
                                      <span className="text-xs text-red-500 ml-1">(was {preview.currentStock - parseInt(bulkStockValue || '0')})</span>
                                    )}
                                  </td>
                                  <td className={`px-4 py-2 text-right font-medium ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {change >= 0 ? '+' : ''}{change.toLocaleString()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowBulkStockModal(false);
                    setBulkStockValue('');
                    setBulkStockMethod('set');
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkStockUpdate}
                  className="btn btn-primary"
                  disabled={!isValidValue}
                >
                  Update Stock for {selectedCount} product(s)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Publish to Channel Modal */}
      {showBulkPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {bulkPublishType === 'stock' && 'Publish Stock to Channels'}
              {bulkPublishType === 'price' && 'Publish Price to Channels'}
              {bulkPublishType === 'product' && 'Publish Products to Channels'}
            </h3>

            <p className="text-[#5C5C5C] mb-4">
              You have selected <strong>{selectedCount}</strong> product
              {selectedCount !== 1 ? 's' : ''}. Choose one or more channels to publish to.
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Select Channels</label>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllChannels}
                    className="text-xs text-primary hover:text-primary-hover font-medium"
                  >
                    Select All
                  </button>
                  <span className="text-[#A4A4A4]">|</span>
                  <button
                    onClick={deselectAllChannels}
                    className="text-xs text-[#5C5C5C] hover:text-[#171717] font-medium"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="border border-[#EBEBEB] rounded-lg max-h-64 overflow-y-auto">
                {channels.length === 0 ? (
                  <div className="p-4 text-center text-[#5C5C5C]">
                    No channels available
                  </div>
                ) : (
                  <div className="divide-y divide-[#EBEBEB]">
                    {channels.map((channel) => (
                      <label
                        key={channel.id}
                        className="flex items-center gap-3 p-3 hover:bg-[#F7F7F7] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={bulkPublishChannelIds.has(channel.id)}
                          onChange={() => toggleChannelSelection(channel.id)}
                          className="rounded border-[#EBEBEB] text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-[#171717]">{channel.name}</span>
                            <span className={`badge text-xs ${channel.isActive ? 'badge-success' : 'badge-danger'}`}>
                              {channel.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          {channel.description && (
                            <p className="text-xs text-[#5C5C5C] mt-1">{channel.description}</p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {bulkPublishChannelIds.size > 0 && (
                <div className="p-3 bg-primary/5 border border-primary rounded text-sm text-[#171717]">
                  <strong>{bulkPublishChannelIds.size}</strong> channel{bulkPublishChannelIds.size !== 1 ? 's' : ''} selected
                </div>
              )}

              <div className="p-3 bg-[#F7F7F7] rounded text-sm text-[#5C5C5C]">
                This will create export entries for the selected products and channels. 
                Actual API/file export can be wired to your real integration later.
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBulkPublishModal(false);
                  setBulkPublishChannelIds(new Set());
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkPublish}
                className="btn btn-primary flex items-center gap-2"
                disabled={bulkPublishChannelIds.size === 0}
              >
                <Upload size={16} />
                {bulkPublishType === 'stock' && `Publish Stock (${selectedCount})`}
                {bulkPublishType === 'price' && `Publish Price (${selectedCount})`}
                {bulkPublishType === 'product' && `Publish Products (${selectedCount})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Export Modal - commented out as it references undefined variables */}
      {/* {false && (() => {
        Modal content removed
      })()} */}

      {/* Bulk Duplicate Products Modal - commented out as it references undefined variables */}
      {/* {false && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          Modal content removed
        </div>
      )} */}
    </div>
  );
};

export default ProductsPage;


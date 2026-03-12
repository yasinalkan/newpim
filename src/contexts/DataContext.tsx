import React, { createContext, useContext, useState, useEffect } from 'react';
import type {
  Product,
  Category,
  Attribute,
  Brand,
  Channel,
  ChannelCategory,
  ChannelAttribute,
  CategoryMapping,
  AttributeMapping,
  AttributeValueMapping,
  ExportLog,
  Settings,
  ChannelValidationRule,
  Order,
} from '../types';
import {
  initialProducts,
  initialCategories,
  initialAttributes,
  initialBrands,
  initialChannels,
  initialSettings,
  initialChannelCategories,
  initialChannelAttributes,
  initialChannelValidationRules,
  initialOrders,
} from '../data/mockData';

interface DataContextType {
  // Products
  products: Product[];
  createProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  getProduct: (id: number) => Product | undefined;
  hasProductOrders: (productId: number) => boolean;
  getProductOrders: (productId: number) => Order[];
  // Bulk actions
  bulkDeleteProducts: (productIds: number[]) => { success: number; failed: Array<{ id: number; reason: string }> };
  bulkUpdateProductStatus: (productIds: number[], status: ProductStatus) => { success: number; failed: Array<{ id: number; reason: string }> };
  bulkUpdatePrice: (productIds: number[], method: 'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent', value: number) => void;
  bulkUpdateStock: (productIds: number[], method: 'set' | 'increase' | 'decrease', value: number) => void;

  // Categories
  categories: Category[];
  createCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCategory: (id: number, updates: Partial<Category>) => void;
  deleteCategory: (id: number) => void;
  getCategoryTree: () => Category[];

  // Attributes
  attributes: Attribute[];
  createAttribute: (attribute: Omit<Attribute, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAttribute: (id: number, updates: Partial<Attribute>) => void;
  deleteAttribute: (id: number) => void;


  // Brands
  brands: Brand[];

  // Channels
  channels: Channel[];
  channelCategories: Record<string, ChannelCategory[]>;
  channelAttributes: Record<string, ChannelAttribute[]>;
  createChannel: (channel: Omit<Channel, 'createdAt' | 'updatedAt'>) => void;
  updateChannel: (id: string, updates: Partial<Channel>) => void;
  deleteChannel: (id: string) => void;
  getChannel: (id: string) => Channel | undefined;
  
  // Channel Categories
  createChannelCategory: (channelId: string, category: Omit<ChannelCategory, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateChannelCategory: (channelId: string, categoryId: string, updates: Partial<ChannelCategory>) => void;
  deleteChannelCategory: (channelId: string, categoryId: string) => void;
  getChannelCategoryTree: (channelId: string) => ChannelCategory[];
  
  // Channel Attributes
  createChannelAttribute: (channelId: string, attribute: Omit<ChannelAttribute, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateChannelAttribute: (channelId: string, attributeId: string, updates: Partial<ChannelAttribute>) => void;
  deleteChannelAttribute: (channelId: string, attributeId: string) => void;
  getChannelAttributes: (channelId: string) => ChannelAttribute[];
  
  // Mappings
  categoryMappings: CategoryMapping[];
  attributeMappings: AttributeMapping[];
  attributeValueMappings: AttributeValueMapping[];
  createCategoryMapping: (mapping: Omit<CategoryMapping, 'id' | 'mappedAt' | 'updatedAt'>) => void;
  updateCategoryMapping: (id: number, updates: Partial<CategoryMapping>) => void;
  deleteCategoryMapping: (id: number) => void;
  createAttributeMapping: (mapping: Omit<AttributeMapping, 'id' | 'mappedAt' | 'updatedAt'>) => void;
  updateAttributeMapping: (id: number, updates: Partial<AttributeMapping>) => void;
  deleteAttributeMapping: (id: number) => void;
  createAttributeValueMapping: (mapping: Omit<AttributeValueMapping, 'id' | 'mappedAt' | 'updatedAt'>) => void;
  updateAttributeValueMapping: (id: number, updates: Partial<AttributeValueMapping>) => void;
  deleteAttributeValueMapping: (id: number) => void;
  
  // Export
  exportLogs: ExportLog[];
  createExportLog: (log: Omit<ExportLog, 'id' | 'exportedAt'>) => void;

  // Channel Validation Rules
  channelValidationRules: ChannelValidationRule[];
  createChannelValidationRule: (rule: Omit<ChannelValidationRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateChannelValidationRule: (id: number, updates: Partial<ChannelValidationRule>) => void;
  deleteChannelValidationRule: (id: number) => void;

  // Settings
  settings: Settings;
  updateSettings: (updates: Partial<Settings>, newLanguageCodeForChannels?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [attributes, setAttributes] = useState<Attribute[]>(initialAttributes);
  const [brands] = useState<Brand[]>(initialBrands);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [channelCategories, setChannelCategories] = useState<Record<string, ChannelCategory[]>>(initialChannelCategories);
  const [channelAttributes, setChannelAttributes] = useState<Record<string, ChannelAttribute[]>>(initialChannelAttributes);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [orders] = useState<Order[]>(initialOrders); // Orders are read-only for now
  const [channelValidationRules, setChannelValidationRules] = useState<ChannelValidationRule[]>(initialChannelValidationRules);

  // Load data from localStorage
  useEffect(() => {
    const savedProducts = localStorage.getItem('products');
    const savedCategories = localStorage.getItem('categories');
    const savedAttributes = localStorage.getItem('attributes');
    const savedSettings = localStorage.getItem('settings');
    const savedChannels = localStorage.getItem('channels');
    const savedChannelCategories = localStorage.getItem('channelCategories');
    const savedChannelAttributes = localStorage.getItem('channelAttributes');

    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    if (savedAttributes) setAttributes(JSON.parse(savedAttributes));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
    if (savedChannels) setChannels(JSON.parse(savedChannels));
    if (savedChannelCategories) setChannelCategories(JSON.parse(savedChannelCategories));
    if (savedChannelAttributes) setChannelAttributes(JSON.parse(savedChannelAttributes));
  }, []);

  // Update product counts when products change (FR-9.1)
  // This ensures counts are always accurate and automatically updated
  // Note: Individual product operations (create/update/delete) also update counts directly
  useEffect(() => {
    if (categories.length > 0 && products.length >= 0) {
      setCategories(prevCategories => {
        const updated = updateCategoryProductCounts(products, prevCategories);
        // Only update if counts actually changed to prevent unnecessary re-renders
        const hasChanges = updated.some((cat, idx) => 
          idx < prevCategories.length && cat.productCount !== prevCategories[idx].productCount
        );
        return hasChanges ? updated : prevCategories;
      });
    }
  }, [products]); // Only update when products change

  // Save to localStorage when data changes
  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('attributes', JSON.stringify(attributes));
  }, [attributes]);


  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('channelValidationRules', JSON.stringify(channelValidationRules));
  }, [channelValidationRules]);

  // Products
  const createProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: Math.max(...products.map(p => p.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updatedProducts = [...products, newProduct];
    setProducts(updatedProducts);
    
    // Update category product counts (FR-9.1)
    setCategories(prevCategories => updateCategoryProductCounts(updatedProducts, prevCategories));
    
    return newProduct;
  };

  const updateProduct = (id: number, updates: Partial<Product>) => {
    const product = products.find(p => p.id === id);
    const oldCategoryId = product?.categoryId;
    
    const updatedProducts = products.map(p => {
      if (p.id === id) {
        return { 
          ...p, 
          ...updates, 
          updatedAt: new Date().toISOString(),
          // Ensure updatedBy is set if provided
          updatedBy: updates.updatedBy ?? p.updatedBy
        };
      }
      return p;
    });

    // If updating a base product, cascade shared attribute changes to variants (FR-10.5)
    if (product?.isBaseProduct) {
      const variants = products.filter(p => p.parentProductId === id);
      const sharedAttributeUpdates: Partial<Product> = {};
      
      // Cascade shared attributes: name, description, brand, brandId, categoryId, keywords, attributes
      if (updates.name !== undefined) sharedAttributeUpdates.name = updates.name;
      if (updates.description !== undefined) sharedAttributeUpdates.description = updates.description;
      if (updates.brand !== undefined) sharedAttributeUpdates.brand = updates.brand;
      if (updates.brandId !== undefined) sharedAttributeUpdates.brandId = updates.brandId;
      if (updates.categoryId !== undefined) sharedAttributeUpdates.categoryId = updates.categoryId;
      if (updates.keywords !== undefined) sharedAttributeUpdates.keywords = updates.keywords;
      if (updates.attributes !== undefined) sharedAttributeUpdates.attributes = updates.attributes;
      
      // Update variants with shared attributes
      if (Object.keys(sharedAttributeUpdates).length > 0) {
        variants.forEach(variant => {
          const variantIndex = updatedProducts.findIndex(p => p.id === variant.id);
          if (variantIndex !== -1) {
            updatedProducts[variantIndex] = {
              ...updatedProducts[variantIndex],
              ...sharedAttributeUpdates,
              updatedAt: new Date().toISOString(),
              updatedBy: updates.updatedBy ?? updatedProducts[variantIndex].updatedBy
            };
          }
        });
      }
    }

    setProducts(updatedProducts);
    
    // Update category product counts if categoryId changed (FR-9.1)
    const newCategoryId = updates.categoryId !== undefined ? updates.categoryId : oldCategoryId;
    if (oldCategoryId !== newCategoryId) {
      setCategories(prevCategories => updateCategoryProductCounts(updatedProducts, prevCategories));
    }
  };

  const deleteProduct = (id: number) => {
    const product = products.find(p => p.id === id);
    const updatedProducts = products.filter(p => p.id !== id);
    setProducts(updatedProducts);
    
    // Update category product counts (FR-9.1)
    if (product?.categoryId) {
      setCategories(prevCategories => updateCategoryProductCounts(updatedProducts, prevCategories));
    }
  };

  const getProduct = (id: number) => {
    return products.find(p => p.id === id);
  };

  // Check if product has associated orders (FR-3.1)
  const hasProductOrders = (productId: number): boolean => {
    return orders.some(order => order.productId === productId);
  };

  // Get orders for a product (FR-3.1)
  const getProductOrders = (productId: number): Order[] => {
    return orders.filter(order => order.productId === productId);
  };

  // Bulk delete products (FR-3.6)
  const bulkDeleteProducts = (productIds: number[]): { success: number; failed: Array<{ id: number; reason: string }> } => {
    const failed: Array<{ id: number; reason: string }> = [];
    const toDelete: number[] = [];

    productIds.forEach(id => {
      if (hasProductOrders(id)) {
        failed.push({ id, reason: 'Product has associated orders' });
      } else {
        toDelete.push(id);
      }
    });

    const updatedProducts = products.filter(p => !toDelete.includes(p.id));
    setProducts(updatedProducts);
    
    // Update category product counts (FR-9.1)
    setCategories(prevCategories => updateCategoryProductCounts(updatedProducts, prevCategories));
    
    return { success: toDelete.length, failed };
  };

  // Bulk update product status (FR-3.7)
  const bulkUpdateProductStatus = (productIds: number[], status: ProductStatus): { success: number; failed: Array<{ id: number; reason: string }> } => {
    const failed: Array<{ id: number; reason: string }> = [];
    const toUpdate: number[] = [];

    productIds.forEach(id => {
      const product = products.find(p => p.id === id);
      if (!product) {
        failed.push({ id, reason: 'Product not found' });
        return;
      }

      // Validate status change (draft -> complete requires all required fields) (FR-3.7)
      if (status === 'complete' && product.status === 'draft') {
        const missingFields: string[] = [];
        
        // Check basic required fields
        if (!product.name.tr?.trim()) missingFields.push('Name (TR)');
        if (!product.name.en?.trim()) missingFields.push('Name (EN)');
        if (!product.sku?.trim()) missingFields.push('SKU');
        if (!product.categoryId) missingFields.push('Category');
        if (!product.brandId) missingFields.push('Brand');
        if (!product.description.tr?.trim()) missingFields.push('Description (TR)');
        if (!product.description.en?.trim()) missingFields.push('Description (EN)');

        // Check required attributes from category
        if (product.categoryId) {
          const category = categories.find(c => c.id === product.categoryId);
          if (category && category.requiredAttributeIds) {
            category.requiredAttributeIds.forEach((attrId) => {
              const attrValue = product.attributes[attrId];
              if (!attrValue || attrValue.value === null || attrValue.value === undefined || attrValue.value === '') {
                const attr = attributes.find((a) => a.id === attrId);
                if (attr) {
                  missingFields.push(attr.name.tr || attr.name.en || `Attribute #${attrId}`);
                }
              }
            });
          }
        }

        if (missingFields.length > 0) {
          failed.push({ id, reason: `Missing required fields: ${missingFields.join(', ')}` });
          return;
        }
      }

      toUpdate.push(id);
    });

    setProducts(products.map(p =>
      toUpdate.includes(p.id) ? { ...p, status, updatedAt: new Date().toISOString() } : p
    ));

    return { success: toUpdate.length, failed };
  };


  // Bulk update price (FR-3.10) - updates base currency price and syncs to prices map
  const bulkUpdatePrice = (productIds: number[], method: 'set' | 'increase_amount' | 'increase_percent' | 'decrease_amount' | 'decrease_percent', value: number): void => {
    const defaultCurrency = settings.currencies?.find(c => c.isDefault);
    const baseCurrencyCode = defaultCurrency?.code || 'TRY';

    setProducts(products.map(p => {
      if (!productIds.includes(p.id)) return p;

      let newPrice = p.price;
      switch (method) {
        case 'set':
          newPrice = value;
          break;
        case 'increase_amount':
          newPrice = p.price + value;
          break;
        case 'increase_percent':
          newPrice = p.price * (1 + value / 100);
          break;
        case 'decrease_amount':
          newPrice = Math.max(0, p.price - value);
          break;
        case 'decrease_percent':
          newPrice = p.price * (1 - value / 100);
          break;
      }

      const finalPrice = Math.max(0, newPrice);
      return {
        ...p,
        price: finalPrice,
        prices: { ...(p.prices || {}), [baseCurrencyCode]: finalPrice },
        updatedAt: new Date().toISOString(),
      };
    }));
  };

  // Bulk update stock (FR-3.11)
  const bulkUpdateStock = (productIds: number[], method: 'set' | 'increase' | 'decrease', value: number): void => {
    setProducts(products.map(p => {
      if (!productIds.includes(p.id)) return p;

      let newStock = p.stock;
      switch (method) {
        case 'set':
          newStock = value;
          break;
        case 'increase':
          newStock = p.stock + value;
          break;
        case 'decrease':
          newStock = Math.max(0, p.stock - value);
          break;
      }

      return {
        ...p,
        stock: Math.max(0, Math.floor(newStock)),
        updatedAt: new Date().toISOString(),
      };
    }));
  };



  // Helper function to check if a category is a descendant of another (prevents circular references)
  const isDescendant = (categoryId: number, potentialParentId: number | null, allCategories: Category[]): boolean => {
    if (potentialParentId === null) return false;
    if (categoryId === potentialParentId) return true;
    
    const parent = allCategories.find(c => c.id === potentialParentId);
    if (!parent || parent.parentId === null) return false;
    
    return isDescendant(categoryId, parent.parentId, allCategories);
  };

  // Helper function to generate category path
  const generateCategoryPath = (categoryName: string, parentId: number | null, allCategories: Category[]): string => {
    const name = categoryName;
    if (parentId === null) return name;
    
    const parent = allCategories.find(c => c.id === parentId);
    if (!parent) return name;
    
    const parentName = parent.name;
    return `${parentName} > ${name}`;
  };

  // Helper function to calculate category level
  const calculateCategoryLevel = (parentId: number | null, allCategories: Category[]): number => {
    if (parentId === null) return 0;
    const parent = allCategories.find(c => c.id === parentId);
    if (!parent) return 0;
    return parent.level + 1;
  };

  // Helper function to update paths for a category and all its descendants
  const updateCategoryPaths = (categoryId: number, allCategories: Category[]): Category[] => {
    return allCategories.map(cat => {
      if (cat.id === categoryId) {
        // Update this category's path
        const parent = cat.parentId ? allCategories.find(c => c.id === cat.parentId) : null;
        const name = typeof cat.name === 'string' ? cat.name : cat.name.tr;
        const newPath = parent 
          ? `${typeof parent.name === 'string' ? parent.name : parent.name.tr} > ${name}`
          : name;
        
        return { ...cat, path: newPath };
      }
      
      // Update descendants' paths
      if (cat.parentId === categoryId) {
        const parent = allCategories.find(c => c.id === categoryId);
        if (parent) {
          const name = typeof cat.name === 'string' ? cat.name : cat.name.tr;
          const newPath = `${typeof parent.name === 'string' ? parent.name : parent.name.tr} > ${name}`;
          return { ...cat, path: newPath };
        }
      }
      
      return cat;
    });
  };

  // Helper function to update product counts for categories (FR-9.1)
  const updateCategoryProductCounts = (allProducts: Product[], allCategories: Category[]): Category[] => {
    // Count products per category
    const productCounts: Record<number, number> = {};
    allProducts.forEach(product => {
      if (product.categoryId) {
        productCounts[product.categoryId] = (productCounts[product.categoryId] || 0) + 1;
      }
    });

    // Update categories with product counts
    return allCategories.map(category => ({
      ...category,
      productCount: productCounts[category.id] || 0
    }));
  };

  // Categories
  const createCategory = (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Validation: Check for circular reference (shouldn't happen on create, but safety check)
    if (categoryData.parentId !== null) {
      // This is a new category, so no circular reference possible
      // But validate parent exists
      const parentExists = categories.some(c => c.id === categoryData.parentId);
      if (!parentExists) {
        throw new Error('Parent category does not exist');
      }
    }

    // Validation: Check name uniqueness within same parent level
    const name = typeof categoryData.name === 'string' ? categoryData.name : categoryData.name.tr;
    const duplicateName = categories.some(c => {
      if (c.parentId !== categoryData.parentId) return false;
      const existingName = typeof c.name === 'string' ? c.name : c.name.tr;
      return existingName.toLowerCase() === name.toLowerCase();
    });
    
    if (duplicateName) {
      throw new Error(`Category name "${name}" already exists at this level`);
    }

    const level = calculateCategoryLevel(categoryData.parentId, categories);
    const path = generateCategoryPath(categoryData.name, categoryData.parentId, categories);

    const newCategoryId = Math.max(...categories.map(c => c.id), 0) + 1;
    const newCategory: Category = {
      ...categoryData,
      level,
      path,
      id: newCategoryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCategories([...categories, newCategory]);

    // Sync attribute.categoryIds for all attributes assigned to this category
    const assignedAttrIds = new Set([
      ...(categoryData.requiredAttributeIds || []),
      ...(categoryData.variantAttributeIds || []),
    ]);
    if (assignedAttrIds.size > 0) {
      setAttributes(prev => prev.map(attr =>
        assignedAttrIds.has(attr.id) && !attr.categoryIds.includes(newCategoryId)
          ? { ...attr, categoryIds: [...attr.categoryIds, newCategoryId], updatedAt: new Date().toISOString() }
          : attr
      ));
    }
  };

  const updateCategory = (id: number, updates: Partial<Category>) => {
    const category = categories.find(c => c.id === id);
    if (!category) return;

    // Validation: Check for circular reference if parentId is being updated
    if (updates.parentId !== undefined && updates.parentId !== category.parentId) {
      if (updates.parentId !== null && isDescendant(id, updates.parentId, categories)) {
        throw new Error('Cannot set parent to a descendant category (circular reference prevented)');
      }
    }

    // Validation: Check name uniqueness within same parent level if name is being updated
    if (updates.name !== undefined) {
      const newName = typeof updates.name === 'string' ? updates.name : updates.name.tr;
      const parentId = updates.parentId !== undefined ? updates.parentId : category.parentId;
      
      const duplicateName = categories.some(c => {
        if (c.id === id) return false; // Exclude self
        if (c.parentId !== parentId) return false;
        const existingName = typeof c.name === 'string' ? c.name : c.name.tr;
        return existingName.toLowerCase() === newName.toLowerCase();
      });
      
      if (duplicateName) {
        throw new Error(`Category name "${newName}" already exists at this level`);
      }
    }

    // Update the category
    const updatedCategories = categories.map(c => {
      if (c.id === id) {
        const updatedCategory = { ...c, ...updates, updatedAt: new Date().toISOString() };
        
        // Recalculate level and path if parent changed
        if (updates.parentId !== undefined && updates.parentId !== c.parentId) {
          updatedCategory.level = calculateCategoryLevel(updates.parentId || null, categories);
          updatedCategory.path = generateCategoryPath(
            updates.name || updatedCategory.name,
            updates.parentId || null,
            categories
          );
        } else if (updates.name !== undefined) {
          // Path needs update if name changed
          updatedCategory.path = generateCategoryPath(
            updates.name,
            updatedCategory.parentId,
            categories
          );
        }
        
        return updatedCategory;
      }
      return c;
    });

    // Update paths for all descendants if parent or name changed
    if (updates.parentId !== undefined || updates.name !== undefined) {
      // Sort categories by level to ensure parents are processed before children
      const sortedCategories = [...updatedCategories].sort((a, b) => a.level - b.level);
      
      // Update all categories' paths and levels based on their parents
      const finalCategories = sortedCategories.map(cat => {
        if (cat.parentId === null) {
          // Root category
          const name = typeof cat.name === 'string' ? cat.name : cat.name.tr;
          return { ...cat, path: name, level: 0 };
        } else {
          // Find parent in the updated list
          const parent = sortedCategories.find(c => c.id === cat.parentId);
          if (parent) {
            const name = typeof cat.name === 'string' ? cat.name : cat.name.tr;
            const parentName = typeof parent.name === 'string' ? parent.name : parent.name.tr;
            const newPath = `${parentName} > ${name}`;
            const newLevel = parent.level + 1;
            return { ...cat, path: newPath, level: newLevel };
          }
        }
        return cat;
      });
      
      setCategories(finalCategories);
      return;
    }

    setCategories(updatedCategories);

    // Sync attribute.categoryIds if assigned attributes changed
    if (updates.requiredAttributeIds !== undefined || updates.variantAttributeIds !== undefined) {
      const category = categories.find(c => c.id === id);
      if (category) {
        const oldAttrIds = new Set([
          ...(category.requiredAttributeIds || []),
          ...(category.variantAttributeIds || []),
        ]);
        const newAttrIds = new Set([
          ...(updates.requiredAttributeIds ?? category.requiredAttributeIds ?? []),
          ...(updates.variantAttributeIds ?? category.variantAttributeIds ?? []),
        ]);

        const added = [...newAttrIds].filter(attrId => !oldAttrIds.has(attrId));
        const removed = [...oldAttrIds].filter(attrId => !newAttrIds.has(attrId));

        if (added.length > 0 || removed.length > 0) {
          setAttributes(prev => prev.map(attr => {
            let categoryIds = [...attr.categoryIds];
            if (added.includes(attr.id) && !categoryIds.includes(id)) {
              categoryIds = [...categoryIds, id];
            }
            if (removed.includes(attr.id)) {
              categoryIds = categoryIds.filter(cid => cid !== id);
            }
            return categoryIds === attr.categoryIds
              ? attr
              : { ...attr, categoryIds, updatedAt: new Date().toISOString() };
          }));
        }
      }
    }
  };

  const deleteCategory = (id: number) => {
    // Delete category and all its descendants
    const deleteRecursive = (categoryId: number): number[] => {
      const toDelete = [categoryId];
      categories.forEach(c => {
        if (c.parentId === categoryId) {
          toDelete.push(...deleteRecursive(c.id));
        }
      });
      return toDelete;
    };

    const idsToDelete = deleteRecursive(id);
    setCategories(categories.filter(c => !idsToDelete.includes(c.id)));
  };

  const getCategoryTree = (): Category[] => {
    const buildTree = (parentId: number | null): Category[] => {
      return categories
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id),
        }));
    };
    return buildTree(null);
  };

  // Attributes
  const createAttribute = (attributeData: Omit<Attribute, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAttribute: Attribute = {
      ...attributeData,
      id: Math.max(...attributes.map(a => a.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAttributes([...attributes, newAttribute]);
  };

  const updateAttribute = (id: number, updates: Partial<Attribute>) => {
    setAttributes(attributes.map(a =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
    ));
  };

  const deleteAttribute = (id: number) => {
    setAttributes(attributes.filter(a => a.id !== id));
  };


  // Channels
  const createChannel = (channelData: Omit<Channel, 'createdAt' | 'updatedAt'>) => {
    const newChannel: Channel = {
      ...channelData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChannels([...channels, newChannel]);
    // Initialize empty category and attribute arrays for new channel
    if (!channelCategories[newChannel.id]) {
      setChannelCategories({ ...channelCategories, [newChannel.id]: [] });
    }
    if (!channelAttributes[newChannel.id]) {
      setChannelAttributes({ ...channelAttributes, [newChannel.id]: [] });
    }
  };

  const updateChannel = (id: string, updates: Partial<Channel>) => {
    setChannels(channels.map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    ));
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
    const newCategories = { ...channelCategories };
    delete newCategories[id];
    setChannelCategories(newCategories);
    const newAttributes = { ...channelAttributes };
    delete newAttributes[id];
    setChannelAttributes(newAttributes);
  };

  const getChannel = (id: string) => {
    return channels.find(c => c.id === id);
  };

  // Channel Categories
  const createChannelCategory = (channelId: string, categoryData: Omit<ChannelCategory, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCategory: ChannelCategory = {
      ...categoryData,
      id: `${channelId}_cat_${Date.now()}`,
      channelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const channelCats = channelCategories[channelId] || [];
    setChannelCategories({
      ...channelCategories,
      [channelId]: [...channelCats, newCategory],
    });
  };

  const updateChannelCategory = (channelId: string, categoryId: string, updates: Partial<ChannelCategory>) => {
    const channelCats = channelCategories[channelId] || [];
    setChannelCategories({
      ...channelCategories,
      [channelId]: channelCats.map(c =>
        c.id === categoryId ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    });
  };

  const deleteChannelCategory = (channelId: string, categoryId: string) => {
    const channelCats = channelCategories[channelId] || [];
    const removeCategory = (cats: ChannelCategory[], id: string): ChannelCategory[] => {
      return cats
        .filter(c => c.id !== id)
        .map(c => ({
          ...c,
          children: c.children ? removeCategory(c.children, id) : null,
        }));
    };
    setChannelCategories({
      ...channelCategories,
      [channelId]: removeCategory(channelCats, categoryId),
    });
  };

  const getChannelCategoryTree = (channelId: string): ChannelCategory[] => {
    const cats = channelCategories[channelId] || [];
    const buildTree = (parentId: string | null): ChannelCategory[] => {
      return cats
        .filter(c => c.parentId === parentId)
        .map(c => ({
          ...c,
          children: buildTree(c.id),
        }));
    };
    return buildTree(null);
  };

  // Channel Attributes
  const createChannelAttribute = (channelId: string, attributeData: Omit<ChannelAttribute, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newAttribute: ChannelAttribute = {
      ...attributeData,
      id: `${channelId}_attr_${Date.now()}`,
      channelId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const channelAttrs = channelAttributes[channelId] || [];
    setChannelAttributes({
      ...channelAttributes,
      [channelId]: [...channelAttrs, newAttribute],
    });
  };

  const updateChannelAttribute = (channelId: string, attributeId: string, updates: Partial<ChannelAttribute>) => {
    const channelAttrs = channelAttributes[channelId] || [];
    setChannelAttributes({
      ...channelAttributes,
      [channelId]: channelAttrs.map(a =>
        a.id === attributeId ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    });
  };

  const deleteChannelAttribute = (channelId: string, attributeId: string) => {
    const channelAttrs = channelAttributes[channelId] || [];
    setChannelAttributes({
      ...channelAttributes,
      [channelId]: channelAttrs.filter(a => a.id !== attributeId),
    });
  };

  const getChannelAttributes = (channelId: string): ChannelAttribute[] => {
    return channelAttributes[channelId] || [];
  };

  // Mappings
  const categoryMappings = settings.categoryMappings || [];
  const attributeMappings = settings.attributeMappings || [];
  const attributeValueMappings = settings.attributeValueMappings || [];

  const createCategoryMapping = (mappingData: Omit<CategoryMapping, 'id' | 'mappedAt' | 'updatedAt'>) => {
    const newMapping: CategoryMapping = {
      ...mappingData,
      id: Math.max(...categoryMappings.map(m => m.id), 0) + 1,
      mappedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSettings({
      ...settings,
      categoryMappings: [...categoryMappings, newMapping],
    });
  };

  const updateCategoryMapping = (id: number, updates: Partial<CategoryMapping>) => {
    updateSettings({
      ...settings,
      categoryMappings: categoryMappings.map(m =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    });
  };

  const deleteCategoryMapping = (id: number) => {
    updateSettings({
      ...settings,
      categoryMappings: categoryMappings.filter(m => m.id !== id),
    });
  };

  const createAttributeMapping = (mappingData: Omit<AttributeMapping, 'id' | 'mappedAt' | 'updatedAt'>) => {
    const newMapping: AttributeMapping = {
      ...mappingData,
      id: Math.max(...attributeMappings.map(m => m.id), 0) + 1,
      mappedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSettings({
      ...settings,
      attributeMappings: [...attributeMappings, newMapping],
    });
  };

  const updateAttributeMapping = (id: number, updates: Partial<AttributeMapping>) => {
    updateSettings({
      ...settings,
      attributeMappings: attributeMappings.map(m =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    });
  };

  const deleteAttributeMapping = (id: number) => {
    updateSettings({
      ...settings,
      attributeMappings: attributeMappings.filter(m => m.id !== id),
    });
  };

  const createAttributeValueMapping = (mappingData: Omit<AttributeValueMapping, 'id' | 'mappedAt' | 'updatedAt'>) => {
    const newMapping: AttributeValueMapping = {
      ...mappingData,
      id: Math.max(...attributeValueMappings.map(m => m.id), 0) + 1,
      mappedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateSettings({
      ...settings,
      attributeValueMappings: [...attributeValueMappings, newMapping],
    });
  };

  const updateAttributeValueMapping = (id: number, updates: Partial<AttributeValueMapping>) => {
    updateSettings({
      ...settings,
      attributeValueMappings: attributeValueMappings.map(m =>
        m.id === id ? { ...m, ...updates, updatedAt: new Date().toISOString() } : m
      ),
    });
  };

  const deleteAttributeValueMapping = (id: number) => {
    updateSettings({
      ...settings,
      attributeValueMappings: attributeValueMappings.filter(m => m.id !== id),
    });
  };

  // Export Logs
  const exportLogs = settings.exportLogs || [];

  const createExportLog = (logData: Omit<ExportLog, 'id' | 'exportedAt'>) => {
    const newLog: ExportLog = {
      ...logData,
      id: Math.max(...exportLogs.map(l => l.id), 0) + 1,
      exportedAt: new Date().toISOString(),
    };
    updateSettings({
      ...settings,
      exportLogs: [...exportLogs, newLog],
    });
  };

  // Channel Validation Rules
  const createChannelValidationRule = (ruleData: Omit<ChannelValidationRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRule: ChannelValidationRule = {
      ...ruleData,
      id: Math.max(...channelValidationRules.map(r => r.id), 0) + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setChannelValidationRules([...channelValidationRules, newRule]);
  };

  const updateChannelValidationRule = (id: number, updates: Partial<ChannelValidationRule>) => {
    setChannelValidationRules(channelValidationRules.map(r =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    ));
  };

  const deleteChannelValidationRule = (id: number) => {
    setChannelValidationRules(channelValidationRules.filter(r => r.id !== id));
  };

  // Settings
  const updateSettings = (updates: Partial<Settings>, newLanguageCodeForChannels?: string) => {
    setSettings({ ...settings, ...updates });
    
    // If a new language code is provided, apply it to existing channel categories and attributes
    if (newLanguageCodeForChannels) {
      // Update channel categories to include the new language (with empty strings)
      const updatedChannelCategories: Record<string, ChannelCategory[]> = {};
      Object.keys(channelCategories).forEach(channelId => {
        updatedChannelCategories[channelId] = channelCategories[channelId].map(category => ({
          ...category,
          name: typeof category.name === 'string' 
            ? { [newLanguageCodeForChannels]: '' } 
            : { ...category.name, [newLanguageCodeForChannels]: '' },
          description: typeof category.description === 'string'
            ? { [newLanguageCodeForChannels]: '' }
            : category.description
            ? { ...category.description, [newLanguageCodeForChannels]: '' }
            : { [newLanguageCodeForChannels]: '' },
        }));
      });
      setChannelCategories(updatedChannelCategories);

      // Update channel attributes to include the new language (with empty strings)
      const updatedChannelAttributes: Record<string, ChannelAttribute[]> = {};
      Object.keys(channelAttributes).forEach(channelId => {
        updatedChannelAttributes[channelId] = channelAttributes[channelId].map(attribute => ({
          ...attribute,
          name: typeof attribute.name === 'string'
            ? { [newLanguageCodeForChannels]: '' }
            : { ...attribute.name, [newLanguageCodeForChannels]: '' },
        }));
      });
      setChannelAttributes(updatedChannelAttributes);
    }
  };

  return (
    <DataContext.Provider value={{
      products,
      createProduct,
      updateProduct,
      deleteProduct,
      getProduct,
      hasProductOrders,
      getProductOrders,
      bulkDeleteProducts,
      bulkUpdateProductStatus,
      bulkUpdatePrice,
      bulkUpdateStock,
      categories,
      createCategory,
      updateCategory,
      deleteCategory,
      getCategoryTree,
      attributes,
      createAttribute,
      updateAttribute,
      deleteAttribute,
      brands,
      channels,
      channelCategories,
      channelAttributes,
      createChannel,
      updateChannel,
      deleteChannel,
      getChannel,
      createChannelCategory,
      updateChannelCategory,
      deleteChannelCategory,
      getChannelCategoryTree,
      createChannelAttribute,
      updateChannelAttribute,
      deleteChannelAttribute,
      getChannelAttributes,
      categoryMappings,
      attributeMappings,
      attributeValueMappings,
      createCategoryMapping,
      updateCategoryMapping,
      deleteCategoryMapping,
      createAttributeMapping,
      updateAttributeMapping,
      deleteAttributeMapping,
      createAttributeValueMapping,
      updateAttributeValueMapping,
      deleteAttributeValueMapping,
      exportLogs,
      createExportLog,
      channelValidationRules,
      createChannelValidationRule,
      updateChannelValidationRule,
      deleteChannelValidationRule,
      settings,
      updateSettings,
    }}>
      {children}
    </DataContext.Provider>
  );
};


// User types
export type UserRole = 'admin' | 'standard_user';
export type UserStatus = 'active' | 'inactive';

export interface Permission {
  view: boolean;
  edit: boolean;
  update: boolean;
  pageAccess: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  permissions: Record<string, Permission> | null; // null for admins
  avatar?: string;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// Product types
export type ProductStatus = 'draft' | 'complete';

export interface Product {
  id: number;
  sku: string;
  baseSKU: string | null; // Base SKU identifier for main product (null for standalone products)
  name: string;
  brand: string;
  brandId: number;
  model: string | null;
  categoryId: number;
  description: string;
  keywords: string | null;
  stock: number;
  price: number; // Price (required)
  images: string[];
  imageUrl: string;
  attributes: Record<string, { value: string | number | boolean; status?: string }>;
  customAttributes?: Record<string, string>;
  status: ProductStatus;
  parentProductId: number | null;
  variantAttributes: Record<string, string | number> | null;
  isBaseProduct: boolean;
  createdBy: number;
  updatedBy: number;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  id: number;
  name: MultiLangText | string; // Supports both string for legacy and MultiLangText for localization
  parentId: number | null;
  level: number;
  path: string;
  productCount: number;
  children: Category[] | null;
  requiredAttributeIds: number[]; // Attributes required for products in this category
  variantAttributeIds: number[]; // Attributes used for product variants in this category
  channelMappings: Record<string, CategoryMapping>;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

// Attribute types
// attributeType: Determines if value is selected from options or free text input
export type AttributeType = 'select' | 'freeText';

// attributeVariableType: Determines the variable type of the attribute value
export type AttributeVariableType = 'boolean' | 'string' | 'number';

export interface AttributeValidation {
  min?: number; // For number type
  max?: number; // For number type
  pattern?: string; // For string type
  options?: Array<{ value: string; label: MultiLangText | string }>; // For select type (supports both string for legacy and MultiLangText)
}

export interface AttributeMapping {
  channelAttributeIds: string[];
  isActive: boolean;
  mappedAt: string;
  mappedBy: number;
}

export interface Attribute {
  id: number;
  code: string; // Human-readable identifier/code for the attribute
  name: MultiLangText | string; // Supports both string for legacy and MultiLangText for localization
  attributeType: AttributeType; // 'select' | 'freeText'
  attributeVariableType: AttributeVariableType; // 'boolean' | 'string' | 'number'
  categoryIds: number[];
  required: boolean;
  validation: AttributeValidation;
  defaultValue: string | number | boolean | null;
  channelMappings: Record<string, AttributeMapping>;
  isVariantAttribute?: boolean;
  createdAt: string;
  updatedAt: string;
  // Legacy support: keep 'type' for backward compatibility during migration
  type?: AttributeType;
}


// Brand type
export interface Brand {
  id: number;
  name: string;
  logo?: string;
  createdAt: string;
}

// Channel types
export interface Channel {
  id: string; // Channel ID (e.g., 'amazon', 'ebay', 'shopify')
  name: string; // Channel name
  type: string; // Channel type (marketplace, e-commerce, retail, etc.)
  description?: string; // Channel description
  logoUrl?: string | null; // Channel logo/icon URL
  isActive: boolean; // Channel active status
  configuration?: {
    apiEndpoint?: string | null;
    apiCredentials?: {
      key: string; // Encrypted
      secret: string; // Encrypted
    } | null;
    authMethod?: string | null;
    exportFormat?: 'csv' | 'json' | 'xml' | 'api';
    exportFrequency?: 'manual' | 'scheduled';
    requirements?: {
      requiredFields: string[];
      fieldLengths: Record<string, number>;
      specialRules: string[];
    };
  };
  lastSyncAt?: string | null; // Last sync date (ISO string)
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCategory {
  id: string; // Channel category ID (channel-specific)
  channelId: string; // Parent channel ID
  name: string; // Channel category name
  parentId: string | null; // Parent category ID (null for root)
  level: number; // Depth level (0 for root)
  path: string; // Full path
  children: ChannelCategory[] | null; // Child categories
  externalId?: string | null; // External ID from channel API
  additionalFields?: Record<string, any>; // Channel-specific additional fields
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

export interface ChannelAttribute {
  id: string; // Channel attribute ID (channel-specific)
  channelId: string; // Parent channel ID
  name: string; // Channel attribute name
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'date';
  isRequired: boolean; // Required for this channel
  allowedValues?: string[] | null; // For select/multiselect types
  externalId?: string | null; // External ID from channel API
  additionalProperties?: Record<string, any>; // Channel-specific additional properties
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
}

// Mapping types
export interface CategoryMapping {
  id: number; // Mapping ID
  masterCategoryId: number; // Master category ID
  channelId: string; // Target channel ID
  channelCategoryId: string; // Channel category ID (one per channel)
  isActive: boolean; // Mapping active status
  mappedAt: string; // ISO date string
  mappedBy: number; // User ID who created mapping
  updatedAt: string; // ISO date string
}

export interface AttributeMapping {
  id: number; // Mapping ID
  masterAttributeId: number; // Master attribute ID
  channelId: string; // Target channel ID
  channelAttributeIds: string[]; // Channel attribute IDs (one-to-many support)
  isActive: boolean; // Mapping active status
  transformationRules?: Record<string, any> | null; // Optional transformation rules
  mappedAt: string; // ISO date string
  mappedBy: number; // User ID who created mapping
  updatedAt: string; // ISO date string
}

export interface AttributeValueMapping {
  id: number; // Mapping ID
  masterAttributeId: number; // Master attribute ID
  masterValue: string | number | boolean; // Master attribute value
  channelId: string; // Target channel ID
  channelAttributeId: string; // Channel attribute ID (from attribute mapping)
  channelValue: string | number | boolean; // Channel-specific value
  isActive: boolean; // Mapping active status
  mappedAt: string; // ISO date string
  mappedBy: number; // User ID who created mapping
  updatedAt?: string; // ISO date string
}

export interface ExportLog {
  id: number; // Export log ID
  channelId: string; // Target channel ID
  productIds: number[]; // Exported product IDs
  exportFormat: 'api' | 'csv' | 'json' | 'xml';
  status: 'success' | 'failed' | 'partial';
  errorCount: number; // Number of errors
  warningCount: number; // Number of warnings
  errors?: Array<{
    productId: number;
    errorMessage: string;
    errorType: string;
  }>;
  warnings?: Array<{
    productId: number;
    warningMessage: string;
  }>;
  exportedBy: number; // User ID who initiated export
  exportedAt: string; // ISO date string
  completedAt?: string | null; // ISO date string (null if in progress)
  exportData?: any | null; // Exported data (optional, for review)
}

export interface ChannelValidationRule {
  id: number; // Validation rule ID
  channelId: string | null; // Target channel ID (null for global rules)
  name: string; // Rule name/description
  type: 'category' | 'attribute' | 'value' | 'completeness' | 'type-compatibility' | 'custom';
  severity: 'error' | 'warning' | 'info'; // Severity level
  isActive: boolean; // Whether rule is active
  condition: {
    // Rule condition configuration
    checkType: 'required' | 'format' | 'range' | 'pattern' | 'custom';
    target?: 'category' | 'attribute' | 'value' | 'mapping';
    attributeId?: number; // For attribute-specific rules
    channelAttributeId?: string; // For channel attribute-specific rules
    pattern?: string; // For pattern matching
    min?: number; // For range checks
    max?: number; // For range checks
    customExpression?: string; // For custom validation expressions
  };
  message: string; // Error/warning message template
  createdBy: number; // User ID who created rule
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Settings types
export interface APIKey {
  id: number;
  name: string;
  description: string;
  keyHash: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'revoked';
}

export interface ValidationRules {
  product: {
    requiredFields: string[];
    fieldLengths: Record<string, number>;
    valueRanges: Record<string, { min: number; max: number }>;
  };
  asset: {
    maxFileSize: number;
    maxImageCount: number;
  };
}

export interface SystemPreferences {
  dateFormat: string;
  timezone: string;
  itemsPerPage: number;
  emailNotifications: boolean;
}

export interface Settings {
  apiKeys: APIKey[];
  validation: ValidationRules;
  preferences: SystemPreferences;
  languages: Language[]; // System languages
  // Channel mappings
  categoryMappings: CategoryMapping[];
  attributeMappings: AttributeMapping[];
  attributeValueMappings: AttributeValueMapping[];
  exportLogs: ExportLog[];
}

// Order types (for product deletion validation)
export interface Order {
  id: number;
  productId: number; // Product ID referenced in order
  orderNumber: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

// Multi-language text type (dynamic language support)
export interface MultiLangText {
  [languageCode: string]: string;
}

// Language configuration type
export interface Language {
  id: number;
  code: string; // e.g., 'en', 'tr', 'de', 'fr'
  name: string; // e.g., 'English', 'Turkish', 'German'
  nativeName: string; // e.g., 'English', 'Türkçe', 'Deutsch'
  isDefault: boolean; // Whether this is the default language
  isActive: boolean; // Whether this language is active
  createdAt: string;
  updatedAt: string;
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  status?: ProductStatus[];
  categoryId?: number;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}


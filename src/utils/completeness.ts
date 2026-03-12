import type { Product, Category, Attribute } from '../types';

export interface CompletenessResult {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
}

/**
 * Calculate product completeness based on required fields
 */
export function calculateProductCompleteness(
  product: Product,
  category: Category | undefined,
  attributes: Attribute[],
  getText: (text: any) => string
): CompletenessResult {
  const missingFields: string[] = [];
  let totalFields = 0;
  let completedFields = 0;

  // Basic required fields (5 fields)
  const requiredFields = [
    {
      name: 'SKU',
      value: product.sku,
      check: () => !!product.sku?.trim()
    },
    {
      name: 'Product Name',
      value: typeof product.name === 'string' ? product.name : getText(product.name),
      check: () => {
        const nameText = typeof product.name === 'string' ? product.name : getText(product.name);
        return !!nameText?.trim();
      }
    },
    {
      name: 'Brand',
      value: product.brand,
      check: () => !!product.brandId && !!product.brand
    },
    {
      name: 'Category',
      value: category ? getText(category.name) : '',
      check: () => !!product.categoryId
    },
    {
      name: 'Description',
      value: typeof product.description === 'string' ? product.description : getText(product.description),
      check: () => {
        const descText = typeof product.description === 'string' ? product.description : getText(product.description);
        return !!descText?.trim();
      }
    }
  ];

  requiredFields.forEach(field => {
    totalFields++;
    if (field.check()) {
      completedFields++;
    } else {
      missingFields.push(field.name);
    }
  });

  // Check required attributes from category
  if (category && category.requiredAttributeIds) {
    category.requiredAttributeIds.forEach(attrId => {
      totalFields++;
      const attrValue = product.attributes[attrId];
      const attr = attributes.find(a => a.id === attrId);
      
      if (attrValue && attrValue.value !== null && attrValue.value !== undefined && attrValue.value !== '') {
        completedFields++;
      } else if (attr) {
        missingFields.push(getText(attr.name));
      }
    });
  }

  const percentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return {
    percentage,
    completedFields,
    totalFields,
    missingFields
  };
}

/**
 * Get color class based on completeness percentage
 */
export function getCompletenessColor(percentage: number): {
  bg: string;
  text: string;
  border: string;
  bar: string;
} {
  if (percentage >= 80) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      bar: 'bg-green-500'
    };
  } else if (percentage >= 50) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      bar: 'bg-yellow-500'
    };
  } else {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      bar: 'bg-red-500'
    };
  }
}

/**
 * Get status icon/indicator based on completeness
 */
export function getCompletenessStatus(percentage: number): {
  label: string;
  icon: string;
} {
  if (percentage === 100) {
    return { label: 'Complete', icon: '✓' };
  } else if (percentage >= 80) {
    return { label: 'Nearly Complete', icon: '◐' };
  } else if (percentage >= 50) {
    return { label: 'In Progress', icon: '◔' };
  } else {
    return { label: 'Just Started', icon: '○' };
  }
}

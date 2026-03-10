export interface CSVRow {
  [key: string]: string;
}

export interface ParsedProduct {
  sku: string;
  nameTr: string;
  nameEn: string;
  brand: string;
  brandId?: number;
  categoryId?: number;
  category?: string;
  descriptionTr?: string;
  descriptionEn?: string;
  price?: number;
  stock?: number;
  status?: 'draft' | 'complete';
  images?: string[];
  [key: string]: any; // For dynamic attributes
}

export interface ParsedStatusUpdate {
  sku: string;
  status: 'draft' | 'complete';
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
}

/**
 * Parse CSV file content into rows
 */
export function parseCSV(content: string): CSVRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Detect delimiter (comma or semicolon)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  // Parse header
  const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim());

  // Parse data rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], delimiter);
    if (values.length === 0 || values.every(v => !v.trim())) continue; // Skip empty rows

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // End of field
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current); // Add last field

  return values;
}

/**
 * Parse products from CSV rows
 */
export function parseProductsFromCSV(
  rows: CSVRow[],
  brands: Array<{ id: number; name: string }>,
  categories: Array<{ id: number; name: { tr: string; en: string } }>
): { products: ParsedProduct[]; errors: ValidationError[] } {
  const products: ParsedProduct[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2; // +2 because row 1 is header, and arrays are 0-indexed
    const errorsForRow: ValidationError[] = [];

    // Required fields
    const sku = row['SKU'] || row['sku'] || '';
    const nameTr = row['Name (TR)'] || row['name_tr'] || row['Name TR'] || '';
    const nameEn = row['Name (EN)'] || row['name_en'] || row['Name EN'] || '';
    const brand = row['Brand'] || row['brand'] || '';
    const category = row['Category'] || row['category'] || '';

    // Validate required fields
    if (!sku) errorsForRow.push({ row: rowNum, field: 'SKU', message: 'SKU is required' });
    if (!nameTr && !nameEn) {
      errorsForRow.push({ row: rowNum, field: 'Name', message: 'At least one name (TR or EN) is required' });
    }
    if (!brand) errorsForRow.push({ row: rowNum, field: 'Brand', message: 'Brand is required' });
    if (!category) errorsForRow.push({ row: rowNum, field: 'Category', message: 'Category is required' });

    // Find brand ID
    let brandId: number | undefined;
    if (brand) {
      const foundBrand = brands.find(b => b.name.toLowerCase() === brand.toLowerCase());
      if (foundBrand) {
        brandId = foundBrand.id;
      } else {
        errorsForRow.push({ row: rowNum, field: 'Brand', message: `Brand "${brand}" not found` });
      }
    }

    // Find category ID
    let categoryId: number | undefined;
    if (category) {
      const foundCategory = categories.find(c => 
        c.name.tr.toLowerCase() === category.toLowerCase() || 
        c.name.en.toLowerCase() === category.toLowerCase()
      );
      if (foundCategory) {
        categoryId = foundCategory.id;
      } else {
        errorsForRow.push({ row: rowNum, field: 'Category', message: `Category "${category}" not found` });
      }
    }

    // Optional fields
    const descriptionTr = row['Description (TR)'] || row['description_tr'] || row['Description TR'] || '';
    const descriptionEn = row['Description (EN)'] || row['description_en'] || row['Description EN'] || '';
    const priceStr = row['Price'] || row['price'] || '';
    const stockStr = row['Stock'] || row['stock'] || '';
    const statusStr = row['Status'] || row['status'] || 'draft';
    const imagesStr = row['Images'] || row['images'] || '';

    // Parse price
    let price: number | undefined;
    if (priceStr) {
      const parsedPrice = parseFloat(priceStr.replace(/[^\d.-]/g, ''));
      if (!isNaN(parsedPrice)) {
        price = parsedPrice;
      } else {
        errorsForRow.push({ row: rowNum, field: 'Price', message: `Invalid price: ${priceStr}` });
      }
    }

    // Parse stock
    let stock: number | undefined;
    if (stockStr) {
      const parsedStock = parseInt(stockStr);
      if (!isNaN(parsedStock)) {
        stock = parsedStock;
      } else {
        errorsForRow.push({ row: rowNum, field: 'Stock', message: `Invalid stock: ${stockStr}` });
      }
    }

    // Parse status
    const status = statusStr.toLowerCase() === 'complete' ? 'complete' : 'draft';

    // Parse images (comma-separated URLs)
    const images = imagesStr ? imagesStr.split(',').map(img => img.trim()).filter(Boolean) : [];

    // If there are errors, add them and skip this product
    if (errorsForRow.length > 0) {
      errors.push(...errorsForRow);
      return;
    }

    // Create product object
    const product: ParsedProduct = {
      sku,
      nameTr,
      nameEn,
      brand,
      brandId,
      categoryId,
      category,
      descriptionTr: descriptionTr || undefined,
      descriptionEn: descriptionEn || undefined,
      price: price || 0,
      stock: stock || 0,
      status,
      images: images.length > 0 ? images : undefined,
    };

    products.push(product);
  });

  return { products, errors };
}

/**
 * Parse status updates from CSV rows
 */
export function parseStatusUpdatesFromCSV(rows: CSVRow[]): { updates: ParsedStatusUpdate[]; errors: ValidationError[] } {
  const updates: ParsedStatusUpdate[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const sku = row['SKU'] || row['sku'] || '';
    const statusStr = row['Status'] || row['status'] || '';

    if (!sku) {
      errors.push({ row: rowNum, field: 'SKU', message: 'SKU is required' });
      return;
    }

    if (!statusStr) {
      errors.push({ row: rowNum, field: 'Status', message: 'Status is required' });
      return;
    }

    const status = statusStr.toLowerCase() === 'complete' ? 'complete' : 'draft';
    updates.push({ sku, status });
  });

  return { updates, errors };
}

/**
 * Generate CSV template for product import
 */
export function generateProductImportTemplate(): string {
  return `SKU,Name (TR),Name (EN),Brand,Category,Description (TR),Description (EN),Price,Stock,Status,Images
PROD-001,Ürün Adı TR,Product Name EN,Brand Name,Category Name,Ürün Açıklaması TR,Product Description EN,100.00,50,draft,https://example.com/image1.jpg,https://example.com/image2.jpg`;
}

/**
 * Generate CSV template for status update
 */
export function generateStatusUpdateTemplate(): string {
  return `SKU,Status
PROD-001,complete
PROD-002,draft`;
}


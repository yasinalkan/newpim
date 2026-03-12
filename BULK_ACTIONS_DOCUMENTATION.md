# Bulk Actions Feature

## Overview
The Bulk Actions page provides a centralized interface for performing mass operations on products using CSV files. This feature streamlines workflows for creating, updating, and managing product data at scale.

## Features

### 1. **Bulk Create Products** 📦
Create multiple products at once by uploading a CSV file.

**Use Cases:**
- Initial product catalog setup
- Seasonal product launches
- Importing products from external systems

**Template Columns:**
- SKU (required)
- Name (TR) (required)
- Name (EN) (required)
- Brand (required)
- Category (required)
- Description (TR)
- Description (EN)
- Price
- Stock
- Status (draft/pending/complete)
- Images (comma-separated URLs)

### 2. **Bulk Update Products** ✏️
Update existing products by uploading a CSV file with only the fields you want to change.

**Use Cases:**
- Update product descriptions across catalog
- Add translations to existing products
- Bulk status changes
- Update multiple product attributes

**Template Columns:**
- SKU (required - identifies product)
- Name (TR) (optional)
- Name (EN) (optional)
- Price (optional)
- Stock (optional)
- Status (optional)

### 3. **Bulk Update Prices** 💰
Update product prices in bulk using a simple two-column CSV.

**Use Cases:**
- Seasonal price adjustments
- Promotional pricing
- Cost-of-goods updates
- Currency conversions

**Template Columns:**
- SKU (required)
- Price (required)

### 4. **Bulk Update Stock** 📊
Update product stock levels in bulk using a simple two-column CSV.

**Use Cases:**
- Inventory counts
- Warehouse synchronization
- Stock level adjustments
- End-of-season clearance

**Template Columns:**
- SKU (required)
- Stock (required)

## User Interface

### Navigation
Access via sidebar: **Bulk Actions** (icon: Layers)

### Page Structure

```
┌─────────────────────────────────────────┐
│   Bulk Actions                          │
│   Perform bulk operations using CSV     │
├─────────────────────────────────────────┤
│ [Create Products] [Update Products]     │
│ [Update Prices]   [Update Stock]        │
├─────────────────────────────────────────┤
│ Download Template Button                 │
│ File Upload Area                         │
│ Validation Errors (if any)              │
│ Process Button                           │
│ Results Summary                          │
└─────────────────────────────────────────┘
```

### Workflow

1. **Select Action Tab**
   - Choose the operation you want to perform

2. **Download Template**
   - Click "Download Template" button
   - Template pre-filled with sample data
   - Shows required column format

3. **Fill Template**
   - Open template in Excel/Google Sheets
   - Add your product data
   - Follow column format exactly

4. **Upload File**
   - Drag & drop or click to browse
   - Supports .csv and .txt files
   - Automatic delimiter detection (comma or semicolon)

5. **Review Validation**
   - System validates all rows
   - Shows errors with row numbers
   - Must fix errors before processing

6. **Process**
   - Click "Process" button
   - Real-time progress indicator
   - Cannot be cancelled once started

7. **View Results**
   - Success/Failed count
   - Detailed error messages
   - Warnings for partial updates

## CSV Template Examples

### Create Products Template
```csv
SKU,Name (TR),Name (EN),Brand,Category,Description (TR),Description (EN),Price,Stock,Status
SAMPLE-001,Örnek Ürün,Sample Product,Omnitive,Clothing,Örnek açıklama,Sample description,99.99,100,complete
SAMPLE-002,Test Ürünü,Test Product,W Collection,Shoes,Test açıklama,Test description,149.99,50,draft
```

### Update Products Template
```csv
SKU,Name (TR),Name (EN),Price,Stock,Status
SAMPLE-001,Yeni İsim,New Name,119.99,150,complete
SAMPLE-002,,,199.99,,pending
```
*Note: Empty cells are ignored - only non-empty fields are updated*

### Price Update Template
```csv
SKU,Price
SAMPLE-001,99.99
SAMPLE-002,149.99
SAMPLE-003,199.99
```

### Stock Update Template
```csv
SKU,Stock
SAMPLE-001,100
SAMPLE-002,50
SAMPLE-003,75
```

## Validation Rules

### File Validation
- ✅ Must be CSV or TXT format
- ✅ Maximum file size: 10MB (browser dependent)
- ✅ Must have header row
- ✅ Column names case-insensitive

### Data Validation

**Create Products:**
- SKU must be unique (not already exist)
- At least one name (TR or EN) required
- Brand must exist in system
- Category must exist in system
- Price must be non-negative number
- Stock must be non-negative integer
- Status must be: draft, pending, or complete

**Update Products:**
- SKU must exist in system
- Only validates non-empty fields
- Same rules as create for provided fields

**Price Updates:**
- SKU must exist in system
- Price must be non-negative number

**Stock Updates:**
- SKU must exist in system
- Stock must be non-negative integer

## Error Handling

### Validation Errors
Shown before processing:
```
Row 2: SKU is required
Row 3: Brand "Unknown Brand" not found
Row 5: Invalid price value
```

### Processing Errors
Shown after processing:
```
SKU SAMPLE-001: Product creation failed
SKU SAMPLE-002: Price must be positive number
```

### Partial Success
System processes all valid rows even if some fail:
- ✅ 45 Successful
- ❌ 5 Failed

## Performance

### Recommendations
- **Small batches**: 100-500 products per file
- **Medium batches**: 500-1000 products per file
- **Large batches**: 1000+ products (may take several minutes)

### Processing Time
- ~100 products: 5-10 seconds
- ~500 products: 20-30 seconds
- ~1000 products: 40-60 seconds

*Times vary based on validation complexity and system load*

## Best Practices

### 1. **Test First**
- Upload 5-10 products as test
- Verify results before full upload
- Check that all fields populated correctly

### 2. **Use Templates**
- Always start with downloaded template
- Don't modify column names
- Keep column order consistent

### 3. **Data Preparation**
- Clean data in Excel first
- Remove special characters from SKU
- Validate brands/categories exist
- Check number formats

### 4. **Backup**
- Export current data before bulk updates
- Keep original CSV file
- Test on staging environment if available

### 5. **Validation**
- Review all validation errors
- Fix errors in CSV, re-upload
- Don't ignore warnings

### 6. **Incremental Updates**
- For large updates, split into batches
- Update critical products first
- Monitor results between batches

## Common Issues & Solutions

### Issue: "Brand not found"
**Solution:** Ensure brand name matches exactly (case-insensitive)
- Check for extra spaces
- Verify brand exists in system
- Use exact brand name from system

### Issue: "Category not found"
**Solution:** Category can be in Turkish or English
- Check spelling
- Verify category exists
- Use full category path if needed

### Issue: "SKU already exists" (Create)
**Solution:** SKUs must be unique
- Check if product already exists
- Use Update Products instead
- Or use different SKU

### Issue: "Product not found" (Update)
**Solution:** Product must exist to update
- Verify SKU is correct
- Check product wasn't deleted
- Use Create Products instead

### Issue: "Invalid number format"
**Solution:** Use proper number format
- Use decimal point (.) not comma (,)
- No currency symbols
- No thousand separators

### Issue: "Status validation error"
**Solution:** Status values must be exact
- Use: draft, pending, or complete
- All lowercase
- No extra spaces

## Security & Permissions

### Access Control
- **Permission Required**: products.edit
- **Standard Users**: Can create/update their own products
- **Admins**: Full access to all bulk operations

### Status Restrictions
- **Standard Users**: Cannot set status to "complete" directly
- **Admins**: Can set any status including "complete"

### Audit Trail
All bulk operations are tracked:
- User who performed operation
- Timestamp
- Number of records affected
- Success/failure details

## Advanced Features

### Future Enhancements
1. **Progress Bar**: Real-time progress during processing
2. **Scheduled Imports**: Schedule bulk operations
3. **Rollback**: Undo bulk operations
4. **Duplicate Detection**: Smart SKU matching
5. **Image Upload**: Bulk upload product images
6. **Attribute Updates**: Update custom attributes
7. **Export**: Export products to CSV
8. **History**: View past bulk operations

### Integration Points
- Can be integrated with external systems
- API endpoint for programmatic uploads
- Webhook notifications for completion
- Error logs for debugging

## Troubleshooting

### File Won't Upload
1. Check file format (.csv or .txt)
2. Check file size (< 10MB)
3. Ensure file has content
4. Try different browser

### All Rows Failing
1. Check template format matches
2. Verify column names are correct
3. Check delimiter (comma vs semicolon)
4. Open CSV in text editor to check encoding

### Slow Processing
1. Reduce batch size
2. Check system resources
3. Process during off-peak hours
4. Contact administrator if persistent

### Unexpected Results
1. Review CSV data before upload
2. Check validation warnings
3. Test with small batch first
4. Contact support with CSV file

## Technical Details

### File Parsing
- Delimiter: Auto-detected (comma or semicolon)
- Encoding: UTF-8
- Quote handling: Supports quoted fields with embedded delimiters
- Line endings: CRLF, LF, or CR

### CSV Structure
```javascript
// Header row
"Column1","Column2","Column3"

// Data rows
"Value1","Value2","Value3"
"Value4","Value5","Value6"
```

### Error Response Format
```javascript
{
  success: number,
  failed: number,
  errors: string[],
  warnings: string[]
}
```

## Support

### Getting Help
1. Review this documentation
2. Check Common Issues section
3. Contact system administrator
4. Submit support ticket with:
   - CSV file (anonymized)
   - Error messages
   - Screenshots
   - Number of records

### Feedback
We welcome feedback on:
- Feature requests
- Usability improvements
- Template enhancements
- Additional bulk operations

## Summary

The Bulk Actions feature provides:
- ✅ Fast product management at scale
- ✅ Reduced manual data entry
- ✅ Built-in validation
- ✅ Detailed error reporting
- ✅ Support for multiple operations
- ✅ User-friendly templates
- ✅ Audit trail for compliance

Perfect for:
- Initial catalog setup
- Regular updates
- Seasonal changes
- Data migrations
- Inventory management

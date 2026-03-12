# Three-Tier Product Status Workflow

## Overview
The product status system now includes three tiers: **Draft**, **Pending Review**, and **Complete**. This creates a structured workflow where standard users can prepare products and submit them for review, while only administrators can approve them as complete.

## Status Types

### 1. Draft 🟡
- **Accessible to**: All users
- **Purpose**: Work-in-progress products that may be incomplete
- **Badge Color**: Yellow/Warning
- **Description**: Products under development, editing, or not yet ready for review

### 2. Pending Review 🔵
- **Accessible to**: All users (to set), Admins (to manage)
- **Purpose**: Products ready for admin review and approval
- **Badge Color**: Blue
- **Description**: Complete products awaiting administrator approval
- **Requirements**: All required fields must be filled (same as Complete)

### 3. Complete ✅
- **Accessible to**: Admins only
- **Purpose**: Approved products ready for use
- **Badge Color**: Green/Success
- **Description**: Fully approved products that meet all requirements

## Role-Based Permissions

### Standard Users Can:
- ✅ Create products in Draft status
- ✅ Edit Draft products
- ✅ Submit Draft products for review (set to Pending)
- ✅ Revert their own Pending products back to Draft
- ❌ **Cannot** mark products as Complete
- ❌ **Cannot** change Complete products (must contact admin)

### Administrators Can:
- ✅ All standard user permissions
- ✅ Approve Pending products (set to Complete)
- ✅ Return Pending products to Draft (with feedback)
- ✅ Mark products as Complete directly
- ✅ Change Complete products to Pending or Draft
- ✅ Full control over all status transitions

## Workflow

### Standard User Workflow
```
1. Create Product → Draft
2. Fill in all required fields
3. Submit for Review → Pending
4. Wait for Admin approval
5. (Optional) If feedback needed → Revert to Draft
```

### Admin Workflow
```
1. Review Pending products
2. Check all fields and quality
3. Options:
   a. Approve → Complete (product is ready)
   b. Return to Draft → provide feedback
   c. Keep as Pending → request more information
```

## User Interface Changes

### Product Form Page

#### For Standard Users:
- Status dropdown shows:
  - Draft
  - Pending Review
  - ~~Complete~~ (hidden)
- Info message: "Set to 'Pending Review' when ready. Admins will review and mark as Complete."
- Cannot save as Complete status

#### For Administrators:
- Status dropdown shows all three options:
  - Draft
  - Pending Review
  - Complete
- Full control over status selection

### Product Detail Page

#### Status Badge:
- **Draft**: Yellow badge with "Draft" label
- **Pending**: Blue badge with "Pending Review" label  
- **Complete**: Green badge with "Complete" label

#### Status Actions (Standard User):

**When Draft:**
- Button: "Submit for Review" (changes to Pending)

**When Pending:**
- Button: "Revert to Draft"
- Note: Cannot change Complete products

**When Complete:**
- Message: "Contact an admin to change status"

#### Status Actions (Administrator):

**When Draft:**
- Button: "Approve as Complete" (direct to Complete)
- Button: "Submit for Review" (to Pending)

**When Pending:**
- Button: "Approve" (changes to Complete)
- Button: "Return to Draft"

**When Complete:**
- Button: "Move to Pending"
- Button: "Revert to Draft"

### Products List Page

#### Filter Options:
- All
- Draft
- Pending Review
- Complete

#### Sort by Status:
Products sort in this order:
1. Complete (0)
2. Pending Review (1)
3. Draft (2)

## Validation Rules

### To Set Status to "Pending" or "Complete":
Products must have:
- ✅ SKU (unique)
- ✅ Product Name (in default language)
- ✅ Brand
- ✅ Category
- ✅ Description (in default language)
- ✅ All required category attributes

**Note**: Draft products can be saved without these requirements.

## Notifications & Visibility

### Admin Dashboard (Future Enhancement)
Consider adding:
- Counter badge for pending products
- Quick link to pending products list
- Email notifications when products are submitted for review

### Status Change History
All status changes are tracked via:
- `updatedAt` timestamp
- `updatedBy` user ID
- Can be viewed in product history tab

## Business Benefits

### For Standard Users:
- Clear submission process
- No confusion about incomplete products
- Can continue working without admin approval for drafts

### For Administrators:
- Quality control checkpoint
- Clear queue of products needing review
- Ability to return products for corrections
- Better oversight of product catalog

### For Organization:
- Improved product quality
- Audit trail of approvals
- Reduced errors in published products
- Clear separation of responsibilities

## Use Cases

### Use Case 1: New Product Creation
1. User creates product → Status: Draft
2. User fills in all information
3. User clicks "Submit for Review" → Status: Pending
4. Admin reviews and approves → Status: Complete

### Use Case 2: Product Needs Corrections
1. Product is Pending
2. Admin reviews and finds issues
3. Admin clicks "Return to Draft"
4. Admin provides feedback to user
5. User makes corrections
6. User resubmits → Status: Pending
7. Admin approves → Status: Complete

### Use Case 3: Update Complete Product
1. Admin needs to update a Complete product
2. Admin clicks "Revert to Draft" or "Move to Pending"
3. Admin makes changes
4. Admin marks as Complete again

### Use Case 4: Emergency Admin Approval
1. Urgent product needed immediately
2. Admin has permission to mark as Complete directly
3. Admin skips Pending status (optional workflow)

## Technical Implementation

### Type Definition
```typescript
export type ProductStatus = 'draft' | 'pending' | 'complete';
```

### Permission Check
```typescript
const isAdmin = currentUser?.role === 'admin';
```

### Status Change Validation
```typescript
// Standard users cannot set to Complete
if (!isAdmin && newStatus === 'complete') {
  // Show error
  return;
}

// Validate required fields for Pending/Complete
if (newStatus === 'complete' || newStatus === 'pending') {
  // Check all required fields
}
```

### Badge Display
```typescript
className={`badge ${
  product.status === 'complete' 
    ? 'badge-success' 
    : product.status === 'pending'
    ? 'bg-blue-100 text-blue-700'
    : 'badge-warning'
}`}
```

## Migration Notes

### For Existing Products:
- All existing products retain their current status (Draft or Complete)
- No automatic migration needed
- Standard users cannot change Complete products (must contact admin)

### For Users:
- Standard users will see new "Pending Review" option
- Clear messaging explains the workflow
- Complete option hidden from standard users

## Future Enhancements

### Suggested Features:
1. **Comment System**: Allow admins to leave feedback when returning to draft
2. **Notification System**: Email/in-app notifications for status changes
3. **Pending Dashboard**: Dedicated page for admins to review pending products
4. **Approval History**: Detailed log of who approved what and when
5. **Bulk Approval**: Admin ability to approve multiple pending products at once
6. **Auto-Submit**: Optional setting to auto-submit when all required fields are filled
7. **Approval Checklist**: Custom checklist for admins to verify before approving
8. **Rejection Reasons**: Predefined reasons when returning to draft

## Testing Checklist

- [x] Standard user cannot select Complete status in form
- [x] Standard user can submit for review (Pending)
- [x] Standard user can revert Pending to Draft
- [x] Standard user cannot change Complete products
- [x] Admin can select all three statuses
- [x] Admin can approve Pending products
- [x] Admin can return Pending to Draft
- [x] Admin can modify Complete products
- [x] Status badges show correct colors
- [x] Status filter includes Pending option
- [x] Validation works for Pending status
- [x] Sort by status orders correctly

## Support & Documentation

### Error Messages:
- "Only administrators can mark products as Complete. Set to Pending for admin review."
- "Cannot set status to 'Pending'. Missing required fields: [list]"
- "Contact an admin to change status" (for standard users viewing Complete products)

### Help Text:
- "Set to 'Pending Review' when ready. Admins will review and mark as Complete."
- Status descriptions shown in UI tooltips and labels

## Summary

The three-tier status system provides:
✅ Clear workflow for product approval
✅ Quality control for product catalog  
✅ Role-based access control
✅ Better collaboration between users and admins
✅ Audit trail of product approvals
✅ Reduced errors in published products

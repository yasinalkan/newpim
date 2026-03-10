# Product Hub - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 3. Login

Use one of these demo accounts:

**Admin Account:**
- Email: `admin@vakko.com`
- Password: `admin123`
- Has full access to all features

**Standard User Account:**
- Email: `user@vakko.com`
- Password: `user123`
- Has limited permissions (customizable by admin)

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout wrapper
│   ├── Sidebar.tsx     # Navigation sidebar
│   └── Header.tsx      # Top header with user menu
├── contexts/           # React Context providers
│   ├── AuthContext.tsx # Authentication & user management
│   ├── DataContext.tsx # Data store & CRUD operations
│   └── LanguageContext.tsx # Multi-language support
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProductsPage.tsx
│   ├── ProductDetailPage.tsx
│   ├── ProductFormPage.tsx
│   ├── CategoriesPage.tsx
│   ├── AttributesPage.tsx
│   ├── AssetsPage.tsx
│   ├── UsersPage.tsx
│   └── SettingsPage.tsx
├── types/              # TypeScript type definitions
│   └── index.ts
├── utils/              # Utility functions
│   └── translations.ts # Multi-language translations
├── data/               # Mock data
│   └── mockData.ts
├── App.tsx             # Main app component with routing
├── main.tsx            # App entry point
└── index.css           # Global styles
```

## Features

### 🔐 Authentication & User Management
- Two user roles: Admin and Standard User
- Admin: Fixed permissions (full access)
- Standard User: Customizable permissions
- User switching for testing (Admin only)
- Session persistence

### 📦 Product Management
- Complete CRUD operations
- Multi-language support (Turkish & English)
- Product variants support
- Advanced search and filtering
- Product status management (draft/complete)
- SKU management with uniqueness validation
- Category-specific attributes
- Image management
- Stock and price management

### 🗂️ Category Management
- Hierarchical category tree
- Multi-language category names
- Drag and expand/collapse functionality
- Product count per category
- Category picker component
- Channel category mapping support

### 🏷️ Attribute Management
- Flexible attribute types (text, number, select, etc.)
- Category-specific attribute assignment
- Required/optional attributes
- Channel attribute mapping
- Attribute value mapping for channels

### 🖼️ Asset Management
- Centralized media library
- Support for images, videos, and files
- Grid and list view modes
- Asset search and filtering by type
- Folder organization
- Tag management
- Usage tracking
- File size display

### 👥 User Management (Admin Only)
- User CRUD operations
- Role assignment (Admin/Standard User)
- Permission management
  - View: Can view content
  - Edit: Can edit content
  - Update: Can update (status, stock, etc.)
  - Page Access: Can access specific pages
- Permission matrix per page/feature

### ⚙️ Settings (Admin Only)
- System preferences
- Validation rules configuration
- Multi-language settings
- Asset upload limits
- Product validation rules

### 🌍 Multi-Language Support
- Turkish (TR) - Primary
- English (EN) - Secondary
- Language switcher in header
- All product data supports both languages
- UI translations for all text
- Fallback to primary language

### 🎨 Modern UI/UX
- Clean, professional design
- Tailwind CSS styling
- Responsive layout (desktop/tablet)
- Icon system (Lucide React)
- Consistent color scheme (Green primary)
- Smooth transitions and animations
- Loading states and feedback

## Technology Stack

- **Frontend Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM v6
- **Icons:** Lucide React
- **Build Tool:** Vite
- **Date Handling:** date-fns
- **State Management:** React Context API
- **Data Storage:** LocalStorage (mock backend)

## Key Concepts

### Data Storage
All data is stored in browser localStorage for persistence:
- Products, categories, attributes
- Assets and folders
- User accounts and settings
- Language preferences
- Authentication state

### Permissions System
- **Admin Users:** Fixed, identical permissions for all admins
- **Standard Users:** Customizable permissions per user
- Four permission types: View, Edit, Update, Page Access
- Granular control per page/feature

### Multi-Language Data
Product data supports both languages:
```typescript
{
  name: {
    tr: "Ürün Adı",
    en: "Product Name"
  }
}
```

### Channel Mapping (Architecture)
- Master categories and attributes used internally
- Channel-specific mappings for multi-channel publishing
- Value translations for different channels
- One-to-one category mapping per channel
- One-to-many attribute mapping possible

## Available Scripts

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive design for desktop and tablet
- Mobile-friendly interface

## Tips

1. **Data Persistence:** All changes are saved to localStorage automatically
2. **Language Switching:** Use the language toggle in the header to switch between TR/EN
3. **User Switching:** Admins can switch to other users to test permissions
4. **Search & Filter:** All list pages support search and advanced filtering
5. **Keyboard Navigation:** Forms support tab navigation and enter to submit
6. **Reset Data:** Clear browser localStorage to reset all data to initial state

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically try the next available port.

### Build Errors
Make sure all dependencies are installed:
```bash
rm -rf node_modules
npm install
```

### LocalStorage Full
Clear browser data if you encounter storage limits:
```javascript
localStorage.clear()
```

## Future Enhancements

Based on the PRDs, the system architecture supports:
- Real backend integration (API)
- Product variants (sizes, colors) - structure ready
- Bulk operations (import/export)
- Advanced workflows
- Real-time notifications
- Asset CDN integration
- Channel publishing
- Analytics and reporting

## Support

For issues or questions, refer to:
- PRD documents in `/docs/PRDs/`
- README.md in project root
- Inline code comments

---

**Product Hub PIM System** v1.0  
Built for Vakko - Product Information Management


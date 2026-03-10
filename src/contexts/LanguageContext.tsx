import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useData } from './DataContext';
import type { MultiLangText, Language as LanguageType } from '../types';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  getText: (text: MultiLangText | string) => string;
  isTranslationIncomplete: (text: MultiLangText, requiredLanguages?: string[]) => boolean;
  availableLanguages: LanguageType[];
  activeLanguages: LanguageType[];
  defaultLanguage: LanguageType | undefined;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translation dictionary (can be expanded)
const translations: Record<string, Record<Language, string>> = {
  'product.name': { tr: 'Ürün Adı', en: 'Product Name' },
  'product.description': { tr: 'Açıklama', en: 'Description' },
  'product.keywords': { tr: 'Anahtar Kelimeler', en: 'Keywords' },
  'save': { tr: 'Kaydet', en: 'Save' },
  'cancel': { tr: 'İptal', en: 'Cancel' },
  'delete': { tr: 'Sil', en: 'Delete' },
  'edit': { tr: 'Düzenle', en: 'Edit' },
  'create': { tr: 'Oluştur', en: 'Create' },
  'search': { tr: 'Ara', en: 'Search' },
  'filter': { tr: 'Filtrele', en: 'Filter' },
  // Common translations
  'common.save': { tr: 'Kaydet', en: 'Save' },
  'common.cancel': { tr: 'İptal', en: 'Cancel' },
  'common.delete': { tr: 'Sil', en: 'Delete' },
  'common.edit': { tr: 'Düzenle', en: 'Edit' },
  'common.view': { tr: 'Görüntüle', en: 'View' },
  'common.clear': { tr: 'Temizle', en: 'Clear' },
  'common.all': { tr: 'Tümü', en: 'All' },
  'common.name': { tr: 'İsim', en: 'Name' },
  'common.description': { tr: 'Açıklama', en: 'Description' },
  'common.filter': { tr: 'Filtrele', en: 'Filter' },
  'common.actions': { tr: 'İşlemler', en: 'Actions' },
  // Products translations
  'products.create': { tr: 'Yeni Ürün', en: 'New Product' },
  'products.edit': { tr: 'Ürünü Düzenle', en: 'Edit Product' },
  'products.sku': { tr: 'SKU', en: 'SKU' },
  'products.brand': { tr: 'Marka', en: 'Brand' },
  'products.category': { tr: 'Kategori', en: 'Category' },
  'products.status': { tr: 'Durum', en: 'Status' },
  'products.stock': { tr: 'Stok', en: 'Stock' },
  'products.price': { tr: 'Fiyat', en: 'Price' },
  'products.draft': { tr: 'Taslak', en: 'Draft' },
  'products.complete': { tr: 'Tamamlandı', en: 'Complete' },
  'products.bulkDelete': { tr: 'Toplu Sil', en: 'Bulk Delete' },
  'products.markComplete': { tr: 'Tamamlandı Olarak İşaretle', en: 'Mark as Complete' },
  'products.markDraft': { tr: 'Taslak Olarak İşaretle', en: 'Mark as Draft' },
  'products.updatePrice': { tr: 'Fiyat Güncelle', en: 'Update Price' },
  'products.updateStock': { tr: 'Stok Güncelle', en: 'Update Stock' },
  'products.bulkImport': { tr: 'Toplu İçe Aktar', en: 'Bulk Import' },
  'products.searchPlaceholder': { tr: 'Ürün ara...', en: 'Search products...' },
  'products.deleteConfirm': { tr: 'Bu ürünü silmek istediğinizden emin misiniz?', en: 'Are you sure you want to delete this product?' },
  'products.noProducts': { tr: 'Ürün bulunamadı', en: 'No products found' },
  'products.model': { tr: 'Model', en: 'Model' },
  'products.images': { tr: 'Görseller', en: 'Images' },
  'products.keywords': { tr: 'Anahtar Kelimeler', en: 'Keywords' },
  'products.variants': { tr: 'Varyantlar', en: 'Variants' },
  'products.attributes': { tr: 'Özellikler', en: 'Attributes' },
  // Categories translations
  'categories.create': { tr: 'Alt Kategori Oluştur', en: 'Create Subcategory' },
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { settings } = useData();
  const languages = settings.languages || [];
  const activeLanguages = languages.filter(lang => lang.isActive);
  const defaultLanguage = languages.find(lang => lang.isDefault);

  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('language');
    if (saved && activeLanguages.some(lang => lang.code === saved)) {
      return saved;
    }
    return defaultLanguage?.code || 'en';
  });

  useEffect(() => {
    // Save language preference
    localStorage.setItem('language', language);
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    if (activeLanguages.some(l => l.code === lang)) {
      setLanguageState(lang);
    }
  }, [activeLanguages]);

  const t = useCallback((key: string): string => {
    // Return translation based on current language
    // Fall back to English if translation not found
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  }, [language]);

  const getText = useCallback((text: MultiLangText | string): string => {
    if (typeof text === 'string') {
      return text;
    }
    
    // Return text in current language, fallback to default language, then any available language
    return text[language] || 
           (defaultLanguage ? text[defaultLanguage.code] : '') || 
           Object.values(text).find(val => val) || 
           '';
  }, [language, defaultLanguage]);

  const isTranslationIncomplete = useCallback((text: MultiLangText, requiredLanguages?: string[]): boolean => {
    const requiredLangs = requiredLanguages || activeLanguages.map(lang => lang.code);
    return requiredLangs.some(lang => !text[lang] || text[lang].trim() === '');
  }, [activeLanguages]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getText,
        isTranslationIncomplete,
        availableLanguages: languages,
        activeLanguages,
        defaultLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};


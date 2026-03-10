# PIM Uygulaması - README

Modern bir Ürün Bilgi Yönetim (PIM) sistemi.

## 🎉 Server Olmadan Kullanım!

Bu uygulama **hiçbir server gerektirmeden** çalışır. Sadece index.html dosyasına çift tıklayın!

### Hızlı Başlangıç

#### 1. Build (Tek Seferlik)
```bash
npm install
npm run build
```

#### 2. Kullanım (Server Yok!)
**Windows:**
```bash
build.bat
```

**Mac/Linux:**
```bash
./build.sh
```

Veya manuel olarak:
1. `dist` klasörüne gidin
2. `index.html` dosyasına **çift tıklayın**
3. Uygulama tarayıcıda açılır! ✨

📖 Detaylı bilgi için: [KULLANIM.md](KULLANIM.md)

---

## ✨ Özellikler

✅ **Server yok** - Hiçbir server gerekmiyor!
✅ **npm yok** - Build'den sonra npm'e gerek yok
✅ **Python yok** - Python bile gerekmiyor
✅ **Çift tıkla çalışır** - index.html'i açın, kullanın!
✅ **Taşınabilir** - dist klasörünü istediğiniz yere kopyalayın
✅ **Offline** - İnternet gerektirmez

---

## 📁 Proje Yapısı

```
newpim/
├── dist/              # Build çıktısı (bunu kullanın!)
│   ├── index.html     # Bunu açın!
│   └── assets/
├── src/               # Kaynak kod
├── build.bat          # Windows build script
├── build.sh           # Mac/Linux build script
└── KULLANIM.md        # Türkçe kullanım kılavuzu
```

---

## 🔧 Geliştirme

Aktif geliştirme için:
```bash
npm run dev
```

---

## 📦 Build

Production build:
```bash
npm run build
```

Build sonrası `dist/index.html` dosyasını açın.

---

## 🌐 Deployment

`dist` klasörünü:
- USB'ye kopyalayın
- Email ile paylaşın
- Cloud'a yükleyin
- Statik hosting'e deploy edin
- Veya sadece yerel olarak kullanın!

---

## 🛠️ Teknolojiler

- React 18
- TypeScript
- React Router (Hash mode)
- Tailwind CSS
- Vite

---

## 📚 Dökümanlar

- [KULLANIM.md](KULLANIM.md) - Türkçe kullanım kılavuzu
- [QUICK_START.md](QUICK_START.md) - English quick start
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Development guide

---

## 📝 Lisans

Özel - Tüm hakları saklıdır


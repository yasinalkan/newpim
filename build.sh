#!/bin/bash

echo "============================================================"
echo "  PIM Uygulaması - Build Script"
echo "============================================================"
echo ""
echo "Build yapılıyor..."
echo ""

npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================================"
    echo "  Build BAŞARILI!"
    echo "============================================================"
    echo ""
    echo "Şimdi uygulamayı açmak için:"
    echo "  1. dist klasörüne gidin"
    echo "  2. index.html dosyasına çift tıklayın"
    echo ""
    echo "Veya otomatik olarak açmak için ENTER'a basın..."
    echo "============================================================"
    read -p ""
    
    # Try to open in default browser
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open dist/index.html
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        xdg-open dist/index.html
    fi
else
    echo ""
    echo "============================================================"
    echo "  Build HATASI!"
    echo "============================================================"
    echo ""
    echo "Lütfen npm install komutunu çalıştırdığınızdan emin olun."
    echo ""
    read -p "Devam etmek için ENTER'a basın..."
fi

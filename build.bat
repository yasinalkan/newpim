@echo off
echo ============================================================
echo   PIM Uygulamasi - Build Script
echo ============================================================
echo.
echo Build yapiliyor...
echo.

call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================
    echo   Build BASARILI!
    echo ============================================================
    echo.
    echo Simdi uygulamayi acmak icin:
    echo   1. dist klasorune gidin
    echo   2. index.html dosyasina cift tiklayin
    echo.
    echo Veya otomatik olarak acmak icin ENTER'a basin...
    echo ============================================================
    pause
    start dist\index.html
) else (
    echo.
    echo ============================================================
    echo   Build HATASI!
    echo ============================================================
    echo.
    echo Lutfen npm install komutunu calistirdiginizdan emin olun.
    echo.
    pause
)

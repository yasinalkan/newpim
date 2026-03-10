# Quick Start Guide - No npm Required (After First Build)

This guide shows how to run the PIM application **without npm** after the initial build.

## One-Time Setup (Requires npm)

You only need to do this **once** to create the production build:

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Build the production version (first time only)
npm run build
```

This creates a `dist` folder with all the optimized files.

---

## Running Without npm (After Build)

Once you've built the application, you can run it **without npm** using Python (which comes pre-installed on Mac/Linux).

### Option 1: Using the Python Script (Recommended)

**On Mac/Linux:**
```bash
./serve.sh
```

**On Windows:**
```bash
serve.bat
```

**Or use Python directly:**
```bash
python3 serve.py
```

Then open your browser to: **http://localhost:3000**

### Option 2: Using Python Directly

**On Mac/Linux:**
```bash
python3 -m http.server 3000 --directory dist
```

**On Windows:**
```bash
python -m http.server 3000 --directory dist
```

### Option 3: Using Node's Built-in Server (if Node is installed)

```bash
npx serve dist -p 3000
```

---

## File Structure

After building, your directory will look like this:

```
newpim/
├── dist/              ← Production files (ready to deploy)
│   ├── index.html
│   ├── assets/
│   └── ...
├── serve.py           ← Python server script (no npm!)
├── serve.sh           ← Unix/Mac script
├── serve.bat          ← Windows script
├── src/               ← Source code (only needed for development)
└── package.json       ← Only needed for building
```

---

## Deployment Options

The `dist` folder can be deployed to:

1. **Any static web host** (Netlify, Vercel, GitHub Pages)
2. **Apache/Nginx** web server
3. **Cloud storage** (AWS S3, Google Cloud Storage)
4. **Local web server** (using the scripts above)

Just copy the `dist` folder contents to your hosting location.

---

## When to Rebuild

You only need to rebuild (and thus need npm) when:
- You modify source code in the `src` folder
- You update dependencies
- You want to deploy new changes

Run `npm run build` again to update the `dist` folder.

---

## Troubleshooting

### "dist folder not found"
Run `npm run build` first to create the production files.

### Python not found (Windows)
Download Python from: https://www.python.org/downloads/
During installation, check "Add Python to PATH"

### Port 3000 already in use
Change the PORT in the serve scripts to another number (e.g., 3001, 8080)

---

## Summary

✅ **Build once** with npm: `npm run build`
✅ **Run forever** without npm: `./serve.sh` or `python3 serve.py`
✅ **Deploy anywhere** - just copy the `dist` folder

No npm needed after the initial build! 🎉

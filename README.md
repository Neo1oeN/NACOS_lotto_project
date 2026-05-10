# NACOS Lottery System

A secure, full-stack lottery application built with React, Tailwind CSS, and Firebase.

## Features
- **Registration Number System**: Custom format `EU - CC - CCC - DD - NNN` with auto-hyphenation.
- **Role-Based Access Control**:
  - **User**: Upload receipts, view and download animated lottery tickets, see global pool.
  - **Admin**: Verify receipts, manage bank details, override pool totals, and edit UI texts without code.
- **Modern UI**: Dark green theme with gold accents, smooth animations, and responsive card-based layout.
- **Secure Backend**: Hardened Firestore rules with master-gate pattern and ABAC logic.

## Security
- **Identity**: Users log in using their Registration Number and a self-set password.
- **Integrity**: Admin verification is required for all lottery ticket generation.
- **Validation**: All writes are strictly validated in Firestore Security Rules.
- **Storage**: Receipts are stored securely in Firebase Storage with restricted access.

## Manual Setup (If migrating)
1. **Firebase Configuration**: Ensure `firebase-applet-config.json` is present in the root.
2. **Admin Bootstrap**: The first user to register with `EU - AD - ADM - 01 - 001` becomes the super-admin.
3. **Environment Variables**: `GEMINI_API_KEY` is required for any AI-enhanced features (if applicable).

## Deployment
This app is ready for Cloud Run. Static files are generated in `dist/` and served via Vite.

## Tech Stack
- Frontend: React 19, Vite, Tailwind CSS 4, Motion (Animations), Lucide-react.
- Backend: Firebase Auth, Firestore, Cloud Storage.
- Utils: `html-to-image` for ticket downloads, `canvas-confetti` for celebrations.

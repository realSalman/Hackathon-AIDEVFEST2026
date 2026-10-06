# Tender Document Package Builder - AI DevFest 2026

## 1. Background
When organizations invite companies to compete for a tender, bidders must submit a specific set of required documents such as trade licenses, TIN and VAT certificates, bank solvency letters, experience certificates, and technical/financial proposals. Preparing this package manually is prone to errors like missing, expired, duplicated, or misplaced documents, which can lead to bid rejection.

This web application helps office staff seamlessly turn a set of PDF files into a complete, correctly ordered, and verified PDF package ready for submission.

## 2. Features

### Core Functionality (Main Tasks)
- **Requirements Loading:** Load tender requirements via `requirements.json` and display the required documents in order.
- **File Uploading:** Support for bulk uploading PDF files, automatically detecting page counts and rejecting non-PDF files.
- **Document Matching:** Easily match each uploaded file to a required document. Ensures one file per requirement and vice-versa.
- **Expiry Date Management:** For documents requiring validity checks (`has_expiry: true`), easily enter expiry dates.
- **Real-Time Validation:** Instantly updates document statuses to indicate if it's Missing, Expiry date needed, Expired, Not provided, or OK based on the tender's `submission_deadline`.
- **Duplicate Detection:** Identifies uploaded files with identical content to prevent accidental duplicate assignments.
- **PDF Generation:** Once all blocking issues are resolved, generate a unified PDF package comprising:
  - An English Cover Page containing tender details and a list of included documents.
  - The ordered document pages following the cover.
  - Custom footers with `<tender_id> | Page X of Y` on every page.
- **Bilingual Support:** Fully toggleable interface between English and Bangla.

### Bonus Tasks (Planned/Implemented)
- Index page generated after the cover page, showing the starting page number for each document.
- Custom Seal/Signature placement capability.
- Export checklist as Excel/CSV.
- Session persistence (Save/reopen workspace state).
- Bangla text support in the generated PDF cover and index pages.
- Auto-matching of files based on filenames.
- Graceful handling of corrupted or password-protected PDFs.
- AI Assistance integration for an enhanced user experience.

## 3. Technology Stack
- **Frontend Framework:** React + Vite
- **PDF Manipulation:** `pdf-lib` (for generating the final combined PDF, adding covers, and footers).
- **PDF Rendering/Analysis:** `pdf.js` / `pdfjs-dist` (for counting pages, detecting text, and verifying files).
- **Styling:** CSS/TailwindCSS.

## 4. Setup and Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## 5. Usage Guidelines

1. **Load Requirements:** Provide the `requirements.json` file.
2. **Upload Documents:** Upload your PDF files.
3. **Match & Validate:** Match uploaded files to their respective requirements. Enter expiry dates where required.
4. **Generate Package:** Once all requirements show a green "OK" or "Not provided" (for optional docs) status, click the "Generate Package" button.
5. **Download:** Download your finalized `<tender_id>_Package.pdf`.

## 6. Constraints & Rules
- **Frontend Only:** No files are uploaded to any server. Everything is processed locally in your browser ensuring complete privacy and security.
- **Max Input:** Supported up to 30 PDF files and 50 MB total file size limit.
- **Browser Compatibility:** Designed for the latest version of Google Chrome.

# Tender Document Packager

## Overview
When organizations invite companies to compete for a tender, bidders must submit a specific set of required documents such as trade licenses, TIN and VAT certificates, bank solvency letters, experience certificates, and technical/financial proposals. Preparing this package manually is prone to errors like missing, expired, duplicated, or misplaced documents, which can lead to bid rejection.

This web application helps users seamlessly turn a set of PDF files into a complete, correctly ordered, and verified PDF package ready for submission.

## Features

- **Requirements Loading:** Load tender requirements via a `requirements.json` file.
- **Bulk PDF Upload:** Support for bulk uploading PDF files with automatic validation.
- **Document Matching:** Match uploaded files to required documents. Supports auto-matching based on filenames and AI-assisted matching.
- **Validation & Expiry:** Real-time validation for missing or expired documents based on the tender's submission deadline.
- **Duplicate Detection:** Identifies uploaded files with identical content to prevent accidental duplicate assignments.
- **PDF Generation:** Generates a unified PDF package including:
  - A cover page with tender details and an index.
  - Ordered document pages.
  - Custom footers (`<tender_id> | Page X of Y`).
  - Custom seal/signature placement.
- **Bilingual Interface:** Toggle between English and Bangla.
- **Session Persistence:** Save and reopen workspace state.
- **Export:** Export the document checklist as CSV.

## Technology Stack
- **Frontend Framework:** React + Vite
- **PDF Manipulation:** `pdf-lib`
- **Styling:** Vanilla CSS

## Setup and Installation

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

## Usage Guidelines

1. **Load Requirements:** Upload the `requirements.json` file.
2. **Upload Documents:** Upload the required PDF files.
3. **Match & Validate:** Match uploaded files to their respective requirements. Enter expiry dates where required. Use auto-match or AI-match to speed up the process.
4. **Generate Package:** Once all requirements are fulfilled, click the "Generate Package" button.
5. **Download:** Download the finalized `<tender_id>_Package.pdf`.

## Constraints
- **Local Processing:** No files are uploaded to any server. Everything is processed locally in the browser (except for AI-assisted matching which requires an API key for the LLM provider).
- **Limits:** Supports up to 30 PDF files and 50 MB total file size.

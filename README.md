# 📋 Portal Data Jabatan Fungsional Kebencanaan (Disaster Management Functional Position Data Portal)

[![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=flat&logo=google&logoColor=white)](https://developers.google.com/apps-script)
[![Bootstrap 5](https://img.shields.io/badge/Bootstrap-5.3.0-7952B3?style=flat&logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![DataTables](https://img.shields.io/badge/DataTables-1.13.4-0075FF?style=flat)](https://datatables.net/)
[![Platform](https://img.shields.io/badge/Platform-Web%20App-success)](#)

A centralized web-based management, reporting, and analytics portal designed for managing civil servant staffing records (**PNS** & **PPPK**) within the **Disaster Management Functional Position** (_Jabatan Fungsional Kebencanaan_ - BNPB / Regional Disaster Management Agencies).

Built on top of **Google Apps Script (GAS)**, **Google Sheets** as a database backend, and **Google Drive** for document storage, this application provides an enterprise-ready dashboard, granular data filtration, cross-tabulation matrices, admin management workflows, and export capabilities.

---

## 🌟 Key Features

### 1. 📊 Analytics Dashboard

- **Embedded Looker Studio Integration**: Real-time visual reporting for macro-level staffing metrics and distribution.
- **Adaptive Layout**: Dynamically switches between optimized desktop and mobile reports.

### 2. 👥 Personnel Data Directory (PNS & PPPK)

- **Tabbed Management**: Seamlessly switch between Permanent Civil Servants (**PNS**) and Government Employees with Work Agreements (**PPPK**).
- **Multi-Parameter Instant Filtering**: Filter personnel records simultaneously by:
  - Employee Name / NIP
  - Rank & Grade (_Golongan / Pangkat_)
  - Regional Jurisdiction (_Provinsi / Wilayah_)
  - Functional Position Title (_Jabatan_)
  - Work Unit (_Unit Kerja_)
- **Interactive DataTables**: Column sorting, pagination, and quick modal previews of profile information and uploaded cloud documents (appointment letters, rank certificates, education diplomas, etc.).

### 3. 📑 Data Recapitulation & Cross-Tabulation Matrices

- **Formation & Fulfillment Status (_Keterisian Formasi Daerah_)**: Tracks staffing needs (_Kebutuhan_) vs. actual fulfillment (_Bezetting_) across position tiers (_Ahli Pertama_, _Ahli Muda_, _Ahli Madya_).
- **Work Unit Distribution (_Sebaran Unit Kerja_)**: Matrix view of PNS and PPPK numbers per division or BPBD unit.
- **Position & Regional Matrices**: Breakdown of disaster management functional titles per region.
- **Grade & Rank Demographics**: Dedicated tables for PNS ranks and PPPK grade levels.
- **Gender Demographics**: Breakdown of personnel distribution by gender and employment status.
- **Interactive Drill-Down**: Clicking any metric opens a modal listing all corresponding individual personnel records.

### 4. 🔐 Admin Access & In-App Management

- **Role-Based Admin Mode**: Secure modal authentication for administrators.
- **Inline Status Management**: Admins can update personnel statuses directly (Active, Transferred, Retired, Duplicate Entry) with a confirmation dialog.
- **Form Edit Integration**: Modal dialog to update personnel attributes and review attached Google Drive verification links.

### 5. 📥 Excel Export Engine

- **Formatted Spreadsheet Generator**: Generates clean `.xlsx` reports with customized headers, cell borders, and colors using `xlsx-js-style`.
- **Flexible Scope Selection**: Download filtered records, specific work units, PNS/PPPK groups, or the complete database.

### 6. ➕ Intake Forms & Contact Center

- **Direct Intake Portals**: Fast-access links to official PNS and PPPK Google Forms for new personnel registrations.
- **Integrated Helpdesk**: Direct WhatsApp shortcuts and consultation hours for Pusbin JF Kebencanaan support.

---

## 🏗️ Architecture & Tech Stack

| Layer                   | Technologies Used                                                                          |
| :---------------------- | :----------------------------------------------------------------------------------------- |
| **Backend & Runtime**   | Google Apps Script (V8 Engine)                                                             |
| **Database**            | Google Sheets (`Data_PNS`, `Data_PPPK`, `Data_Double`)                                     |
| **Document Storage**    | Google Drive                                                                               |
| **Frontend Framework**  | HTML5, CSS3, JavaScript (ES6+), Bootstrap 5 (Zephyr Theme)                                 |
| **Libraries & Plugins** | jQuery, DataTables (with Buttons & Responsive), `xlsx-js-style`, FontAwesome 6, ApexCharts |
| **Local Development**   | Node.js (`dev-server.js` with mock `google.script.run` backend)                            |
| **CLI & Deployment**    | Google `@google/clasp`                                                                     |

---

## 🔒 Security & Data Privacy

- Access to administrative capabilities is password-protected.
- Personnel documents and records are stored within Google Workspace infrastructure following organizational permission policies.

---

## 📄 License

This project is maintained for the administrative and management needs of the **Pusat Pembinaan Jabatan Fungsional Kebencanaan - BNPB**.

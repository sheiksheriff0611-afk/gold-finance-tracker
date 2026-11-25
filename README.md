# GOLD FINANCE – EMPLOYEE TRACKER & COLLECTION MANAGEMENT SYSTEM

A complete, modern, responsive financial web application designed for gold finance companies. Sales executives visit customers, collect gold jewellery and cash amounts, and submit collection records. Admin and project coordinators monitor employee activities, GPS locations, and daily collections in real-time.

---

## Tech Stack
- **Frontend**: React.js 19, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet (OpenStreetMap), Recharts, Axios.
- **Backend**: Python 3.12, Django REST Framework, SimpleJWT, ReportLab, OpenPyXL, Pillow.
- **Database**: PostgreSQL support via `psycopg2-binary` (with auto-fallback to SQLite for immediate execution).
- **Styling**: Luxury dark navy blue (`#070c18`, `#0b1329`), metallic gold (`#d4af37`, `#eab308`), and white theme.

---

## System Architecture & Roles

### 1. Three Types of Login
- **ADMIN**: Full access to entire application, master collateral vault monitoring, employee hierarchy management, final collection approvals, and financial exports.
- **PROJECT COORDINATOR**: Access to assigned sales executives, field tracking, collection verification stage, and regional targets.
- **SALES EXECUTIVE**: Mobile-optimized field workspace, Start Work / End Work GPS shifts, doorstep customer visits, gold collection submissions with photo receipts, and cash collections.

### 2. Demo Credentials (One-Click Login on UI)
| Role | Username | Password | Notes |
|------|----------|----------|-------|
| **Admin** | `admin` | `admin123` | Full administrative control |
| **Project Coordinator** | `coordinator1` | `coord123` | Assigned to Region North |
| **Project Coordinator** | `coordinator2` | `coord123` | Assigned to Region South |
| **Sales Executive** | `executive1` | `exec123` | Assigned to coordinator1 |
| **Sales Executive** | `executive2` | `exec123` | Assigned to coordinator1 |
| **Sales Executive** | `executive3` | `exec123` | Assigned to coordinator2 |

---

## Key Modules Implemented

### 1. Admin & Coordinator Financial Dashboard
- **Metric Cards**: Total Staff, Active On Field, Total Gold Collected (grams), Total Cash Collected (₹), Today's Customer Visits, Pending Approvals, Top Performer.
- **Interactive Charts**:
  - Daily Gold Collections (7 days, Bar Chart in grams).
  - Daily Cash Collections (7 days, Area Chart in ₹ INR).
  - Monthly Collections breakdown (6 months).
- **Quota Achievement Matrix**: Real-time progress bars comparing gold and cash targets vs achievements.

### 2. Employee Management Hub
- Add, edit, and assign employees with auto-generated unique IDs (`ADM-xxxx`, `CRD-xxxx`, `EMP-xxxx`).
- Statuses: `Active`, `Inactive`, `On Leave`.
- Assign sales executives to dedicated project coordinators.
- View detailed individual employee profiles.

### 3. Consented GPS Tracking & Interactive Map
- Consented background & on-spot GPS telemetry: explicit **Start Work** and **End Work** shift toggles.
- Interactive OpenStreetMap (Leaflet) with customized pulsing status pins.
- Movement breadcrumbs trail showing historical route pings for any selected date.
- Clear indicator when GPS permission is disabled or location is unavailable.

### 4. Customer Visit Management
- Doorstep customer visit logging (Customer Name, Mobile, Address, Date & Time, GPS coords with 1-click Auto-Detect GPS).
- Purpose tracking: New Loan Inquiry, Gold Collection, Cash / EMI, Follow-up, Default Recovery, KYC Verification.

### 5. Gold Jewellery Collection
- Intake form: Customer particulars, Jewellery Type (Bangles, Necklace, Chain, Ring, etc.), Net Weight in Grams (3-decimal precision), Purity (18K, 20K, 22K, 24K), Auto-computed Estimated Market Value, Unique Receipt Number, Photos of Jewellery & Receipt, GPS coordinates.
- Unique receipt validation constraint preventing duplicates.
- Approved collection records are locked and immutable.

### 6. Cash Collection & Deposit Reconciliation
- Cash collection intake form: Amount (₹), Payment Mode (Cash Handover, UPI / QR, Bank Transfer, Cheque), Receipt Number, Photo Proof, GPS location.
- Multi-stage Deposit Reconciliation: `In Hand` → `Deposited at Branch` → `Bank Deposited` → `Reconciled` with bank UTR / challan reference number.

### 7. Multi-Tier Approval Workflow
- Process: Sales Executive Submission → Coordinator Verification → Admin Final Authorization.
- Rejection workflow requiring mandatory rejection remarks.
- Permanent audit log trail capturing every state change, actor, and timestamp.

### 8. Employee Target Management
- Set daily, weekly, and monthly gold targets (grams) and cash targets (₹).
- Visual achievement leaderboard and efficiency percentages.

### 9. Reports & Binary Exports
- 7 comprehensive reports:
  1. Daily Gold Collection Report
  2. Daily Cash Collection Report
  3. Employee-wise Collection Report
  4. GPS Visit History Report
  5. Monthly Performance Report
  6. Pending Approval Report
  7. Cash Deposit Reconciliation Report
- **Export to Excel (.xlsx)** generated with OpenPyXL with styled headers and currency formats.
- **Export to PDF (.pdf)** generated with ReportLab in landscape format.

---

## How to Run Locally

### Backend (Django REST Framework):
```bash
cd "backend"
.\venv\Scripts\activate
python manage.py runserver 127.0.0.1:8000
```

### Frontend (React Vite):
```bash
cd "frontend"
npm run dev -- --host 127.0.0.1 --port 5173
```
Open **`http://127.0.0.1:5174`** (or `5173`) in your web browser.


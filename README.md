# GoliOps & GoliInsights - Unified Management Platform

## 📌 Project Overview
This repository contains the integrated codebase for **GoliOps** (Inventory & Finance Management System) and **GoliInsights** (Business Analytics Dashboard). 

Built specifically for **Uday Food & Beverages**—a Goli Soda manufacturer and distributor based in Hyderabad—this unified web application replaces manual spreadsheet tracking. It provides a real-time view of stock levels, consolidates financial data, and translates raw metrics into visual charts to drive data-driven business decisions.

---

## 🚀 Key Features

### 📦 GoliOps (Inventory & Finance)
* **Stock Inventory Tracking:** Add SKUs, log stock IN (production/purchase) and OUT (dispatch/sales), and receive low-stock alerts.
* **Expense Management:** Log operational costs by category (Raw Materials, Packaging, Logistics, Overheads).
* **Sales & Revenue Tracking:** Record detailed sales (product, quantity, buyer, date) and monitor running revenue.
* **Profit & Loss Reports:** Automatically calculate Net Profit and export financial summaries to CSV or PDF.
* **Admin Dashboard:** Secure login access offering high-level overviews of stock health, monthly revenue, and expenses.

### 📊 GoliInsights (Business Analytics)
* **Revenue Trends:** Interactive line charts displaying revenue over time with period-over-period growth percentages.
* **Stock Movement Analysis:** Bar charts comparing stock IN vs OUT per SKU and heatmaps to identify product velocity.
* **Top-Selling SKUs:** Ranked lists and pie charts showing revenue share and units sold, filterable by date.
* **Expense vs Revenue Overview:** Side-by-side comparisons featuring gross profit trend lines and OPEX breakdowns.
* **Key Metrics Cards:** Quick-glance widgets for monthly revenue, expenses, net profit, units sold, and stock health %.

---

## 💻 Tech Stack

* **Frontend:** React.js
* **Data Visualization:** Recharts / Chart.js
* **Backend API:** Node.js with Express (REST API)
* **Database:** PostgreSQL
* **Authentication:** JWT (JSON Web Tokens)
* **Report Exports:** SheetJS (XLSX/CSV) & jsPDF

---

## ⚙️ Performance & Security
* **Optimised Performance:** Dashboard charts render within 3 seconds, even when processing 6 months of historical data.
* **Responsive Design:** Fully mobile-responsive interface optimized for tablet and desktop environments.
* **Secure Access:** All data endpoints and application routes are strictly protected via JWT authentication.

---

## 🛠️ Getting Started

### Prerequisites
* Node.js (v18 or higher recommended)
* PostgreSQL (v14 or higher)
* npm or yarn

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com
   cd goliops-goliinsights
   ```

2. **Database Setup**
   * Create a new PostgreSQL database named `goli_db`.
   * Run the database migration scripts located in `/server/db/schema.sql` to set up tables.

3. **Backend Setup**
   ```bash
   cd server
   npm install
   ```
   * Create a `.env` file in the `server` directory and add your variables:
     ```env
     PORT=5000
     DB_URI=postgresql://username:password@localhost:5403/goli_db
     JWT_SECRET=your_jwt_secret_key
     ```
   * Start the backend server:
     ```bash
     npm start
     ```

4. **Frontend Setup**
   ```bash
   cd ../client
   npm install
   ```
   * Create a `.env` file in the `client` directory:
     ```env
     REACT_APP_API_URL=http://localhost:5000/api
     ```
   * Start the frontend development server:
     ```bash
     npm start
     ```


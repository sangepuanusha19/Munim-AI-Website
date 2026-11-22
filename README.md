# MunimAI — Aapka Smart AI Munim

> **Legal, Cash-Flow & Tax Co-Pilot for Indian MSMEs**  
> One clear view of your business. A little more confidence in every next step.

[![Made for Indian MSMEs](https://shields.io)](#)
[![Location](https://shields.io)](#)
[![Status](https://shields.io)](#)

---

## Overview

Small and medium enterprises (MSMEs) in India frequently operate across fragmented spreadsheets, delayed buyer payments, complex GST reconciliations, and tight working-capital cycles. Critical statutory deadlines—such as the 45-day MSME payment protection window or monthly Input Tax Credit (ITC) matching—are often tracked manually, leading to cash-flow bottlenecks and avoidable penalties.

**MunimAI** (*"Aapka Smart AI Munim"*) solves this by serving as an intelligent financial, legal, and operational co-pilot purpose-built for Indian MSMEs. Inspired by the traditional trusted *Munim* (accountant and business advisor), the platform consolidates real-time cash visibility, Indian statutory safeguards, working-capital advisory, shop-floor unit economics, and tax compliance into a single, intuitive workspace—supported by plain-language AI guidance and multilingual audio briefings.

---

## Core Modules & How They Work

### 1. Business Overview (Real-Time Financial Pulse)
Provides business owners with an immediate, single-screen snapshot of company liquidity and profitability.
* **4-Card Cash Pulse:** Displays **Current Cash**, **Expected Receivables** (with pending invoice counts), **Upcoming Payables**, and **Estimated Cash Balance**.
* **Live Net Profit Waterfall:** Visually breaks down total **Sales** across **Materials**, **Wages**, and **Overheads** to reveal true **Net Profit** and operating margins.
* **Multi-Week Cash-Flow Outlook:** Projects cash reserves across upcoming weeks (`Week 1` – `Week 4`) to highlight potential liquidity gaps early.
* **Recent Activity & Quick Add:** Maintains a live ledger of transactions with a one-click **`+ Quick add`** workflow for logging new entries.

### 2. Legal & Invoices (MSME Shield & Payment Protection)
Protects MSMEs against delayed buyer payments by operationalizing Indian statutory rights.
* **Section 43B(h) Compliance Alerts:** Proactively flags invoices past Day 30 that are approaching the 45-day Income Tax Act Section 43B(h) deadline.
* **15-Day Deemed Acceptance & 45-Day Legal Countdown:** Tracks delivery dates, the 15-day deemed acceptance milestone, and the 45-day MSMED Act payment window for every invoice.
* **Buyer Payment Profiles & Credit Scoring:** Evaluates buyer reliability (`0–100` Payment Score, average payment delay, and credit at risk) with automated risk tiers (**Trusted**, **Medium**, **High Risk**) before credit is extended.
* **One-Click Recovery & Liquidity Actions:** Supports **E-Way Bill / Challan** uploads to lock in acceptance dates, **`→ Shift to TReDS`** invoice discounting for early liquidity, and **`Create ODR Packet`** generation for formal MSME Samadhaan / Online Dispute Resolution escalation.

### 3. Credit & Loans (Working Capital & Loan Readiness)
Helps business owners secure financing without rejection and manage existing debt efficiently.
* **AI Working Capital Advisor (*Bridge Loan vs. Waiting*):** Calculates the net profit impact of taking a short-term bridge advance versus waiting out a buyer's payment cycle.
* **Rejection-Shield Bank Statement & GSTR-3B Auditor:** Pre-screens bank statements and GSTR-3B filings prior to loan applications—generating a **Bank Readiness Score** and flagging underwriting red flags such as inward cheque bounces, high cash withdrawals, and personal UPI transfers in business accounts.
* **Live Debt Prioritizer:** Ranks active credit facilities (NBFC loans, MUDRA loans, and supplier credit) by APR to recommend the highest-savings repayment order.
* **12-Month Survival Twin:** Stress-tests annual cash runway against simulated disruptions such as delayed customer collections.
* **One-Click Financing Documentation:** Generates **1-Page MUDRA / CGTMSE Project Reports** and drafts **RBI MSME Restructuring Letters**.

### 4. Shop-Floor Ops (Manufacturing Margins & Execution)
Connects factory-floor operations directly to unit profitability.
* **Unit BOM Margin & Bulk-Buy Timing:** Breaks down per-unit selling price, raw material cost, labor, overhead, and contribution margin while identifying bulk raw material purchase savings (`Approve Bulk Purchase →`).
* **Skilled vs. Unskilled Labor & Shift Optimizer:** Interactive wage and staffing sliders that model daily shift costs and monthly savings across operator and helper allocations.
* **Vernacular Shop-Floor SOPs:** Interactive step-by-step Standard Operating Procedure checklists with language selection and one-click **"Speak Instructions to Worker"** audio playback.
* **High-Margin SKU & B2B Channel Finder:** Identifies top-margin products and maps them to high-intent B2B procurement channels including **IndiaMART**, **GeM (Government e-Marketplace)**, and **Amazon Business**.

### 5. Tax & GST (Monthly Close, Tax-Vault & Income Tax)
Eliminates last-minute filing surprises, ITC leakage, and cash-flow crunches caused by tax outflows.
* **Monthly GST Close Summary:** Tracks **GSTR-1 Sales**, **GSTR-2B ITC Available**, and **Net GST Payable** for each filing period.
* **ITC Reconciliation & Mismatch Engine:** Automatically cross-verifies purchase registers against GSTR-2B filings by supplier **GSTIN**, highlighting matched entries and flagging discrepancies with one-click **`Flag Vendor`** actions.
* **Locked Tax-Vault & 7-Day Penalty Shield:** Separates **Locked for Tax** reserves from **Free Spendable Cash**, backed by a live **7-Day Penalty Countdown** and one-click vault transfers.
* **Old vs. New Tax Regime Simulator:** Compares annual income tax liability across both regimes with a plain-language AI explanation tailored to entity structure under the Income Tax Act, 1961.
* **TDS Credit Tracker & Filing Readiness:** Tracks withholding credits for **Form 26AS** reconciliation alongside a pre-filing monthly readiness checklist.

### 6. Ask MunimAI & Workspace Controls
* **Ask MunimAI (AI Co-Pilot):** Always-accessible floating assistant and sidebar co-pilot providing plain-language, data-backed answers for day-to-day business decisions.
* **Audio Summaries ("Listen"):** Built-in text-to-speech playback across key financial, legal, and compliance cards for hands-free executive updates.
* **Buyer GSTIN Verification:** Instant top-bar lookup (`Check buyer GSTIN`) to verify counterparties before onboarding.
* **Multi-Workspace & Role Management:** Supports multiple business entities with role-based access (`Owner / Admin`).

---

## Tech Stack

* **Frontend:** React / Next.js, Tailwind CSS
* **Data Visualization:** Interactive Charts & Financial Models
* **Voice & Accessibility:** Web Speech API (Multilingual Text-to-Speech)
* **Backend & AI:** Node.js / Python, LLM Co-Pilot Integration
* **Infrastructure:** Cloudflare

---

## Getting Started

### Prerequisites
* **Node.js** `v18+`
* **npm** or **yarn**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com
cd Munim-AI-Website

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open `http://localhost:3000` in your browser to view the application.

---

## Project Structure

```text
Munim-AI-Website/
├── index.html      # Main landing page, UI cards & MSME workspace layout
├── style.css       # Styling, responsive layout & visual themes
├── script.js       # Financial calculators, GST/TDS logic & Ask MunimAI assistant
├── page.tsx        # React / Next.js page component version
└── README.md       # Project documentation
```

---

## Disclaimer
*Financial figures, tax regime comparisons, and legal timelines generated by MunimAI are decision-support estimates designed for Indian MSMEs. Business owners should consult a qualified Chartered Accountant (CA) or legal advisor before final statutory filings.*

---

<p align="center">
  Built for Indian MSMEs • <strong>Hyderabad, Telangana, India</strong>
</p>

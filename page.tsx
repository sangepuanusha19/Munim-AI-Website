"use client";

import {
  ArrowDownLeft, ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines, Bell,
  Building2, CalendarDays, CheckCircle2, ChevronDown, CircleAlert, Clock3, FileCheck2,
  FileText, Flag, Landmark, LayoutDashboard, Menu, MessageCircle, Mic, Plus, Printer, RotateCcw,
  Search, Send, Settings2, ShieldCheck, Sparkles, TrendingUp, Upload, Volume2, Wallet, X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import {
  Area, AreaChart, CartesianGrid, Cell, Bar, BarChart, Line, LineChart, ReferenceDot,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { useFinance, useVoice, type FinanceState, type Language, type LedgerEntry, type LegalBuyer, type LegalInvoice } from "./munim-context";

type Tab = "Overview" | "Legal & Invoices" | "Credit & Loans" | "Shop-Floor Ops" | "TAX & GST";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  speech?: Record<Language, string>;
  action?: { label: Record<Language, string>; details: Record<Language, string> };
};
type SupplierInvoice = { id: string; supplier: string; gstin: string; invoice: string; date: string; amount: number; status: "Matched" | "Mismatch" };

const supplierInvoices: SupplierInvoice[] = [
  { id: "svs", supplier: "Sri Venkateswara Steels", gstin: "36AABFS1234G1ZP", invoice: "SVS/25-26/184", date: "14 Nov 2026", amount: 124000, status: "Matched" },
  { id: "dak", supplier: "Deccan Alloy & Kraft", gstin: "36AABCD5678K1Z2", invoice: "DAK/1187/26", date: "16 Nov 2026", amount: 86500, status: "Mismatch" },
  { id: "tmg", supplier: "Telangana Machine Tools", gstin: "36AAACT9012M1Z8", invoice: "TMT/2026/441", date: "18 Nov 2026", amount: 52300, status: "Matched" },
  { id: "gpc", supplier: "Godavari Packaging Co.", gstin: "36AABCG3456P1Z5", invoice: "GPC/26-27/092", date: "20 Nov 2026", amount: 74800, status: "Mismatch" },
];

const tabs: { label: Tab; icon: typeof LayoutDashboard }[] = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Legal & Invoices", icon: FileText },
  { label: "Credit & Loans", icon: Landmark },
  { label: "Shop-Floor Ops", icon: Building2 },
  { label: "TAX & GST", icon: ShieldCheck },
];
const formatINR = (amount: number) => `₹${Math.round(amount).toLocaleString("en-IN")}`;
const locales: Record<Language, string> = { "en-IN": "English (India)", };

function Logo({ large = false }: { large?: boolean }) {
  return <div className={`logo-lockup ${large ? "logo-large" : ""}`}>
    <div className="logo-mark"><ShieldCheck size={large ? 30 : 21} strokeWidth={2.25} /><span>₹</span></div>
    <div className="logo-type">Munim<span>AI</span></div>
  </div>;
}

export default function Home() {
  const { finance, setFinance, reset } = useFinance();
  const voice = useVoice();
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [gstin, setGstin] = useState("");
  const [gstResult, setGstResult] = useState("");
  const [replayKey, setReplayKey] = useState(0);
  const [mobileNav, setMobileNav] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatWorking, setChatWorking] = useState(false);
  const [legalPromptBuyerId, setLegalPromptBuyerId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousCashRisk = useRef(false);

  const netProfit = finance.sales - finance.rawMaterial - finance.wages - finance.overheads;
  const forecast = finance.cash + finance.receivables - finance.payables;
  const duePayables15 = finance.payables;
  const dueReceivables15 = finance.receivables;
  const cashRisk = duePayables15 > finance.cash + dueReceivables15;

  const summary = useMemo(() => ({
    "en-IN": `Namaste. Your current cash is ${formatINR(finance.cash)}. Expected receivables are ${formatINR(finance.receivables)} and upcoming payables are ${formatINR(finance.payables)}. Your forecasted cash balance is ${formatINR(forecast)}.${cashRisk ? " A cash crunch risk needs your attention in the next 15 days." : " No cash crunch is forecast in the next 15 days."}`,
  }), [finance, forecast, cashRisk]);

  useEffect(() => {
    timer.current = setTimeout(() => setEntered(true), 3000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [replayKey]);

  useEffect(() => {
    if (entered && replayKey >= 0) voice.speak(summary);
    // Speak once on dashboard entry, not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, replayKey]);

  useEffect(() => {
    if (entered && cashRisk && !previousCashRisk.current) {
      voice.speak({
        "en-IN": `Cash crunch warning. Upcoming payables of ${formatINR(duePayables15)} exceed your current cash and expected receivables of ${formatINR(finance.cash + dueReceivables15)} within 15 days. Follow up on collections and review payment timing.`,
      });
    }
    previousCashRisk.current = cashRisk;
  }, [cashRisk, entered, duePayables15, dueReceivables15, finance.cash, voice]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);
  const clearLegalPrompt = useCallback(() => setLegalPromptBuyerId(null), []);

  const enterDashboard = () => {
    if (timer.current) clearTimeout(timer.current);
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.resume();
    setEntered(true);
  };

  const replayIntro = () => {
    voice.stop();
    setEntered(false);
    setReplayKey(key => key + 1);
  };

  const askMunim = () => setChatOpen(open => !open);

  const sendChatMessage = async (question: string) => {
    const text = question.trim();
    if (!text || chatWorking) return;
    setChatWorking(true);
    setChatMessages(current => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    try {
      const response = await fetch("/api/munim-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, language: voice.language, finance }),
      });
      const result = await response.json() as {
        answer?: Record<Language, string>;
        action?: { type: string; label: Record<Language, string>; details: Record<Language, string>; invoiceId?: string; amount?: number } | null;
        error?: string;
      };
      if (!response.ok || !result.answer) throw new Error(result.error || "MunimAI could not answer right now.");

      let actionMessage: ChatMessage["action"];
      let localizedAnswer = result.answer;
      if (result.action) {
        const action = result.action;
        const now = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
        let applied = false;
        if (action.type === "bulk-purchase") {
          if (!finance.bulkPurchaseApproved && finance.cash - finance.taxVault >= 120000) {
            const entry: LedgerEntry = { id: crypto.randomUUID(), label: "Steel & brass bulk inventory", amount: 120000, type: "outflow", date: now, source: "Ask MunimAI Agent" };
            setFinance(current => current.bulkPurchaseApproved || current.cash - current.taxVault < 120000 ? current : ({
              ...current, cash: current.cash - 120000, bulkPurchaseApproved: true, entries: [entry, ...current.entries],
            }));
            applied = true;
          }
        } else if (action.type === "treds" && action.invoiceId) {
          const invoice = finance.legalInvoices.find(item => item.id === action.invoiceId && !item.tredsSettled);
          if (invoice) {
            const fee = Math.round(invoice.amount * 0.011);
            const netCash = invoice.amount - fee;
            const entry: LedgerEntry = { id: crypto.randomUUID(), label: `TReDS settlement · ${invoice.number}`, amount: netCash, type: "inflow", date: "Within 48 hours", source: "Ask MunimAI Agent" };
            setFinance(current => current.legalInvoices.some(item => item.id === invoice.id && !item.tredsSettled) ? ({
              ...current,
              cash: current.cash + netCash,
              receivables: Math.max(0, current.receivables - invoice.amount),
              entries: [entry, ...current.entries],
              legalInvoices: current.legalInvoices.map(item => item.id === invoice.id ? { ...item, tredsSettled: true } : item),
            }) : current);
            applied = true;
          }
        } else if (action.type === "tax-vault-payment") {
          if (!finance.taxPaymentReceived) {
            const entry: LedgerEntry = { id: crypto.randomUUID(), label: "Customer payment · GST reserve moved to Tax-Vault", amount: 118000, type: "inflow", date: now, source: "Ask MunimAI Agent" };
            setFinance(current => current.taxPaymentReceived ? current : ({
              ...current,
              cash: current.cash + 118000,
              receivables: Math.max(0, current.receivables - 118000),
              taxVault: current.taxVault + 24500,
              taxPaymentReceived: true,
              entries: [entry, ...current.entries],
            }));
            applied = true;
          }
        } else if (action.type === "survival-mode") {
          if (finance.debtMode !== "survival") {
            setFinance(current => current.debtMode === "survival" ? current : ({ ...current, debtMode: "survival" }));
            applied = true;
          }
        } else if (action.type === "bridge-loan") {
          if (!finance.bridgeLoanExecuted) {
            const entry: LedgerEntry = { id: crypto.randomUUID(), label: "30-day bridge advance", amount: 150000, type: "inflow", date: now, source: "Ask MunimAI Agent" };
            setFinance(current => current.bridgeLoanExecuted ? current : ({
              ...current, cash: current.cash + 150000, bridgeLoanExecuted: true, entries: [entry, ...current.entries],
            }));
            applied = true;
          }
        }

        if (applied) {
          actionMessage = { label: action.label, details: action.details };
          localizedAnswer = action.details;
        } else {
          localizedAnswer = {
            "en-IN": "I couldn't apply that action because the current dashboard state changed or the action is already complete. Please review the relevant card and try again if needed.",
          };
        }
      }

      setChatMessages(current => [...current, {
        id: crypto.randomUUID(), role: "assistant", text: localizedAnswer[voice.language],
        speech: localizedAnswer, action: actionMessage,
      }]);
      if (voice.enabled) voice.speak(localizedAnswer);
      if (actionMessage) notify(actionMessage.label[voice.language]);
    } catch (error) {
      const fallback: Record<Language, string> = {
        "en-IN": "I couldn't reach the local MunimAI agent. Please try again.",
      };
      console.error("MunimAI agent request failed.", error);
      setChatMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", text: fallback[voice.language], speech: fallback }]);
      if (voice.enabled) voice.speak(fallback);
    } finally {
      setChatWorking(false);
    }
  };

  const startChatVoice = () => voice.listen(sendChatMessage, notify);

  const toggleVendorFlag = (vendorId: string) => {
    const currentlyFlagged = finance.flaggedVendors.includes(vendorId);
    setFinance(current => ({
      ...current,
      flaggedVendors: currentlyFlagged
        ? current.flaggedVendors.filter(id => id !== vendorId)
        : [...current.flaggedVendors, vendorId],
    }));
    notify(currentlyFlagged ? "Vendor flag removed." : "Vendor flagged for follow-up.");
  };

  const checkGSTIN = (event: FormEvent) => {
    event.preventDefault();
    const clean = gstin.trim().toUpperCase();
    if (!/^[0-9A-Z]{15}$/.test(clean)) {
      setGstResult("Enter a valid 15-character GSTIN format.");
      return;
    }
    const buyer = finance.buyers.find(item => item.gstin === clean);
    if (!buyer) {
      setGstResult("Valid GSTIN format · Buyer is not in this demo ledger.");
      return;
    }
    setGstResult(`Buyer found · Payment score ${buyer.paymentScore}/100`);
    setTab("Legal & Invoices");
    setLegalPromptBuyerId(buyer.id);
  };

  const applyEntry = (entry: LedgerEntry) => {
    if (entry.type === "outflow" && entry.amount > finance.cash - finance.taxVault) {
      notify(`Only ${formatINR(Math.max(0, finance.cash - finance.taxVault))} is spendable after protecting the Tax-Vault reserve.`);
      return false;
    }
    setFinance(current => ({
      ...current,
      cash: current.cash + (entry.type === "inflow" ? entry.amount : -entry.amount),
      sales: current.sales + (entry.type === "inflow" ? entry.amount : 0),
      rawMaterial: current.rawMaterial + (entry.type === "outflow" ? entry.amount : 0),
      entries: [entry, ...current.entries],
    }));
    return true;
  };

  const speakCard = (key: string, value: string, advice: string) => ({
    "en-IN": `${key}: ${value}. ${advice}`,
  });

  if (!entered) return <Intro onEnter={enterDashboard} />;

  return <main className="app-shell">
    <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
      <div className="brand-area"><Logo /></div>
      <div className="workspace-caption">WORKSPACE</div>
      <button className="company-switch"><span className="company-icon"><Building2 size={17} /></span><span className="company-copy"><strong>Sri Balaji Precision Components Pvt Ltd</strong><small>Manufacturing · Hyderabad</small></span><ChevronDown size={15} /></button>
      <div className="nav-caption">YOUR BUSINESS</div>
      <nav className="nav-list" aria-label="Main navigation">
        {tabs.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${tab === label ? "active" : ""}`} onClick={() => { setTab(label); setMobileNav(false); }}><Icon size={18} strokeWidth={1.8} /><span>{label}</span>{label === "Overview" && <span className="nav-active-dot" />}</button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="ai-nudge"><div className="nudge-icon"><Sparkles size={16} /></div><strong>Your AI co-pilot</strong><p>Clear answers for the decisions that move your business forward.</p><button onClick={() => setChatOpen(true)}>Ask MunimAI <ArrowRight size={14} /></button></div>
        <div className="profile-row"><div className="profile-avatar">RK</div><div><strong>Ravi Kumar</strong><small>Business owner</small></div><button className="reset-demo" onClick={() => { reset(); notify("Demo data reset to its original values."); }}><RotateCcw size={12} /> Reset demo data</button></div>
      </div>
    </aside>

    <section className="main-area">
      <header className="topbar">
        <div className="crumb"><button className="menu-toggle" aria-label="Open navigation" onClick={() => setMobileNav(value => !value)}><Menu size={18} /></button><span className="crumb-brand">MunimAI</span><span className="crumb-slash">/</span><strong>{tab}</strong></div>
        <div className="topbar-tools">
          <form className="gst-search" onSubmit={checkGSTIN}>
            <Search size={16} /><input value={gstin} onChange={event => { setGstin(event.target.value); setGstResult(""); }} placeholder="Check buyer GSTIN" maxLength={15} aria-label="Check buyer GSTIN" />
            <button type="submit">Check</button>
            {gstResult && <span className="gst-result">{gstResult}</span>}
          </form>
          <label className="voice-toggle"><span className={`voice-indicator ${voice.enabled ? "on" : ""}`} /><span>Voice-Over: {voice.enabled ? "ON" : "OFF"}</span><input aria-label="Toggle voice over" type="checkbox" checked={voice.enabled} onChange={event => { voice.setEnabled(event.target.checked); if (!event.target.checked) voice.stop(); }} /></label>
          <button className="test-voice" type="button" aria-label="Test Voice" title="Test Voice" onClick={voice.testVoice} disabled={!voice.enabled}><Volume2 size={14} /><span>Test Voice</span></button>
          <label className="language-select"><span className="sr-only">Voice language</span><select value={voice.language} onChange={event => voice.setLanguage(event.target.value as Language)} aria-label="Voice language">{Object.entries(locales).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select><ChevronDown size={13} /></label>
          <button className="icon-btn replay-btn" title="Replay intro" aria-label="Replay intro" onClick={replayIntro}><RotateCcw size={15} /></button>
          {voice.speaking ? <button className="stop-voice" aria-label="Stop speaking" title="Stop speaking" onClick={voice.stop}><span className="sound-bars"><i /><i /><i /><i /></span><span className="stop-voice-label">Stop Speaking</span></button> : <button className="icon-btn notification-btn" aria-label="Notifications" onClick={() => notify("You’re all caught up.")}><Bell size={18} /><i /></button>}
          <div className="top-avatar">RK</div>
        </div>
      </header>

      <div className="page-content">
        {tab === "Overview" ? <>
          <div className="welcome-heading">
            <div><div className="eyebrow"><span className="live-dot" /> {new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date()).toUpperCase()} <span className="heading-separator">·</span> YOUR BUSINESS SNAPSHOT</div><h1>Good morning, Ravi <span>✦</span></h1><p>Here’s the financial pulse of your business today.</p></div>
            <button className="primary-btn" onClick={() => setModal(true)}><Plus size={17} /> Quick add</button>
          </div>

          <div className="kpi-grid">
            <KpiCard label="Current cash" amount={finance.cash} icon={<Wallet size={17} />} trend="+8.2%" trendLabel="vs. last month" tone="blue" onListen={() => voice.speak(speakCard("Current cash", formatINR(finance.cash), "Cash available across your accounts."))} />
            <KpiCard label="Expected receivables" amount={finance.receivables} icon={<ArrowDownLeft size={17} />} trend="12 invoices" trendLabel="expected this month" tone="green" onListen={() => voice.speak(speakCard("Expected receivables", formatINR(finance.receivables), "Across invoices expected this month."))} />
            <KpiCard label="Upcoming payables" amount={finance.payables} icon={<ArrowUpRight size={17} />} trend="8 bills" trendLabel="due this month" tone="amber" onListen={() => voice.speak(speakCard("Upcoming payables", formatINR(finance.payables), "Plan these outflows to protect your cash position."))} />
            <KpiCard label="Forecasted cash balance" amount={forecast} icon={<ActivityIcon />} trend={forecast >= 0 ? "Healthy runway" : "Needs attention"} trendLabel="cash after expected flows" tone={forecast >= 0 ? "navy" : "red"} onListen={() => voice.speak(speakCard("Forecasted cash balance", formatINR(forecast), "Current cash plus expected receivables, less upcoming payables."))} />
          </div>

          {cashRisk && <div className="cash-alert" role="alert"><div className="alert-icon"><CircleAlert size={19} /></div><div className="alert-copy"><strong>Cash crunch risk in the next 15 days</strong><p>Near-term payables of {formatINR(duePayables15)} exceed available cash and near-term collections of {formatINR(finance.cash + dueReceivables15)}. Consider following up on receivables now.</p></div><button className="alert-listen" aria-label="Listen to cash crunch alert" onClick={() => voice.speak(speakCard("Cash crunch warning", `Payables ${formatINR(duePayables15)} exceed available cash and collections ${formatINR(finance.cash + dueReceivables15)}`, "Follow up on collections and review payment timing."))}><Volume2 size={17} /> Listen</button></div>}

          <section className="profit-card">
            <div className="section-head"><div><div className="section-title-row"><h2>Live net profit</h2><span className="live-pill"><i /> LIVE</span></div><p>Sales less materials, wages and overheads</p></div><button className="chart-period"><CalendarDays size={14} /> This month <ChevronDown size={13} /></button></div>
            <div className="profit-layout">
              <div className="profit-total"><span>NET PROFIT</span><strong className="tabular-nums">{formatINR(netProfit)}</strong><small className={netProfit >= 0 ? "positive" : "negative"}><TrendingUp size={13} /> {finance.sales ? `${Math.round(netProfit / finance.sales * 100)}%` : "0%"} <span>profit margin</span></small><div className="profit-formula"><span>Sales {formatINR(finance.sales)}</span><span>−</span><span>Costs {formatINR(finance.rawMaterial + finance.wages + finance.overheads)}</span></div></div>
              <div className="profit-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{ name: "Sales", value: finance.sales, fill: "#1d4ed8" }, { name: "Materials", value: finance.rawMaterial, fill: "#93c5fd" }, { name: "Wages", value: finance.wages, fill: "#60a5fa" }, { name: "Overheads", value: finance.overheads, fill: "#bfdbfe" }, { name: "Net profit", value: Math.max(0, netProfit), fill: "#059669" }]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}><CartesianGrid vertical={false} stroke="#eef2f7" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} /><YAxis hide /><Tooltip formatter={(value) => formatINR(Number(value))} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11, boxShadow: "0 6px 20px #0f172a12" }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={30}>{[{ fill: "#1d4ed8" }, { fill: "#93c5fd" }, { fill: "#60a5fa" }, { fill: "#bfdbfe" }, { fill: "#059669" }].map((item, index) => <Cell key={index} fill={item.fill} />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
          </section>

          <div className="dashboard-lower">
            <section className="panel cashflow-panel">
              <div className="section-head"><div><h2>Cash-flow outlook</h2><p>Projected balance over the coming weeks</p></div><span className="legend-chip"><i /> Cash balance</span></div>
              <div className="cash-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={cashflowData(finance, forecast)} margin={{ top: 12, right: 12, bottom: 0, left: 2 }}><defs><linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.17} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#eef2f7" /><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickMargin={10} /><YAxis hide domain={["dataMin - 100000", "dataMax + 100000"]} /><Tooltip formatter={(value) => formatINR(Number(value))} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} /><Area type="monotone" dataKey="balance" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#cashFill)" dot={{ r: 3, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div>
              <div className="chart-footnote"><span><span className="footnote-dot" /> Opening cash {formatINR(finance.cash)}</span><span>Forecast includes known receivables & payables</span></div>
            </section>
            <section className="panel activity-panel">
              <div className="section-head"><div><h2>Recent activity</h2><p>Latest movement in your books</p></div><button className="text-link" onClick={() => setModal(true)}>View all <ArrowRight size={14} /></button></div>
              <div className="activity-list">{finance.entries.slice(0, 4).map(entry => <ActivityRow key={entry.id} entry={entry} />)}</div>
              <button className="add-transaction" onClick={() => setModal(true)}><Plus size={15} /> Add a transaction</button>
            </section>
          </div>

          <div className="bottom-strip">
            <div className="bottom-strip-icon"><ShieldCheck size={17} /></div><div><strong>Your money, with a little more clarity.</strong><p>Finance forecasts are estimates based on the data in this demo workspace.</p></div><button className="text-link" onClick={() => setTab("TAX & GST")}>Explore tax & GST <ArrowRight size={14} /></button>
          </div>
        </> : tab === "Legal & Invoices"
          ? <LegalInvoicesDashboard
            finance={finance}
            setFinance={setFinance}
            autoOpenBuyerId={legalPromptBuyerId}
            onPromptHandled={clearLegalPrompt}
            onNotify={notify}
          />
          : tab === "Credit & Loans"
            ? <CreditLoansDashboard finance={finance} setFinance={setFinance} onNotify={notify} />
          : tab === "Shop-Floor Ops"
            ? <ShopFloorOpsDashboard finance={finance} setFinance={setFinance} onNotify={notify} />
          : tab === "TAX & GST"
          ? <TaxGSTDashboard finance={finance} setFinance={setFinance} flaggedVendors={finance.flaggedVendors} onToggleFlag={toggleVendorFlag} onSpeak={speech => voice.speak(speech)} onNotify={notify} />
          : <PlaceholderPage tab={tab} onQuickAdd={() => setModal(true)} />}
      </div>
    </section>

    <button className={`ask-fab ${voice.listening ? "listening" : ""}`} aria-label="Ask MunimAI (Voice)" aria-haspopup="dialog" aria-expanded={chatOpen} onClick={askMunim}><span className="ask-icon">{voice.listening ? <AudioLines size={18} /> : <MessageCircle size={18} />}</span><span>Ask MunimAI</span><kbd>VOICE</kbd></button>
    {chatOpen && <ChatPopup language={voice.language} onLanguageChange={voice.setLanguage} listening={voice.listening} working={chatWorking} messages={chatMessages} onClose={() => setChatOpen(false)} onSend={sendChatMessage} onListen={startChatVoice} onSpeak={speech => voice.speak(speech)} />}
    {modal && <QuickAddModal entries={finance.entries} onClose={() => setModal(false)} onAdd={entry => { if (applyEntry(entry)) { setModal(false); notify(`${entry.type === "inflow" ? "Inflow" : "Outflow"} added. Your dashboard is up to date.`); } }} onImport={(entries, source) => {
      const spendableAfterImport = entries.reduce((balance, entry) => balance + (entry.type === "inflow" ? entry.amount : -entry.amount), finance.cash - finance.taxVault);
      if (spendableAfterImport < 0) {
        notify("Import stopped: the transactions would use funds reserved in the Tax-Vault.");
        return;
      }
      setFinance(current => entries.reduce((updated, entry) => ({
        ...updated,
        cash: updated.cash + (entry.type === "inflow" ? entry.amount : -entry.amount),
        sales: updated.sales + (entry.type === "inflow" ? entry.amount : 0),
        rawMaterial: updated.rawMaterial + (entry.type === "outflow" ? entry.amount : 0),
        entries: [entry, ...updated.entries],
      }), current));
      setModal(false); notify(`${entries.length} ${source} transactions synced.`);
    }} />}
    {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
  </main>;
}

function ActivityIcon() {
  return <div className="activity-icon-wrap"><TrendingUp size={16} /></div>;
}

function KpiCard({ label, amount, icon, trend, trendLabel, tone, onListen }: {
  label: string; amount: number; icon: ReactNode; trend: string; trendLabel: string; tone: string; onListen: () => void;
}) {
  return <article className="kpi-card">
    <div className="kpi-top"><span>{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-amount tabular-nums">{formatINR(amount)}</div>
    <div className="kpi-bottom"><span className={`kpi-trend ${tone}`}>{tone === "green" ? <ArrowDownRight size={13} /> : tone === "amber" ? <Clock3 size={12} /> : <TrendingUp size={12} />}{trend}</span><span className="kpi-note">{trendLabel}</span><button className="listen-btn" onClick={onListen} title={`Listen to ${label}`} aria-label={`Listen to ${label}`}><Volume2 size={15} /><span>Listen</span></button></div>
  </article>;
}

function ActivityRow({ entry }: { entry: LedgerEntry }) {
  const incoming = entry.type === "inflow";
  return <div className="activity-row"><div className={`activity-row-icon ${incoming ? "incoming" : "outgoing"}`}>{incoming ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}</div><div className="activity-description"><strong>{entry.label}</strong><small>{entry.source} <span>·</span> {entry.date}</small></div><strong className={`activity-amount tabular-nums ${incoming ? "incoming-text" : ""}`}>{incoming ? "+" : "−"}{formatINR(entry.amount)}</strong></div>;
}

function cashflowData(finance: FinanceState, forecast: number) {
  return [
    { week: "This week", balance: finance.cash },
    { week: "Week 2", balance: finance.cash + finance.entries.filter(entry => entry.type === "inflow").slice(0, 2).reduce((sum, item) => sum + item.amount, 0) - finance.entries.filter(entry => entry.type === "outflow").slice(0, 2).reduce((sum, item) => sum + item.amount, 0) },
    { week: "Week 3", balance: finance.cash + (forecast - finance.cash) * 0.6 },
    { week: "Week 4", balance: forecast },
  ];
}

function Intro({ onEnter }: { onEnter: () => void }) {
  return <main className="intro-screen">
    <div className="intro-orbit orbit-one" /><div className="intro-orbit orbit-two" />
    <div className="intro-content">
      <div className="intro-brand"><Logo large /></div>
      <div className="intro-kicker"><span /> BUILT FOR THE BUSINESS YOU’RE BUILDING <span /></div>
      <h1>Aapka Smart AI Munim</h1>
      <p>Legal, Cash-Flow &amp; Tax Co-Pilot</p>
      <div className="intro-description">One clear view of your business.<br />A little more confidence in every next step.</div>
      <button className="intro-enter" onClick={onEnter}>Enter Dashboard <ArrowRight size={18} /></button>
      <div className="intro-caption"><ShieldCheck size={14} /> Made for Indian MSMEs <span>·</span> Hyderabad, India</div>
    </div>
    <div className="intro-foot"><span>FINANCE, MADE MORE HUMAN</span><span>01 — 05</span></div>
  </main>;
}

type CreditLetterType = "project" | "restructuring";
type CreditSpeech = Record<Language, string>;

function CreditListen({ speech, onSpeak, label = "Listen" }: { speech: CreditSpeech; onSpeak: (text: CreditSpeech) => void; label?: string }) {
  return <button className="listen-btn credit-listen" type="button" onClick={() => onSpeak(speech)} aria-label={label} title={label}><Volume2 size={15} /><span>{label}</span></button>;
}

function CreditLoansDashboard({ finance, setFinance, onNotify }: {
  finance: FinanceState;
  setFinance: React.Dispatch<React.SetStateAction<FinanceState>>;
  onNotify: (message: string) => void;
}) {
  const voice = useVoice();
  const [letter, setLetter] = useState<CreditLetterType | null>(null);
  const netProfit = finance.sales - finance.rawMaterial - finance.wages - finance.overheads;
  const profitMargin = finance.sales > 0 ? Math.max(0.01, netProfit / finance.sales) : 0.32;
  const additionalMonthlyProfit = Math.round(finance.extraMonthlySales * profitMargin);
  const breakEvenMonth = Math.ceil(finance.machineLoan / Math.max(1, additionalMonthlyProfit));
  const topBuyerDelay = [...finance.legalInvoices].sort((a, b) => b.amount - a.amount).slice(0, 2).reduce((sum, invoice) => sum + invoice.amount, 0);
  const emiSafetyLine = 150000;
  const chartData = useMemo(() => Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const normalCash = finance.cash + month * 45000;
    const stressCash = Math.min(normalCash - topBuyerDelay, emiSafetyLine - 25000);
    const expansionCash = normalCash + month * additionalMonthlyProfit;
    return {
      month: `Month ${month}`,
      cash: finance.digitalTwinScenario === "delay"
        ? month === 4 ? stressCash : normalCash
        : finance.digitalTwinScenario === "expansion" ? expansionCash : normalCash,
    };
  }), [additionalMonthlyProfit, emiSafetyLine, finance.cash, finance.digitalTwinScenario, topBuyerDelay]);
  const monthFourCash = chartData[3]?.cash ?? finance.cash;
  const stressResult: CreditSpeech = finance.digitalTwinScenario === "delay"
    ? {
      "en-IN": `In the customer delay shock, two major buyers delay payment by 30 days. Month 4 cash is ${formatINR(monthFourCash)}, below the ${formatINR(emiSafetyLine)} EMI safety line. Follow up early and preserve a working-capital buffer.`,
    }
    : finance.digitalTwinScenario === "expansion"
      ? {
        "en-IN": `With a machine loan of ${formatINR(finance.machineLoan)} and expected extra monthly sales of ${formatINR(finance.extraMonthlySales)}, estimated monthly contribution is ${formatINR(additionalMonthlyProfit)}. Break-even is ${breakEvenMonth <= 12 ? `Month ${breakEvenMonth}` : "beyond Month 12"}.`,
      }
      : {
        "en-IN": `In the normal scenario, projected cash remains above the ${formatINR(emiSafetyLine)} EMI safety line for all 12 months. Month 12 cash is ${formatINR(chartData[11]?.cash ?? 0)}.`,
      };
  const bridgeSpeech: CreditSpeech = {
    "en-IN": "Waiting 45 days for the stuck two lakh rupee invoice risks missing a repeat order worth twenty-eight thousand rupees net profit. A one lakh fifty thousand rupee, 30-day advance at 15 percent costs one thousand eight hundred seventy-five rupees in interest and creates an estimated net gain of twenty-six thousand one hundred twenty-five rupees.",
  };
  const auditSpeech: CreditSpeech = {
    "en-IN": "The bank-readiness score is 74 out of 100. Two inward cheque bounces, one lakh eighty-five thousand rupees in high cash withdrawals, and fourteen personal UPI transfers mixed into the business account are the three detected risks. Reconcile them over 30 days to improve underwriting readiness and protect your credit profile.",
  };
  const debts = [
    { id: "bajaj", name: "Bajaj Finserv NBFC Loan", amount: 420000, rate: "24% p.a.", overdue: "Current", priority: 1 },
    { id: "sbi", name: "SBI MUDRA Loan", amount: 350000, rate: "10.5% p.a.", overdue: "Current", priority: 2 },
    { id: "supplier", name: "Raw Material Supplier Credit", amount: 210000, rate: "Supplier terms", overdue: "78 days overdue · 12 days to 90-day NPA mark", priority: 3 },
  ].sort((a, b) => finance.debtMode === "survival"
    ? (a.id === "supplier" ? -1 : b.id === "supplier" ? 1 : a.priority - b.priority)
    : a.priority - b.priority);
  const checklist = [
    { id: "upi", title: "Separate personal UPI transfers from business banking", due: "Days 1–7" },
    { id: "cash", title: "Reconcile ₹1,85,000 cash withdrawals with vouchers", due: "Days 8–14" },
    { id: "cheques", title: "Document cheque bounces and keep a funded cheque buffer", due: "Days 15–30" },
  ];

  const executeBridgeLoan = () => {
    if (finance.bridgeLoanExecuted) return;
    setFinance(current => current.bridgeLoanExecuted ? current : ({
      ...current,
      cash: current.cash + 150000,
      bridgeLoanExecuted: true,
      entries: [{
        id: `bridge-${Date.now()}`, label: "30-day bridge advance", amount: 150000, type: "inflow",
        date: "Today", source: "Credit & Loans",
      }, ...current.entries],
    }));
    onNotify("Bridge advance simulated. ₹1,50,000 added to Current Cash.");
  };
  const loadAudit = (fileName: string) => setFinance(current => ({
    ...current, bankAuditLoaded: true, bankStatementName: fileName,
  }));
  const toggleChecklist = (id: string) => setFinance(current => ({
    ...current,
    auditChecklist: current.auditChecklist.includes(id)
      ? current.auditChecklist.filter(item => item !== id)
      : [...current.auditChecklist, id],
  }));
  const setDebtMode = (mode: "avalanche" | "survival") => setFinance(current => ({ ...current, debtMode: mode }));
  const setScenario = (scenario: FinanceState["digitalTwinScenario"]) => setFinance(current => ({ ...current, digitalTwinScenario: scenario }));
  const reportSpeech: CreditSpeech = {
    "en-IN": `One-page MUDRA and CGTMSE project report for Sri Balaji Precision Components in Hyderabad. It summarizes current sales of ${formatINR(finance.sales)}, estimated net profit of ${formatINR(netProfit)}, cash of ${formatINR(finance.cash)}, and a proposed machine project of ${formatINR(finance.machineLoan)}. Review figures and lender eligibility before submission.`,
  };
  const restructuringSpeech: CreditSpeech = {
    "en-IN": "Draft RBI MSME revival and restructuring request for Sri Balaji Precision Components, Hyderabad. It requests a review and temporary repayment relief before the supplier credit reaches 90 days overdue, citing delayed buyer receipts and working-capital pressure. Complete bank and account details and obtain professional review before sending.",
  };

  return <div className="credit-page">
    <header className="credit-heading">
      <div><span className="eyebrow">FUNDING &amp; WORKING CAPITAL</span><h1>Credit &amp; Loans</h1><p>Make a cash decision with the cost, risk, and next step in view.</p></div>
      <div className="credit-company-chip"><Landmark size={15} /><span>Sri Balaji Precision Components Pvt Ltd <small>Hyderabad, Telangana</small></span><CreditListen speech={{
        "en-IN": "This Credit and Loans workspace is prepared for Sri Balaji Precision Components Private Limited in Hyderabad, Telangana.",
      }} onSpeak={speech => voice.speak(speech)} /></div>
    </header>

    <section className="credit-panel credit-bridge">
      <div className="credit-panel-heading">
        <div><span className="eyebrow">AI WORKING-CAPITAL ADVISOR</span><h2>Bridge loan vs. waiting for the invoice</h2><p>Illustrative comparison for a stuck ₹2,00,000 invoice and repeat order.</p></div>
        <CreditListen speech={bridgeSpeech} onSpeak={speech => voice.speak(speech)} />
      </div>
      <div className="credit-compare-grid">
        <article className="credit-option wait">
          <div className="credit-option-title"><span className="credit-option-mark">A</span><div><h3>Wait 45 days</h3><small>On the stuck ₹2,00,000 invoice</small></div></div>
          <strong className="credit-option-value">₹0 <small>interest</small></strong>
          <p>May miss a ₹2,40,000 repeat order worth <b>₹28,000 net profit.</b></p>
          <CreditListen speech={{
            "en-IN": "Option A is to wait 45 days for the stuck two lakh rupee invoice. There is no interest cost, but the business risks losing a repeat order with twenty-eight thousand rupees net profit.",
          }} onSpeak={speech => voice.speak(speech)} />
        </article>
        <article className="credit-option advance">
          <div className="credit-option-title"><span className="credit-option-mark">B</span><div><h3>Take a 30-day advance</h3><small>₹1,50,000 at 15% p.a.</small></div></div>
          <div className="credit-option-values"><span>Interest <b>₹1,875</b></span><strong>+₹26,125 <small>estimated net gain</small></strong></div>
          <p>Funds the next order while the receivable is collected.</p>
          <CreditListen speech={{
            "en-IN": "Option B is a one lakh fifty thousand rupee, 30-day advance at 15 percent per year. Interest is one thousand eight hundred seventy-five rupees; after unlocking twenty-eight thousand rupees net profit, the estimated net gain is twenty-six thousand one hundred twenty-five rupees.",
          }} onSpeak={speech => voice.speak(speech)} />
        </article>
      </div>
      <div className="credit-bridge-footer">
        <span><ShieldCheck size={15} /> Demo decision support · verify lender fees and repayment terms</span>
        <button className="primary-btn credit-primary" type="button" disabled={finance.bridgeLoanExecuted} onClick={executeBridgeLoan}>
          {finance.bridgeLoanExecuted ? <><CheckCircle2 size={15} /> Advance simulated</> : <>Execute Bridge Loan <ArrowRight size={15} /></>}
        </button>
      </div>
    </section>

    <section className="credit-panel">
      <div className="credit-panel-heading">
        <div><span className="eyebrow">DOCUMENT &amp; CASH-FLOW AUDIT</span><h2>Rejection-Shield bank statement &amp; GSTR-3B auditor</h2><p>Spot common underwriting concerns and keep a 30-day cleanup plan.</p></div>
        <CreditListen speech={auditSpeech} onSpeak={speech => voice.speak(speech)} />
      </div>
      <div className="credit-audit-layout">
        <div className="credit-audit-scorebox">
          <div className="credit-score-circle" role="img" aria-label="Bank readiness score 74 out of 100"><span><strong>74</strong><small>/ 100</small></span></div>
          <div className="credit-score-caption"><strong>Bank-readiness score</strong><span>Review recommended</span></div>
          <CreditListen speech={{
            "en-IN": "Your bank-readiness score is 74 out of 100. Three cleanup actions can strengthen the quality of your bank statement and GST return records.",
          }} onSpeak={speech => voice.speak(speech)} />
        </div>
        <div className="credit-audit-content">
          <div className="credit-audit-flags">
            {[
              { id: "bounces", text: "2 inward cheque bounces in August", note: "Can affect bank underwriting", speech: { "en-IN": "Two inward cheques bounced in August, which can affect bank underwriting. Keep a sufficient cheque buffer and document the cause.", } as CreditSpeech },
              { id: "withdrawals", text: "₹1,85,000 in high cash withdrawals", note: "Reduces visible banking turnover", speech: { "en-IN": "High cash withdrawals of one lakh eighty-five thousand rupees reduce visible banking turnover. Reconcile them with business vouchers and receipts.", } as CreditSpeech },
              { id: "upi", text: "14 personal UPI transfers in business account", note: "Mixes personal and business activity", speech: { "en-IN": "Fourteen personal UPI transfers are mixed into the business current account. Move personal activity to a separate account and label any reimbursements.", } as CreditSpeech },
            ].map(flag => <div className="credit-audit-flag" key={flag.id}>
              <span className="credit-flag-icon"><CircleAlert size={15} /></span><span className="credit-flag-copy"><strong>{flag.text}</strong><small>{flag.note}</small></span>
              <CreditListen speech={flag.speech} onSpeak={speech => voice.speak(speech)} />
            </div>)}
          </div>
          <div className="credit-upload-row">
            <label className="credit-upload-box">
              <Upload size={16} /><span><strong>{finance.bankStatementName ?? "Upload bank statement / GSTR-3B"}</strong><small>CSV, XLS, XLSX or PDF · local demo only</small></span>
              <input aria-label="Upload bank statement or GSTR-3B" type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0];
                if (file) loadAudit(file.name);
              }} />
            </label>
            <CreditListen speech={{
              "en-IN": "Upload a bank statement or GSTR-3B file to mark the local audit demo as loaded. This demo stores only the file name and does not transmit or parse the document.",
            }} onSpeak={speech => voice.speak(speech)} />
            <button type="button" className="secondary-btn credit-sample-button" onClick={() => {
              loadAudit("Sample_August_Bank_Statement_and_GSTR-3B.csv");
              onNotify("Sample bank statement and GSTR-3B audit loaded.");
            }}>{finance.bankAuditLoaded ? <CheckCircle2 size={14} /> : <FileText size={14} />}{finance.bankAuditLoaded ? "Sample loaded" : "Load Sample Bank Statement & GSTR-3B"}</button>
          </div>
          {finance.bankAuditLoaded && <div className="credit-audit-loaded"><CheckCircle2 size={14} /><span>Audit sample ready: {finance.bankStatementName}</span><CreditListen speech={{
            "en-IN": `The bank audit demo is ready with ${finance.bankStatementName}. The sample shows three review items and is not a real bank analysis.`,
          }} onSpeak={speech => voice.speak(speech)} /></div>}
        </div>
      </div>
      <div className="credit-checklist">
        <div className="credit-checklist-heading"><div><span className="eyebrow">30-DAY CLEANUP PLAN</span><h3>Build a stronger bank file</h3></div><CreditListen speech={auditSpeech} onSpeak={speech => voice.speak(speech)} /></div>
        {checklist.map((item, index) => <div className="credit-check-row" key={item.id}>
          <label><input type="checkbox" checked={finance.auditChecklist.includes(item.id)} onChange={() => toggleChecklist(item.id)} /><span><strong>{item.title}</strong><small>{item.due}</small></span></label>
          <CreditListen speech={{
            "en-IN": `Cleanup step ${index + 1}: ${item.title}. Target ${item.due}.`,
          }} onSpeak={speech => voice.speak(speech)} />
        </div>)}
      </div>
    </section>

    <div className="credit-two-column">
      <section className="credit-panel credit-debt-panel">
        <div className="credit-panel-heading">
          <div><span className="eyebrow">LIVE DEBT PRIORITIZER</span><h2>Choose what to clear first</h2><p>Switch between interest savings and immediate NPA-risk reduction.</p></div>
          <CreditListen speech={{
            "en-IN": finance.debtMode === "avalanche" ? "Avalanche mode prioritizes the Bajaj Finserv loan at 24 percent annual interest, with an estimated thirty-eight thousand four hundred rupees in interest savings. SBI MUDRA follows, then supplier credit." : "Survival mode clears the supplier credit at 78 days overdue first, before it reaches the 90-day NPA mark. Then prioritize other loans.",
          }} onSpeak={speech => voice.speak(speech)} />
        </div>
        <div className="credit-debt-toggle" role="group" aria-label="Debt prioritization strategy">
          <button type="button" className={finance.debtMode === "avalanche" ? "active" : ""} onClick={() => setDebtMode("avalanche")}>Avalanche Mode</button>
          <button type="button" className={finance.debtMode === "survival" ? "active" : ""} onClick={() => setDebtMode("survival")}>Survival Mode</button>
        </div>
        <div className={`credit-debt-callout ${finance.debtMode}`}>
          <ShieldCheck size={16} /><span>{finance.debtMode === "avalanche" ? <>Highest-cost first · estimated interest savings <strong>₹38,400</strong></> : <>Supplier credit is <strong>78 days overdue</strong> · clear before the Day 90 NPA mark</>}</span>
          <CreditListen speech={finance.debtMode === "avalanche" ? {
            "en-IN": "Avalanche mode pays the highest interest rate first. It targets the Bajaj Finserv loan at 24 percent per year and is estimated to save thirty-eight thousand four hundred rupees.",
          } : {
            "en-IN": "Survival mode prioritizes the supplier credit at 78 days overdue so it can be addressed before the 90-day NPA mark.",
          }} onSpeak={speech => voice.speak(speech)} />
        </div>
        <div className="credit-debt-list">
          {debts.map((debt, index) => <article className="credit-debt-row" key={debt.id}>
            <span className={`credit-debt-rank ${index === 0 ? "top" : ""}`}>{index + 1}</span>
            <div className="credit-debt-main"><strong>{debt.name}</strong><small>{debt.rate} <span>·</span> {debt.overdue}</small></div>
            <strong className="credit-debt-amount tabular-nums">{formatINR(debt.amount)}</strong>
            <CreditListen speech={{
              "en-IN": `${debt.name}. Balance ${formatINR(debt.amount)}. Rate ${debt.rate}. ${debt.overdue}. Priority ${index + 1} in ${finance.debtMode} mode.`,
            }} onSpeak={speech => voice.speak(speech)} />
          </article>)}
        </div>
      </section>

      <section className="credit-panel credit-twin-panel">
        <div className="credit-panel-heading">
          <div><span className="eyebrow">12-MONTH DIGITAL TWIN</span><h2>Cash-flow stress test</h2><p>Compare a steady plan, a buyer delay, and a machine expansion.</p></div>
          <CreditListen speech={stressResult} onSpeak={speech => voice.speak(speech)} label="Listen to Stress Test" />
        </div>
        <div className="credit-scenario-switch" role="group" aria-label="Cash flow scenario">
          <button type="button" className={finance.digitalTwinScenario === "normal" ? "active" : ""} onClick={() => setScenario("normal")}>Normal</button>
          <button type="button" className={finance.digitalTwinScenario === "delay" ? "active danger" : ""} onClick={() => setScenario("delay")}>Customer Delay Shock</button>
          <button type="button" className={finance.digitalTwinScenario === "expansion" ? "active" : ""} onClick={() => setScenario("expansion")}>Expansion Loan</button>
        </div>
        {finance.digitalTwinScenario === "expansion" && <div className="credit-slider-grid">
          <div className="credit-slider-row"><span><strong>New machine loan</strong><b>{formatINR(finance.machineLoan)}</b></span><input aria-label="New machine loan amount" type="range" min="200000" max="1500000" step="50000" value={finance.machineLoan} onChange={event => setFinance(current => ({ ...current, machineLoan: Number(event.target.value) }))} /><small>₹2,00,000 – ₹15,00,000</small><CreditListen speech={{
            "en-IN": `The machine loan simulator is set to ${formatINR(finance.machineLoan)}. Use the slider to compare amounts from two lakh to fifteen lakh rupees.`,
          }} onSpeak={speech => voice.speak(speech)} /></div>
          <div className="credit-slider-row"><span><strong>Expected extra monthly sales</strong><b>{formatINR(finance.extraMonthlySales)}</b></span><input aria-label="Expected extra monthly sales" type="range" min="50000" max="500000" step="10000" value={finance.extraMonthlySales} onChange={event => setFinance(current => ({ ...current, extraMonthlySales: Number(event.target.value) }))} /><small>₹50,000 – ₹5,00,000 · current margin used</small><CreditListen speech={{
            "en-IN": `Expected extra monthly sales are set to ${formatINR(finance.extraMonthlySales)}. The simulator estimates contribution using the current business net margin.`,
          }} onSpeak={speech => voice.speak(speech)} /></div>
        </div>}
        <div className="credit-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#eef2f6" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 8 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tickFormatter={value => `₹${Math.round(Number(value) / 1000)}k`} tick={{ fill: "#94a3b8", fontSize: 8 }} tickLine={false} axisLine={false} width={43} />
              <Tooltip formatter={value => formatINR(Number(value))} contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 7, fontSize: 10 }} />
              <ReferenceLine y={emiSafetyLine} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "EMI safety line", fill: "#dc2626", fontSize: 8, position: "insideTopRight" }} />
              <Line type="monotone" dataKey="cash" name="Projected cash" stroke={finance.digitalTwinScenario === "delay" ? "#dc2626" : "#1d4ed8"} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              {finance.digitalTwinScenario === "delay" && <ReferenceDot x="Month 4" y={monthFourCash} r={5} fill="#dc2626" stroke="#fff" strokeWidth={2} label={{ value: "Month 4", fill: "#dc2626", fontSize: 8, position: "top" }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className={`credit-stress-summary ${finance.digitalTwinScenario === "delay" ? "warning" : ""}`}>
          {finance.digitalTwinScenario === "delay" ? <CircleAlert size={15} /> : <TrendingUp size={15} />}
          <span>{finance.digitalTwinScenario === "delay"
            ? <><strong>Month 4 alert:</strong> two largest buyer invoices worth {formatINR(topBuyerDelay)} are delayed by 30 days. Modelled cash falls to {formatINR(monthFourCash)} against the {formatINR(emiSafetyLine)} EMI line.</>
            : finance.digitalTwinScenario === "expansion"
              ? <><strong>Estimated break-even:</strong> {breakEvenMonth <= 12 ? `Month ${breakEvenMonth}` : "Beyond Month 12"} at {formatINR(additionalMonthlyProfit)} estimated extra monthly contribution.</>
              : <>Normal scenario keeps projected cash above the {formatINR(emiSafetyLine)} EMI safety line. Month 12: {formatINR(chartData[11]?.cash ?? 0)}.</>}</span>
          <CreditListen speech={stressResult} onSpeak={speech => voice.speak(speech)} />
        </div>
      </section>
    </div>

    <section className="credit-panel credit-letters">
      <div className="credit-panel-heading">
        <div><span className="eyebrow">APPLICATION SUPPORT</span><h2>Prepare your next financing conversation</h2><p>Generate printable drafts using the live demo figures. Review all details before submission.</p></div>
        <CreditListen speech={{
          "en-IN": "Prepare a one-page MUDRA or CGTMSE project report, or draft an RBI MSME revival and restructuring letter. These are editable demo templates and need lender and professional review.",
        }} onSpeak={speech => voice.speak(speech)} />
      </div>
      <div className="credit-letter-actions">
        <div className="credit-letter-card"><button type="button" className="credit-letter-open" onClick={() => setLetter("project")}><span className="credit-letter-icon"><FileText size={18} /></span><span><strong>Generate 1-Page MUDRA / CGTMSE Project Report</strong><small>Business profile · operating figures · project summary</small></span><ArrowRight size={16} /></button><CreditListen speech={reportSpeech} onSpeak={speech => voice.speak(speech)} /></div>
        <div className="credit-letter-card"><button type="button" className="credit-letter-open" onClick={() => setLetter("restructuring")}><span className="credit-letter-icon amber"><ShieldCheck size={18} /></span><span><strong>Draft RBI MSME Revival Restructuring Letter</strong><small>Pre-Day-90 moratorium request · editable draft</small></span><ArrowRight size={16} /></button><CreditListen speech={restructuringSpeech} onSpeak={speech => voice.speak(speech)} /></div>
      </div>
    </section>
    {letter && <CreditLetterModal
      type={letter}
      finance={finance}
      onClose={() => setLetter(null)}
      onSpeak={speech => voice.speak(speech)}
      speech={letter === "project" ? reportSpeech : restructuringSpeech}
    />}
  </div>;
}

function CreditLetterModal({ type, finance, speech, onSpeak, onClose }: {
  type: CreditLetterType;
  finance: FinanceState;
  speech: CreditSpeech;
  onSpeak: (text: CreditSpeech) => void;
  onClose: () => void;
}) {
  const project = type === "project";
  return <div className="modal-backdrop legal-backdrop credit-modal-backdrop" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="legal-dialog credit-letter-dialog" role="dialog" aria-modal="true" aria-labelledby="credit-letter-title">
      <header className="legal-dialog-head">
        <span className="legal-dialog-icon blue">{project ? <FileText size={16} /> : <ShieldCheck size={16} />}</span>
        <div><span className="eyebrow">{project ? "PROJECT REPORT DRAFT" : "REVIVAL & RESTRUCTURING REQUEST"}</span><h2 id="credit-letter-title">{project ? "MUDRA / CGTMSE Project Report" : "RBI MSME Revival Letter"}</h2><p>Prefilled for Sri Balaji Precision Components Pvt Ltd · Hyderabad</p></div>
        <CreditListen speech={speech} onSpeak={onSpeak} label="Listen to Letter Summary" />
        <button className="icon-btn" type="button" aria-label="Close letter draft" onClick={onClose}><X size={16} /></button>
      </header>
      <div className="legal-dialog-body credit-letter-body">
        <article className="credit-letter-print">
          <div className="legal-packet-brand"><Logo /><span>{project ? "LENDER PROJECT NOTE" : "BANK REVIVAL REQUEST"}</span></div>
          {project ? <>
            <h3>Project profile &amp; funding request</h3>
            <p><strong>Applicant:</strong> Sri Balaji Precision Components Pvt Ltd, Hyderabad, Telangana</p>
            <p><strong>Business:</strong> Precision components manufacturing for Indian industrial and automotive buyers.</p>
            <p><strong>Project purpose:</strong> Upgrade production capacity and strengthen working capital for raw material procurement against confirmed customer orders.</p>
            <p><strong>Proposed project amount:</strong> {formatINR(finance.machineLoan)} (illustrative simulator amount; confirm quotations and funding requirement).</p>
            <p><strong>Current demo figures:</strong> Sales {formatINR(finance.sales)} · estimated net profit {formatINR(finance.sales - finance.rawMaterial - finance.wages - finance.overheads)} · current cash {formatINR(finance.cash)}.</p>
            <p><strong>Requested consideration:</strong> Please assess eligibility for MUDRA / CGTMSE-backed assistance under applicable lender and scheme terms.</p>
            <p><strong>Documents to attach:</strong> Udyam registration, KYC, GST returns, bank statements, quotations, financial statements and buyer orders.</p>
            <p className="credit-letter-signoff">Authorized Signatory: ____________________ &nbsp; Date: ____________________</p>
          </> : <>
            <h3>Request for MSME revival and restructuring review</h3>
            <p>To: The Branch Manager, <strong>[Bank and Branch — complete before sending]</strong></p>
            <p><strong>Subject:</strong> Request for timely MSME account review and temporary repayment relief before any 90-day overdue classification.</p>
            <p>Dear Sir / Madam,</p>
            <p>Sri Balaji Precision Components Pvt Ltd, Hyderabad, requests a review of its working-capital facilities and a discussion of suitable revival or restructuring support. Delayed buyer receipts have created temporary working-capital pressure while supplier dues are being regularized.</p>
            <p>We request an early meeting to review cash flows, repayment capacity, and any permissible short-term relief under applicable RBI directions and the bank&apos;s policy. We will provide a current receivables ageing, bank statements, GST returns, and a proposed repayment plan.</p>
            <p><strong>Account / facility reference:</strong> [Complete before submission] &nbsp; <strong>Contact:</strong> [Complete before submission]</p>
            <p>We request that the account position be reviewed promptly and that no eligibility or outcome be assumed until the bank has assessed the complete records.</p>
            <p>Yours faithfully,<br />Authorized Signatory: ____________________ &nbsp; Date: ____________________</p>
          </>}
        </article>
        <p className="credit-letter-disclaimer">Illustrative draft only; not a sanction, eligibility determination, or legal advice. Verify figures, scheme rules, and account details with your lender and professional adviser before submission.</p>
      </div>
      <footer className="credit-letter-footer"><CreditListen speech={speech} onSpeak={onSpeak} label="Listen to Letter Summary" /><span /><button type="button" className="secondary-btn" onClick={onClose}>Close</button><button type="button" className="primary-btn" onClick={() => window.print()}><Printer size={14} /> Print draft</button></footer>
    </section>
  </div>;
}

function ShopFloorOpsDashboard({ finance, setFinance, onNotify }: {
  finance: FinanceState;
  setFinance: React.Dispatch<React.SetStateAction<FinanceState>>;
  onNotify: (message: string) => void;
}) {
  const voice = useVoice();
  const spendableCash = Math.max(0, finance.cash - finance.taxVault);
  const rawMaterialUnitCost = finance.bulkPurchaseApproved ? 633.4 : 680;
  const unitProfit = 1200 - rawMaterialUnitCost - 365;
  const unitProfitMargin = unitProfit / 1200 * 100;
  const dailyLaborSaving = 4 * finance.unskilledHelperWage - finance.skilledOperatorWage;
  const monthlyLaborSaving = dailyLaborSaving * 26;
  const improvedShiftOutput = Math.round(finance.dailyOrderVolume * 1.35);
  const bomSpeech: CreditSpeech = finance.bulkPurchaseApproved ? {
    "en-IN": "Bulk purchase recorded for the Precision CNC Valve Housing. The demo estimates eighteen thousand five hundred rupees saved. Raw material cost is modelled at about six hundred thirty-three rupees per unit; unit net profit is about two hundred two rupees, or 16.8 percent, above the 15 percent safe threshold.",
  } : {
    "en-IN": "Margin alert for the Precision CNC Valve Housing. After a 12 percent CRCA steel price spike, material costs are six hundred eighty rupees per unit. With selling price one thousand two hundred and labor and overheads three hundred sixty-five rupees, net profit is one hundred fifty-five rupees, or 12.9 percent, below the 15 percent safe threshold. The bulk-buy demo could save eighteen thousand five hundred rupees and restore margin to 16.8 percent.",
  };
  const approveBulkPurchase = () => {
    if (finance.bulkPurchaseApproved) return;
    if (spendableCash < 120000) {
      onNotify(`Bulk purchase blocked: only ${formatINR(spendableCash)} is spendable after the Tax-Vault reserve.`);
      return;
    }
    setFinance(current => current.bulkPurchaseApproved || current.cash - current.taxVault < 120000 ? current : ({
      ...current,
      cash: current.cash - 120000,
      bulkPurchaseApproved: true,
      entries: [{
        id: `bulk-material-${Date.now()}`, label: "Steel & brass bulk inventory", amount: 120000,
        type: "outflow", date: "Today", source: "Shop-Floor Ops",
      }, ...current.entries],
    }));
    onNotify("Bulk steel & brass purchase approved. ₹1,20,000 deducted from spendable cash.");
  };
  const toggleSopStep = (stepId: string) => setFinance(current => ({
    ...current,
    sopChecklist: current.sopChecklist.includes(stepId)
      ? current.sopChecklist.filter(id => id !== stepId)
      : [...current.sopChecklist, stepId],
  }));
  const shopSteps: Array<{ id: string; title: string; speech: CreditSpeech }> = [
    { id: "isolate", title: "Stop spindle; isolate power and confirm zero-energy state.", speech: {
      "en-IN": "Stop the spindle, isolate machine power, and confirm the machine is in a zero-energy state before inspection.",
    } },
    { id: "clean", title: "Clean spindle taper, tool holder, and contact surfaces.", speech: {
      "en-IN": "Clean the spindle taper, tool holder, and contact surfaces with the approved lint-free cloth. Do not use compressed air toward a person.",
    } },
    { id: "runout", title: "Check spindle runout with the approved gauge; record the reading.", speech: {
      "en-IN": "Fit the approved gauge and check spindle runout using the machine procedure. Record the reading and stop for supervisor review if it exceeds the service limit.",
    } },
    { id: "coolant", title: "Verify coolant level, filter, pressure gauge, and visible flow.", speech: {
      "en-IN": "Check coolant level and filter, then verify pressure and visible flow against the machine specification. Report leaks or abnormal pressure before restarting.",
    } },
    { id: "test", title: "Close guards; run a low-speed test and log the final checks.", speech: {
      "en-IN": "Refit guards, clear tools from the work area, and run a low-speed test cycle. Log the final checks and get supervisor sign-off before production.",
    } },
  ];
  const fullSopSpeech: CreditSpeech = {
    "en-IN": shopSteps.map((step, index) => `Step ${index + 1}. ${step.speech["en-IN"]}`).join(" "),
  };
  const skuRows = [
    { name: "SS-316 Hydraulic Flange", margin: "28%", detail: "Corrosion-resistant · repeat industrial demand", speech: { "en-IN": "Top margin SKU: S S 316 Hydraulic Flange, 28 percent net margin. List on GeM for public procurement discovery, IndiaMART for industrial enquiries, and Amazon Business for catalog reach.", } },
    { name: "Precision CNC Valve Housing", margin: finance.bulkPurchaseApproved ? "16.8%" : "12.9%", detail: finance.bulkPurchaseApproved ? "Bulk steel & brass price locked" : "CRCA steel spike under review", speech: { "en-IN": `Precision CNC Valve Housing has a ${finance.bulkPurchaseApproved ? "16.8" : "12.9"} percent net margin ${finance.bulkPurchaseApproved ? "after the demo bulk purchase" : "after the CRCA steel price spike"}. Review raw material pricing before quoting new orders.`, } },
    { name: "Brass Pump Bush", margin: "22%", detail: "Compact component · suitable for B2B packs", speech: { "en-IN": "Brass Pump Bush has an illustrative 22 percent net margin. Bundle compatible sizes for B2B buyers and confirm minimum order quantities before listing.", } },
  ];
  const channelCards = [
    { name: "GeM", description: "Government e-Marketplace · prepare vendor registration and tender documents.", speech: { "en-IN": "GeM is the Government e-Marketplace. Prepare vendor registration, product specifications, and tender documents before listing.", } },
    { name: "IndiaMART", description: "B2B discovery · qualify enquiries and quote MOQ / lead time.", speech: { "en-IN": "IndiaMART can help buyers discover your B2B catalog. Qualify enquiries and include minimum order quantity and lead time in each quote.", } },
    { name: "Amazon Business", description: "Business catalog reach · standardize pack sizes and product data.", speech: { "en-IN": "Amazon Business offers a business-focused catalog channel. Standardize pack sizes, product data, and fulfillment terms before onboarding.", } },
  ];
  const laborSpeech: CreditSpeech = {
    "en-IN": `At ${finance.dailyOrderVolume} daily units, one skilled CNC operator at ${formatINR(finance.skilledOperatorWage)} per day replaces four helpers at ${formatINR(finance.unskilledHelperWage)} each. This is a daily ${dailyLaborSaving >= 0 ? "saving" : "additional cost"} of ${formatINR(Math.abs(dailyLaborSaving))} and a 26-day monthly ${dailyLaborSaving >= 0 ? "saving" : "additional cost"} of ${formatINR(Math.abs(monthlyLaborSaving))}. Shift output is modelled 35 percent higher, approximately ${improvedShiftOutput} units.`,
  };

  return <div className="ops-page">
    <header className="ops-heading"><div><span className="eyebrow">PRODUCTION &amp; OPERATIONS</span><h1>Shop-Floor Ops</h1><p>Connect material costs, shift capacity, and shop-floor routines.</p></div><div className="ops-status-chip"><Building2 size={15} /><span>Sri Balaji Precision Components<small>Hyderabad · Manufacturing</small></span><CreditListen speech={{
      "en-IN": "Shop-floor operations for Sri Balaji Precision Components in Hyderabad.",
    }} onSpeak={speech => voice.speak(speech)} /></div></header>

    <section className="ops-panel ops-bom-panel">
      <div className="ops-panel-head"><div><span className="eyebrow">RAW MATERIAL PRICE SPIKE · MODULE 3</span><h2>Unit BOM margin &amp; bulk-buy timing</h2><p>Precision CNC Valve Housing · CRCA steel price is up 12%.</p></div><CreditListen speech={bomSpeech} onSpeak={speech => voice.speak(speech)} /></div>
      <div className="ops-bom-layout">
        <div className="ops-bom-stats">
          {[{ label: "Selling price / unit", value: 1200 }, { label: "Raw material / unit", value: rawMaterialUnitCost }, { label: "Labor & overhead / unit", value: 365 }].map(item => <article className="ops-metric" key={item.label}><span>{item.label}</span><strong>{formatINR(item.value)}</strong><CreditListen speech={{
            "en-IN": `${item.label}: ${formatINR(item.value)} per unit for Precision CNC Valve Housing.`,
          }} onSpeak={speech => voice.speak(speech)} /></article>)}
          <article className={`ops-metric ${finance.bulkPurchaseApproved ? "ops-margin-restored" : "ops-margin-alert"}`}><span>Net profit / unit</span><strong>{formatINR(unitProfit)} <small>· {unitProfitMargin.toFixed(1)}%</small></strong><span className="ops-risk-badge">{finance.bulkPurchaseApproved ? <CheckCircle2 size={12} /> : <CircleAlert size={12} />}{finance.bulkPurchaseApproved ? "Above 15% safe margin" : "Below 15% safe margin"}</span><CreditListen speech={bomSpeech} onSpeak={speech => voice.speak(speech)} /></article>
        </div>
        <article className="ops-bulk-card">
          <div className="ops-bulk-title"><span className="ops-icon emerald"><TrendingUp size={16} /></span><div><strong>{finance.bulkPurchaseApproved ? "Bulk purchase recorded" : "Bulk-buy opportunity"}</strong><small>Steel &amp; brass inventory lock-in today</small></div></div>
          <div className="ops-bulk-metrics"><span>Potential saving<strong>₹18,500</strong></span><span>Restored unit margin<strong>16.8%</strong></span></div>
          <div className="ops-bulk-footer"><CreditListen speech={{
            "en-IN": `Bulk-buy opportunity: lock in one lakh twenty thousand rupees of steel and brass inventory. The demo estimates eighteen thousand five hundred rupees saved and unit margin restored to 16.8 percent. Spendable cash is ${formatINR(spendableCash)} after the protected tax reserve.`,
          }} onSpeak={speech => voice.speak(speech)} />
            <button type="button" className="primary-btn ops-approve-button" disabled={finance.bulkPurchaseApproved || spendableCash < 120000} onClick={approveBulkPurchase}>{finance.bulkPurchaseApproved ? <><CheckCircle2 size={14} /> Purchase approved</> : <>Approve Bulk Purchase <ArrowRight size={14} /></>}</button></div>
        </article>
      </div>
      {finance.bulkPurchaseApproved && <div className="ops-success-note"><CheckCircle2 size={14} /><span>₹1,20,000 bulk inventory purchase recorded. Unit margin scenario now shows 16.8%.</span><CreditListen speech={{
        "en-IN": "Bulk purchase recorded. One lakh twenty thousand rupees has been deducted from spendable cash, and the valve housing margin scenario is now 16.8 percent.",
      }} onSpeak={speech => voice.speak(speech)} /></div>}
    </section>

    <section className="ops-panel">
      <div className="ops-panel-head"><div><span className="eyebrow">LABOR &amp; CAPACITY PLANNING · MODULE 4</span><h2>Skilled vs. unskilled labor &amp; shift optimizer</h2><p>Adjust volume and daily wages to compare the sample staffing plan.</p></div><CreditListen speech={laborSpeech} onSpeak={speech => voice.speak(speech)} /></div>
      <div className="ops-labor-grid">
        <div className="ops-sliders-card">
          {[
            { key: "dailyOrderVolume", label: "Daily order volume", value: finance.dailyOrderVolume, min: 50, max: 500, step: 10, format: (value: number) => `${value} units` },
            { key: "skilledOperatorWage", label: "Skilled CNC operator wage", value: finance.skilledOperatorWage, min: 500, max: 2000, step: 50, format: (value: number) => `${formatINR(value)} / day` },
            { key: "unskilledHelperWage", label: "Unskilled helper wage", value: finance.unskilledHelperWage, min: 250, max: 1200, step: 25, format: (value: number) => `${formatINR(value)} / day` },
          ].map(item => <div className="ops-slider-row" key={item.key}><div><strong>{item.label}</strong><b>{item.format(item.value)}</b></div><input aria-label={item.label} type="range" min={item.min} max={item.max} step={item.step} value={item.value} onChange={event => setFinance(current => ({ ...current, [item.key]: Number(event.target.value) }))} /><CreditListen speech={{
            "en-IN": `${item.label} is set to ${item.format(item.value)}. Use the slider to test the staffing plan.`,
          }} onSpeak={speech => voice.speak(speech)} /></div>)}
        </div>
        <article className="ops-labor-comparison">
          <div className="ops-panel-subhead"><strong>Live labor comparison</strong><CreditListen speech={laborSpeech} onSpeak={speech => voice.speak(speech)} /></div>
          <div className="ops-labor-numbers"><span>1 skilled CNC operator<strong>{formatINR(finance.skilledOperatorWage)} / day</strong></span><span className="ops-vs">VS</span><span>4 unskilled helpers<strong>{formatINR(finance.unskilledHelperWage * 4)} / day</strong></span><CreditListen speech={laborSpeech} onSpeak={speech => voice.speak(speech)} /></div>
          <div className={`ops-saving-callout ${dailyLaborSaving < 0 ? "negative" : ""}`}><TrendingUp size={16} /><span>{dailyLaborSaving >= 0 ? "Estimated saving" : "Additional daily cost"}<strong>{formatINR(Math.abs(dailyLaborSaving))} / day · {formatINR(Math.abs(monthlyLaborSaving))} / 26-day month</strong></span><CreditListen speech={laborSpeech} onSpeak={speech => voice.speak(speech)} /></div>
          <div className="ops-output-callout"><span>Modelled shift output lift</span><strong>+35% <small>≈ {improvedShiftOutput} units at today&apos;s volume</small></strong><CreditListen speech={{
            "en-IN": `The model assumes a 35 percent shift output lift. At ${finance.dailyOrderVolume} orders per day, that is approximately ${improvedShiftOutput} units.`,
          }} onSpeak={speech => voice.speak(speech)} /></div>
        </article>
      </div>
      <article className="ops-shift-schedule"><div className="ops-panel-subhead"><strong>Peak day vs. slow day shift schedule</strong><CreditListen speech={{
        "en-IN": `Peak day: run two staggered shifts with a skilled CNC operator on each critical machine, cross-train helpers, and confirm material before overtime. Slow day: keep one skilled operator on calibration and preventive maintenance, then use helpers for inspection and kitting.`,
      }} onSpeak={speech => voice.speak(speech)} /></div>
        <div className="ops-shift-day"><span className="ops-shift-tag peak">PEAK DAY</span><p>2 staggered shifts · skilled operator on bottleneck CNC · helpers cross-trained for loading and inspection.</p><small>Confirm materials and dispatch cut-off before approving overtime.</small><CreditListen speech={{
          "en-IN": "Peak day schedule: run two staggered shifts, assign a skilled operator to each bottleneck CNC, and cross-train helpers for loading and inspection. Confirm materials and dispatch cut-off before overtime.",
        }} onSpeak={speech => voice.speak(speech)} /></div>
        <div className="ops-shift-day"><span className="ops-shift-tag slow">SLOW DAY</span><p>1 planned shift · calibration and preventive maintenance · helpers support inspection and kitting.</p><small>Use available capacity for training and setup reduction.</small><CreditListen speech={{
          "en-IN": "Slow day schedule: keep one planned shift for calibration and preventive maintenance, use helpers for inspection and kitting, and use spare capacity for training and setup reduction.",
        }} onSpeak={speech => voice.speak(speech)} /></div>
      </article>
    </section>

    <section className="ops-panel ops-sop-panel">
      <div className="ops-panel-head"><div><span className="eyebrow">VERNACULAR SHOP-FLOOR SOP</span><h2>CNC spindle calibration &amp; coolant pressure check</h2><p>Use your approved machine manual, safe-isolation procedure, and supervisor sign-off.</p></div><CreditListen speech={fullSopSpeech} onSpeak={speech => voice.speak(speech)} /></div>
      <div className="ops-sop-controls"><label className="ops-language-select"><span>Instruction language</span><select value={voice.language} onChange={event => voice.setLanguage(event.target.value as Language)} aria-label="SOP instruction language"><option value="en-IN">English</option><option value="hi-IN">Hindi</option><option value="te-IN">Telugu</option></select></label><button className="primary-btn ops-speak-worker" type="button" onClick={() => voice.speak(fullSopSpeech)}><Volume2 size={15} /> Speak Instructions to Worker</button><CreditListen speech={fullSopSpeech} onSpeak={speech => voice.speak(speech)} label="Listen to SOP" /></div>
      <div className="ops-sop-checklist">{shopSteps.map((step, index) => <div className="ops-sop-row" key={step.id}><label><input type="checkbox" checked={finance.sopChecklist.includes(step.id)} onChange={() => toggleSopStep(step.id)} /><span><b>{String(index + 1).padStart(2, "0")}</b><strong>{step.title}</strong></span></label><CreditListen speech={step.speech} onSpeak={speech => voice.speak(speech)} /></div>)}</div>
      <div className="ops-sop-warning"><ShieldCheck size={14} /><span>Training aid only. Follow the site lockout/tagout procedure and the machine manufacturer&apos;s limits.</span><CreditListen speech={{
        "en-IN": "Safety reminder: This is a training aid only. Follow the site lockout and tagout procedure, and the machine manufacturer's specified limits.",
      }} onSpeak={speech => voice.speak(speech)} /></div>
    </section>

    <section className="ops-panel">
      <div className="ops-panel-head"><div><span className="eyebrow">HIGH-MARGIN SKU &amp; B2B CHANNEL FINDER</span><h2>Put the right products in front of buyers</h2><p>Illustrative margin ranking and channel ideas for the product catalog.</p></div><CreditListen speech={{
        "en-IN": "The top-margin SKU is SS-316 Hydraulic Flange at 28 percent net margin. Consider GeM for public procurement discovery, IndiaMART for industrial enquiries, and Amazon Business for catalog reach. Confirm channel fees, eligibility, and product specifications before onboarding.",
      }} onSpeak={speech => voice.speak(speech)} /></div>
      <div className="ops-sku-list">{skuRows.map((sku, index) => <article className={`ops-sku-row ${index === 0 ? "featured" : ""}`} key={sku.name}><span className="ops-sku-rank">{index + 1}</span><div className="ops-sku-info"><strong>{sku.name}</strong><small>{sku.detail}</small></div><strong className="ops-sku-margin">{sku.margin}<small>net margin</small></strong><CreditListen speech={sku.speech} onSpeak={speech => voice.speak(speech)} /></article>)}</div>
      <div className="ops-channel-grid">{channelCards.map(channel => <article className="ops-channel-card" key={channel.name}><span className="ops-icon blue"><Building2 size={15} /></span><div><strong>{channel.name}</strong><small>{channel.description}</small></div><CreditListen speech={channel.speech} onSpeak={speech => voice.speak(speech)} /></article>)}</div>
    </section>
  </div>;
}

function PlaceholderPage({ tab, onQuickAdd }: { tab: Tab; onQuickAdd: () => void }) {
  const content = {
    "Legal & Invoices": { eyebrow: "DOCUMENTS & RECEIVABLES", title: "Keep every agreement in view.", body: "A focused place for invoices, buyer commitments, delivery records and follow-ups.", icon: FileCheck2, cards: [["Invoice register", "Track every invoice from dispatch through payment.", "12 records"], ["Buyer agreements", "Keep commercial terms and credit days close at hand.", "4 documents"], ["Delivery evidence", "Organize e-way bills, challans and proof of acceptance.", "8 files"]] },
    "Credit & Loans": { eyebrow: "FUNDING & WORKING CAPITAL", title: "Find room to grow.", body: "Understand your working-capital picture and prepare for your next financing conversation.", icon: Landmark, cards: [["Working capital", "A simple view of the cash tied up in your operating cycle.", "Coming soon"], ["Loan readiness", "Gather the documents lenders commonly ask to review.", "6 of 9 ready"], ["Credit options", "Explore suitable finance pathways for your business.", "Coming soon"]] },
    "Shop-Floor Ops": { eyebrow: "PRODUCTION & OPERATIONS", title: "From shop floor to cash flow.", body: "Bring production commitments and business finances into the same conversation.", icon: Building2, cards: [["Production pulse", "A snapshot of open jobs and delivery commitments.", "3 active jobs"], ["Materials planning", "See upcoming purchases alongside your cash position.", "2 orders due"], ["Dispatch tracker", "Stay on top of dispatch dates and customer delivery.", "4 this week"]] },
    "TAX & GST": { eyebrow: "TAX & COMPLIANCE", title: "Stay ready, not rushed.", body: "A clear workspace for GST dates, tax documents and the details your adviser needs.", icon: ShieldCheck, cards: [["GST calendar", "Keep filing and payment dates in one place.", "Next: 20 Dec"], ["Input tax credit", "Review purchase records before your next return.", "Review needed"], ["Tax documents", "Collect reports and source documents for your adviser.", "7 documents"]] },
    "Overview": { eyebrow: "", title: "", body: "", icon: LayoutDashboard, cards: [] },
  }[tab];
  const Icon = content.icon;
  return <div className="placeholder-page">
    <div className="placeholder-breadcrumb"><span>YOUR WORKSPACE</span><span>/</span><strong>{tab.toUpperCase()}</strong></div>
    <section className="placeholder-hero"><div className="placeholder-icon"><Icon size={21} /></div><div className="eyebrow">{content.eyebrow}</div><h1>{content.title}</h1><p>{content.body}</p><div className="placeholder-meta"><span><span className="live-dot" /> PRIVATE WORKSPACE</span><span>·</span><span>SRI BALAJI PRECISION COMPONENTS</span></div></section>
    <div className="placeholder-grid">{content.cards.map(([title, body, meta], index) => <article className="placeholder-card" key={title}><span className={`placeholder-card-icon tone-${index}`}><Icon size={17} /></span><span className="placeholder-card-meta">{index === 0 ? "WORKSPACE" : index === 1 ? "OVERVIEW" : "UP NEXT"}</span><h2>{title}</h2><p>{body}</p><div className="placeholder-card-bottom"><span>{meta}</span><ArrowRight size={15} /></div></article>)}</div>
    <div className="placeholder-note"><Sparkles size={16} /><span><strong>Your MunimAI workspace is ready.</strong> Detailed tools for {tab.toLowerCase()} are coming next. Your demo data stays on this device.</span><button onClick={onQuickAdd}>Add transaction <Plus size={14} /></button></div>
  </div>;
}

type LegalDialogState =
  | { kind: "negotiation"; buyerId: string }
  | { kind: "tax"; invoiceId: string }
  | { kind: "odr"; invoiceId: string };

const DAY_MS = 24 * 60 * 60 * 1000;

function addDaysToISO(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${dateValue}T12:00:00`));
}

function invoiceTiming(invoice: LegalInvoice, now: Date) {
  if (!invoice.acceptanceDate) return { daysElapsed: 0, daysRemaining: 45, daysLate: 0, daysToAcceptance: 0 };
  const acceptance = new Date(`${invoice.acceptanceDate}T00:00:00`);
  const daysElapsed = Math.floor((now.getTime() - acceptance.getTime()) / DAY_MS);
  return {
    daysElapsed: Math.max(0, daysElapsed),
    daysRemaining: Math.max(0, 45 - daysElapsed),
    daysLate: Math.max(0, daysElapsed - 45),
    daysToAcceptance: Math.max(0, -daysElapsed),
  };
}

function invoiceStage(invoice: LegalInvoice, daysElapsed: number, daysToAcceptance: number) {
  if (!invoice.acceptanceDate) return "Pending Acceptance";
  if (daysToAcceptance > 0) return "Pending Acceptance";
  if (daysElapsed > 45) return "Overdue — ODR Ready";
  if (daysElapsed >= 40) return "Critical Legal Cutoff";
  if (daysElapsed > 30) return "43B(h) Warning Zone";
  if (daysElapsed > 20) return "TReDS Eligible";
  return "Accepted";
}

function buyerRiskLabel(score: number) {
  if (score < 50) return "High Risk";
  if (score < 60) return "Caution";
  if (score >= 85) return "Trusted";
  return "Moderate";
}

function buyerSpeech(buyer: LegalBuyer): Record<Language, string> {
  const risk = buyerRiskLabel(buyer.paymentScore);
  const localizedRisk = {
    "en-IN": risk,
  };
  const recommendation = buyer.paymentScore < 60
    ? {
      "en-IN": "For a new order, protect raw-material cash with a 50 percent advance or split deliveries into milestones.",
    }
    : {
      "en-IN": "Keep agreed credit terms in writing and monitor the invoice due date.",
    };
  return {
    "en-IN": `${buyer.name}. Payment score ${buyer.paymentScore} out of 100, ${risk}. Average payment time ${buyer.avgPaymentDays} days and credit limit ${formatINR(buyer.creditLimit)}. ${recommendation["en-IN"]}`,
  };
}

function negotiationSpeech(buyer: LegalBuyer): Record<Language, string> {
  const isRisky = buyer.paymentScore < 60;
  return {
    "en-IN": `${isRisky ? "Risk alert." : "Buyer profile."} ${buyer.name} has a payment score of ${buyer.paymentScore} out of 100. For a 3 lakh rupee order, require 1 lakh 50 thousand rupees, or 50 percent, upfront to cover raw materials; split delivery into four milestones of 75 thousand rupees each; or offer a 4 thousand 500 rupee discount for payment within 7 days.`,
  };
}

function invoiceSpeech(invoice: LegalInvoice, buyer: LegalBuyer, daysElapsed: number, daysRemaining: number, daysToAcceptance: number, proofMissing: boolean): Record<Language, string> {
  if (!proofMissing && daysToAcceptance > 0) {
    const acceptanceDate = displayDate(invoice.acceptanceDate!);
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}. Delivery proof is recorded. Deemed acceptance is locked for ${acceptanceDate}, in ${daysToAcceptance} days; the 45-day legal clock starts on that date.`,
    };
  }
  if (proofMissing) {
    const acceptanceDate = displayDate(addDaysToISO(invoice.deliveryDate, 15));
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}. Delivery was ${displayDate(invoice.deliveryDate)} and acceptance is pending. Upload the E-Way Bill or challan now; deemed acceptance is ${acceptanceDate}, then the 45-day legal clock begins.`,
    };
  }
  if (daysElapsed > 45) {
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}, is at Day ${daysElapsed}, ${daysElapsed - 45} days past the 45-day limit. Serve the statutory demand notice and prepare the MSME ODR packet at odr.msme.gov.in.`,
    };
  }
  if (daysElapsed >= 40) {
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}, is at Day ${daysElapsed} with ${daysRemaining} days to the 45-day cutoff. Send a written final payment reminder, preserve delivery proof and be ready to file an ODR claim if unpaid.`,
    };
  }
  if (daysElapsed > 30) {
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}, is at Day ${daysElapsed} with ${daysRemaining} days left before the 45-day cutoff. Send a written payment reminder, confirm acceptance and retain the purchase order, invoice and delivery proof.`,
    };
  }
  if (daysElapsed > 20) {
    return {
      "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}, is at Day ${daysElapsed} with ${daysRemaining} days to the 45-day limit. It is eligible for a simulated TReDS offer; confirm the buyer details and consider early discounting.`,
    };
  }
  return {
    "en-IN": `Invoice ${invoice.number} for ${buyer.name}, amount ${formatINR(invoice.amount)}, is at Day ${daysElapsed}. Confirm acceptance and keep the purchase order, tax invoice and delivery evidence together. The 45-day payment window has ${daysRemaining} days remaining.`,
  };
}

function legalTaxSpeech(invoice: LegalInvoice, buyer: LegalBuyer, daysLate: number, taxImpact: number, interest: number): Record<Language, string> {
  return {
    "en-IN": `Section 43 B h estimate for invoice ${invoice.number}, buyer ${buyer.name}. If unpaid beyond Day 45, the buyer's 25.17 percent tax deduction impact is approximately ${formatINR(taxImpact)} on this invoice. The illustrative daily-compound interest at about 19.5 percent per year is ${formatINR(interest)} for ${daysLate} late days. Verify the applicable tax treatment and RBI rate with your adviser.`,
  };
}

function LegalInvoicesDashboard({ finance, setFinance, autoOpenBuyerId, onPromptHandled, onNotify }: {
  finance: FinanceState;
  setFinance: React.Dispatch<React.SetStateAction<FinanceState>>;
  autoOpenBuyerId: string | null;
  onPromptHandled: () => void;
  onNotify: (message: string) => void;
}) {
  const voice = useVoice();
  const [dialog, setDialog] = useState<LegalDialogState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const buyerById = useMemo(() => new Map(finance.buyers.map(buyer => [buyer.id, buyer])), [finance.buyers]);
  const invoiceRows = useMemo(() => finance.legalInvoices.map(invoice => {
    const buyer = buyerById.get(invoice.buyerId);
    if (!buyer) throw new Error(`Missing buyer ${invoice.buyerId} for invoice ${invoice.number}`);
    const timing = invoiceTiming(invoice, now);
    return { invoice, buyer, ...timing, stage: invoiceStage(invoice, timing.daysElapsed, timing.daysToAcceptance) };
  }), [finance.legalInvoices, buyerById, now]);

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!autoOpenBuyerId) return;
    if (buyerById.has(autoOpenBuyerId)) setDialog({ kind: "negotiation", buyerId: autoOpenBuyerId });
    onPromptHandled();
  }, [autoOpenBuyerId, buyerById, onPromptHandled]);

  const openNegotiation = (buyerId: string) => setDialog({ kind: "negotiation", buyerId });
  const uploadDeliveryEvidence = (invoiceId: string) => {
    const invoice = finance.legalInvoices.find(item => item.id === invoiceId);
    if (!invoice) return;
    const acceptanceDate = addDaysToISO(invoice.deliveryDate, 15);
    setFinance(current => ({
      ...current,
      legalInvoices: current.legalInvoices.map(item => item.id === invoiceId
        ? { ...item, eWayBillUploaded: true, acceptanceDate }
        : item),
    }));
    onNotify(`E-Way Bill / Challan recorded. Deemed acceptance is locked for ${displayDate(acceptanceDate)}.`);
  };

  const switchToTreds = (invoice: LegalInvoice, buyer: LegalBuyer) => {
    const fee = Math.round(invoice.amount * 0.011);
    const netCash = invoice.amount - fee;
    const entry: LedgerEntry = {
      id: crypto.randomUUID(),
      label: `TReDS settlement · ${invoice.number}`,
      amount: netCash,
      type: "inflow",
      date: "Within 48 hours",
      source: "RXIL / M1xchange (demo)",
    };
    setFinance(current => ({
      ...current,
      cash: current.cash + netCash,
      receivables: Math.max(0, current.receivables - invoice.amount),
      entries: [entry, ...current.entries],
      legalInvoices: current.legalInvoices.map(item => item.id === invoice.id ? { ...item, tredsSettled: true } : item),
    }));
    onNotify(`TReDS simulated for ${buyer.name}: ${formatINR(netCash)} net cash after ${formatINR(fee)} fee.`);
    voice.speak({
      "en-IN": `TReDS discounting simulated for ${invoice.number}, buyer ${buyer.name}. ${formatINR(netCash)} net cash after a 1.1 percent fee of ${formatINR(fee)} is added to current cash, with settlement within 48 hours.`,
    });
  };

  const openOdrPacket = (invoiceId: string) => {
    setFinance(current => ({
      ...current,
      legalInvoices: current.legalInvoices.map(item => item.id === invoiceId ? { ...item, odrPacketGenerated: true } : item),
    }));
    setDialog({ kind: "odr", invoiceId });
  };

  const openTaxDialog = (invoiceId: string) => setDialog({ kind: "tax", invoiceId });
  const totalOpen = invoiceRows.filter(row => !row.invoice.tredsSettled).reduce((total, row) => total + row.invoice.amount, 0);
  const riskExposure = invoiceRows.filter(row => row.buyer.paymentScore < 60 && !row.invoice.tredsSettled).reduce((total, row) => total + row.invoice.amount, 0);
  const warnings = invoiceRows.filter(row => row.daysElapsed > 30 && row.invoice.acceptanceDate && !row.invoice.tredsSettled);
  const overdue = invoiceRows.filter(row => row.daysElapsed > 45 && !row.invoice.tredsSettled);
  const activeDialogInvoice = dialog && dialog.kind !== "negotiation" ? invoiceRows.find(row => row.invoice.id === dialog.invoiceId) : undefined;
  const activeDialogBuyer = dialog?.kind === "negotiation" ? buyerById.get(dialog.buyerId) : activeDialogInvoice?.buyer;

  return <div className="legal-page">
    <div className="legal-heading">
      <div>
        <div className="eyebrow"><span className="live-dot" /> MSME 43B(h) SHIELD <span className="heading-separator">·</span> HYDERABAD, TELANGANA</div>
        <h1>Protect every invoice. Preserve every right.</h1>
        <p>Track deemed acceptance, payment windows and practical next steps for your buyer ledger.</p>
      </div>
      <button className="listen-btn legal-heading-listen" onClick={() => voice.speak({
        "en-IN": "MSME 43 B h Shield for Sri Balaji Precision Components in Hyderabad. Track delivery proof, deemed acceptance, the 45-day payment window and written buyer follow-up. This is a demo workflow, not legal advice.",
      })}><Volume2 size={15} /> Listen</button>
    </div>

    <div className="legal-kpi-grid">
      <article className="legal-kpi"><div className="legal-kpi-label">OPEN INVOICES</div><strong className="tabular-nums">{formatINR(totalOpen)}</strong><small>{invoiceRows.filter(row => !row.invoice.tredsSettled).length} invoices in the ledger</small><button className="listen-btn legal-kpi-listen" aria-label="Listen to open invoice exposure" onClick={() => voice.speak({
        "en-IN": `${formatINR(totalOpen)} across ${invoiceRows.filter(row => !row.invoice.tredsSettled).length} open legal invoices.`,
      })}><Volume2 size={15} /><span>Listen</span></button></article>
      <article className="legal-kpi"><div className="legal-kpi-label">43B(h) WATCH</div><strong>{warnings.length} <span>invoices</span></strong><small>Past Day 30 or beyond</small><button className="listen-btn legal-kpi-listen" aria-label="Listen to 43B(h) watch" onClick={() => voice.speak({
        "en-IN": `${warnings.length} open invoices are past Day 30. Review the written payment reminders and keep evidence ready before the 45-day limit.`,
      })}><Volume2 size={15} /><span>Listen</span></button></article>
      <article className="legal-kpi"><div className="legal-kpi-label">HIGH-RISK EXPOSURE</div><strong className="tabular-nums">{formatINR(riskExposure)}</strong><small>Open invoices for buyers below 60 score</small><button className="listen-btn legal-kpi-listen" aria-label="Listen to high-risk exposure" onClick={() => voice.speak({
        "en-IN": `High-risk buyers below a 60 payment score have ${formatINR(riskExposure)} in open invoices. Consider an advance, milestone billing or early-payment terms.`,
      })}><Volume2 size={15} /><span>Listen</span></button></article>
    </div>

    <section className="legal-section panel">
      <div className="legal-section-head">
        <div><span className="legal-section-kicker">BUYER PAYMENT PROFILE</span><h2>Know your buyer before you extend credit.</h2><p>Payment scores are illustrative risk indicators for this demo ledger.</p></div>
        <button className="listen-btn" onClick={() => voice.speak({
          "en-IN": `Five Hyderabad buyer profiles are available. Buyers scoring below 60 should be reviewed before extending credit.`,
        })}><Volume2 size={15} /><span>Listen</span></button>
      </div>
      <div className="legal-buyer-grid">
        {finance.buyers.map(buyer => {
          const risk = buyerRiskLabel(buyer.paymentScore);
          return <article className="legal-buyer-card" key={buyer.id}>
            <div className="legal-buyer-title"><span className="legal-buyer-icon"><Building2 size={16} /></span><span className={`legal-risk-badge ${risk === "Trusted" ? "trusted" : risk === "High Risk" ? "high-risk" : "caution"}`}>{risk}</span></div>
            <h3>{buyer.name}</h3>
            <small className="legal-gstin">{buyer.gstin}</small>
            <div className="legal-score-line"><strong>{buyer.paymentScore}<small>/100</small></strong><span>payment score</span></div>
            <div className="legal-buyer-metrics"><span>Avg. pay<strong>{buyer.avgPaymentDays} days</strong></span><span>Credit limit<strong>{formatINR(buyer.creditLimit)}</strong></span></div>
            <div className="legal-buyer-actions">
              <button className="listen-btn" aria-label={`Listen to ${buyer.name} payment profile`} onClick={() => voice.speak(buyerSpeech(buyer))}><Volume2 size={15} /><span>Listen</span></button>
              <button className="legal-text-button" onClick={() => openNegotiation(buyer.id)}>{buyer.paymentScore < 60 ? "Open safe terms" : "Review buyer"} <ArrowRight size={13} /></button>
            </div>
          </article>;
        })}
      </div>
    </section>

    {warnings.length > 0 && <section className="legal-tax-alert" role="alert">
      <span className="legal-alert-icon"><CircleAlert size={19} /></span>
      <div className="legal-alert-copy"><strong>Section 43B(h) payment window needs attention</strong><p>{warnings.length} invoices are past Day 30; {overdue.length} are beyond Day 45. Review the illustrative tax impact and follow up in writing.</p></div>
      <button className="listen-btn" onClick={() => voice.speak({
        "en-IN": `Section 43 B h alert. ${warnings.length} invoices are past Day 30 and ${overdue.length} are beyond Day 45. Follow up with the buyer in writing, preserve delivery proof, and review the tax impact estimate.`,
      })}><Volume2 size={15} /><span>Listen</span></button>
      <button className="legal-alert-action" onClick={() => openTaxDialog((overdue[0] || warnings[0]).invoice.id)}>View tax impact <ArrowRight size={14} /></button>
    </section>}

    <section className="legal-section panel legal-invoice-section">
      <div className="legal-section-head">
        <div><span className="legal-section-kicker">INVOICE REGISTER</span><h2>15-day deemed acceptance &amp; 45-day legal countdown</h2><p>Record delivery evidence, monitor acceptance and act before the payment window expires.</p></div>
        <button className="listen-btn" onClick={() => voice.speak({
          "en-IN": `Invoice register. Upload an E-Way Bill or challan to lock deemed acceptance at delivery plus 15 days. After acceptance, the 45-day statutory payment window is counted here.`,
        })}><Volume2 size={15} /><span>Listen</span></button>
      </div>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <thead><tr><th>INVOICE / BUYER</th><th>AMOUNT</th><th>DELIVERY / ACCEPTANCE</th><th>43B(h) STATUS</th><th>NEXT ACTION</th><th>ACTIONS</th></tr></thead>
          <tbody>{invoiceRows.map(({ invoice, buyer, daysElapsed, daysRemaining, daysToAcceptance, stage }) => {
            const proofMissing = !invoice.eWayBillUploaded || !invoice.acceptanceDate;
            const pending = proofMissing || daysToAcceptance > 0;
            const action = proofMissing
              ? "Upload E-Way Bill / Challan to record delivery proof."
              : daysToAcceptance > 0
                ? `Proof recorded; deemed acceptance in ${daysToAcceptance} days.`
              : daysElapsed > 45
                ? "Serve statutory demand notice; prepare ODR packet."
                : daysElapsed >= 40
                  ? `Send final written reminder; ${daysRemaining} days to cutoff.`
                  : daysElapsed > 30
                    ? `Send written reminder; ${daysRemaining} days to cutoff.`
                    : daysElapsed > 20
                      ? "Eligible for TReDS discounting; confirm terms."
                      : "Confirm acceptance and retain delivery evidence.";
            const rowSpeech = invoiceSpeech(invoice, buyer, daysElapsed, daysRemaining, daysToAcceptance, proofMissing);
            return <tr key={invoice.id}>
              <td><div className="legal-invoice-identity"><span className="legal-invoice-icon"><FileText size={16} /></span><span><strong>{invoice.number}</strong><small>{buyer.name}</small></span></div></td>
              <td className="legal-amount tabular-nums">{formatINR(invoice.amount)}</td>
              <td><div className="legal-date-cell"><span>Delivered {displayDate(invoice.deliveryDate)}</span><small>{invoice.acceptanceDate ? `${daysToAcceptance > 0 ? "Deemed acceptance" : "Accepted"} ${displayDate(invoice.acceptanceDate)}` : "Acceptance pending"}</small></div></td>
              <td><span className={`legal-stage-badge ${stage.includes("Overdue") ? "overdue" : stage.includes("Critical") ? "critical" : stage.includes("Warning") ? "warning" : stage.includes("TReDS") ? "treds" : stage.includes("Pending") ? "pending" : "safe"}`}>{stage}</span><small className="legal-countdown">{pending
                ? invoice.eWayBillUploaded ? `Deemed acceptance in ${daysToAcceptance}d · 45-day window follows` : "Upload proof to start clock"
                : daysElapsed > 45 ? `${daysElapsed - 45} days overdue` : `${daysRemaining} days to cutoff`}</small></td>
              <td><span className="legal-next-action">{action}</span></td>
              <td><div className="legal-row-actions">
                <button className="listen-btn legal-row-listen" aria-label={`Listen to invoice ${invoice.number}`} title={`Listen to ${invoice.number}`} onClick={() => voice.speak(rowSpeech)}><Volume2 size={15} /><span>Listen</span></button>
                {proofMissing
                  ? <button className="legal-action-button" onClick={() => uploadDeliveryEvidence(invoice.id)}><Upload size={13} /> Upload E-Way Bill / Challan</button>
                  : daysToAcceptance > 0
                    ? <span className="legal-monitor">Evidence recorded</span>
                  : daysElapsed > 45
                    ? <button className="legal-action-button legal-odr-button" onClick={() => openOdrPacket(invoice.id)}><FileCheck2 size={13} /> {invoice.odrPacketGenerated ? "View ODR Packet" : "Create ODR Packet"}</button>
                    : daysElapsed > 20 && !invoice.tredsSettled
                      ? <button className="legal-action-button legal-treds-button" onClick={() => switchToTreds(invoice, buyer)}><ArrowRight size={13} /> Switch to TReDS</button>
                      : invoice.tredsSettled
                        ? <span className="legal-settled"><CheckCircle2 size={13} /> TReDS settled</span>
                        : <span className="legal-monitor">Monitor</span>}
                {daysElapsed > 30 && !pending && <button className="legal-tax-link" onClick={() => openTaxDialog(invoice.id)}>43B(h) tax impact</button>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="legal-table-foot"><span><Clock3 size={14} /> 15 calendar days for deemed acceptance · 45 days for payment after acceptance.</span><span>Demo dates update live while this tab is open.</span></div>
    </section>

    <p className="legal-disclaimer">Illustrative demo data. The 25.17% tax-impact and 19.5% annual daily-compound interest figures are estimates based on the requested assumptions, not legal or tax advice. Confirm applicability, dates, rates and evidence requirements with a qualified adviser.</p>

    {dialog && <LegalDialog
      dialog={dialog}
      buyer={activeDialogBuyer}
      invoice={activeDialogInvoice?.invoice}
      daysLate={activeDialogInvoice?.daysLate || 0}
      onClose={() => setDialog(null)}
      onSpeak={speech => voice.speak(speech)}
      onPrint={() => window.print()}
    />}
  </div>;
}

function LegalDialog({ dialog, buyer, invoice, daysLate, onClose, onSpeak, onPrint }: {
  dialog: LegalDialogState;
  buyer: LegalBuyer | undefined;
  invoice: LegalInvoice | undefined;
  daysLate: number;
  onClose: () => void;
  onSpeak: (speech: Record<Language, string>) => void;
  onPrint: () => void;
}) {
  if (dialog.kind === "negotiation" && buyer) {
    return <div className="modal-backdrop legal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="legal-dialog negotiation-dialog" role="dialog" aria-modal="true" aria-labelledby="negotiation-title">
        <header className="legal-dialog-head"><span className="legal-dialog-icon amber"><ShieldCheck size={18} /></span><div><span className="legal-section-kicker">AI SAFE-INVOICE NEGOTIATION SHIELD</span><h2 id="negotiation-title">{buyer.name}</h2><p>{buyer.gstin} · Score {buyer.paymentScore}/100 · {buyerRiskLabel(buyer.paymentScore)}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close negotiation shield"><X size={18} /></button></header>
        <div className="legal-dialog-body">
          <div className="legal-shield-summary"><strong>₹3,00,000 order · safer payment terms</strong><span>Average payment time: {buyer.avgPaymentDays} days · Credit limit: {formatINR(buyer.creditLimit)}</span></div>
          <ol className="legal-negotiation-options">
            <li><strong>Option A · Advance-to-Cost Rule</strong><span>Require <b>₹1,50,000 (50%) upfront</b> to cover raw materials.</span></li>
            <li><strong>Option B · Split-Batch Invoicing</strong><span>Release 4 milestone deliveries of <b>₹75,000 each</b>.</span></li>
            <li><strong>Option C · Early-Payment Discount</strong><span>Offer <b>1.5% off (₹4,500)</b> for payment within 7 days.</span></li>
          </ol>
          <div className="legal-dialog-actions">
            <button className="listen-btn" onClick={() => onSpeak(negotiationSpeech(buyer))}><Volume2 size={15} /><span>Listen</span></button>
            <button className="primary-btn" onClick={onClose}>Use these terms <ArrowRight size={14} /></button>
          </div>
        </div>
      </section>
    </div>;
  }

  if (!invoice || !buyer) return null;
  if (dialog.kind === "tax") {
    const taxImpact = Math.round(invoice.amount * 0.2517);
    const dailyCompoundInterest = Math.round(invoice.amount * (Math.pow(1 + 0.195 / 365, daysLate) - 1));
    const taxVoice = legalTaxSpeech(invoice, buyer, daysLate, taxImpact, dailyCompoundInterest);
    return <div className="modal-backdrop legal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="legal-dialog tax-impact-dialog" role="dialog" aria-modal="true" aria-labelledby="tax-impact-title">
        <header className="legal-dialog-head"><span className="legal-dialog-icon red"><CircleAlert size={18} /></span><div><span className="legal-section-kicker">SECTION 43B(h) TAX ALERT</span><h2 id="tax-impact-title">Payment deadline impact</h2><p>{invoice.number} · {buyer.name} · Day {invoiceTiming(invoice, new Date()).daysElapsed}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close tax alert"><X size={18} /></button></header>
        <div className="legal-dialog-body">
          <p className="legal-dialog-lead">Illustrative amount if this invoice remains unpaid beyond the 45-day statutory payment window.</p>
          <dl className="legal-tax-breakdown"><div><dt>Invoice amount</dt><dd>{formatINR(invoice.amount)}</dd></div><div><dt>Buyer tax deduction impact at 25.17%</dt><dd>{formatINR(taxImpact)}</dd></div><div><dt>3× RBI daily compound interest estimate (~19.5% p.a.) · {daysLate} late days</dt><dd>{formatINR(dailyCompoundInterest)}</dd></div></dl>
          <p className="legal-dialog-note">Estimate uses daily compounding on the invoice principal: amount × ((1 + 19.5% / 365) ^ late days − 1). Verify the applicable rate and tax treatment before relying on it.</p>
          <div className="legal-dialog-actions"><button className="listen-btn" onClick={() => onSpeak(taxVoice)}><Volume2 size={15} /><span>Listen</span></button><button className="secondary-btn" onClick={onClose}>Close</button></div>
        </div>
      </section>
    </div>;
  }

  const odrSpeech: Record<Language, string> = {
    "en-IN": `ODR legal packet for invoice ${invoice.number}, buyer ${buyer.name}, amount ${formatINR(invoice.amount)}. The demo dossier includes the purchase order, GST invoice, E-Way Bill, delivery proof, Udyam registration UDYAM-TS-02-0048192 and a statutory demand notice addressed to odr.msme.gov.in. Verify every document and serve notice before filing.`,
  };
  return <div className="modal-backdrop legal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="legal-dialog odr-dialog" role="dialog" aria-modal="true" aria-labelledby="odr-title">
      <header className="legal-dialog-head"><span className="legal-dialog-icon blue"><FileCheck2 size={18} /></span><div><span className="legal-section-kicker">MSME ODR LEGAL PACKET</span><h2 id="odr-title">Dossier ready for review</h2><p>{invoice.number} · {buyer.name} · {formatINR(invoice.amount)}</p></div><button className="icon-btn" onClick={onClose} aria-label="Close ODR packet"><X size={18} /></button></header>
      <div className="legal-dialog-body">
        <div className="legal-packet-print">
          <div className="legal-packet-brand"><Logo /><span>MSME ODR · DEMO DOSSIER</span></div>
          <h3>Statutory demand dossier</h3>
          <p>Buyer: <strong>{buyer.name}</strong> · GSTIN: {buyer.gstin}</p>
          <p>Invoice: <strong>{invoice.number}</strong> · Amount: <strong>{formatINR(invoice.amount)}</strong></p>
          <div className="legal-document-sections">
            <section><h4>1. Purchase Order (PO)</h4><p>Reference: PO-{invoice.number} · Buyer: {buyer.name} · Agreed order value: {formatINR(invoice.amount)}. Demo-generated summary; attach the executed buyer PO before filing.</p></section>
            <section><h4>2. GST Tax Invoice</h4><p>Invoice: {invoice.number} · Issued: {displayDate(invoice.issueDate)} · Taxable invoice value: {formatINR(invoice.amount)} · Buyer GSTIN: {buyer.gstin}.</p></section>
            <section><h4>3. E-Way Bill / Challan</h4><p>Delivery date: {displayDate(invoice.deliveryDate)} · Evidence reference: DEMO-EWB-{invoice.number}. Replace this demo reference with the actual E-Way Bill or challan.</p></section>
            <section><h4>4. Delivery / Acceptance Proof</h4><p>Delivery recorded: {displayDate(invoice.deliveryDate)} · Acceptance record: {invoice.acceptanceDate ? displayDate(invoice.acceptanceDate) : "Pending"} · Attach signed delivery challan or buyer acceptance evidence.</p></section>
            <section><h4>5. Udyam Registration</h4><p>Registration number: <strong>UDYAM-TS-02-0048192</strong> · Confirm current registration details and enterprise classification.</p></section>
            <section><h4>6. Statutory Demand Notice</h4><p>To: {buyer.name} · Re: unpaid MSME invoice {invoice.number} for {formatINR(invoice.amount)}. Request payment and preserve proof of service. Review the notice with counsel before serving or submitting at odr.msme.gov.in.</p></section>
          </div>
          <p className="legal-dialog-note">This printable demo dossier is a draft, not a filed claim or served notice. Confirm statutory service, limitation dates and all evidence with a qualified adviser.</p>
        </div>
        <div className="legal-dialog-actions"><button className="listen-btn" onClick={() => onSpeak(odrSpeech)}><Volume2 size={15} /><span>Listen</span></button><button className="primary-btn" onClick={onPrint}><Printer size={14} /> Print packet</button></div>
      </div>
    </section>
  </div>;
}

function TaxGSTDashboard({ finance, setFinance, flaggedVendors, onToggleFlag, onSpeak, onNotify }: {
  finance: FinanceState;
  setFinance: React.Dispatch<React.SetStateAction<FinanceState>>;
  flaggedVendors: string[];
  onToggleFlag: (vendorId: string) => void;
  onSpeak: (speech: Record<Language, string>) => void;
  onNotify: (message: string) => void;
}) {
  const period = "November 2026";
  const spendableCash = Math.max(0, finance.cash - finance.taxVault);
  const taxPaymentAmount = 118000;
  const taxReserveFromPayment = 24500;
  const dailyLateFeeEstimate = 50;
  const sevenDaySavings = dailyLateFeeEstimate * 7;
  const payIntoTaxVault = () => {
    if (finance.taxPaymentReceived) return;
    setFinance(current => current.taxPaymentReceived ? current : ({
      ...current,
      cash: current.cash + taxPaymentAmount,
      receivables: Math.max(0, current.receivables - taxPaymentAmount),
      taxVault: current.taxVault + taxReserveFromPayment,
      taxPaymentReceived: true,
      entries: [{
        id: `tax-receipt-${Date.now()}`, label: "Customer payment · GST reserve moved to Tax-Vault",
        amount: taxPaymentAmount, type: "inflow", date: "Today", source: "Tax & GST",
      }, ...current.entries],
    }));
    onNotify("Payment simulated: ₹24,500 added to the protected Tax-Vault reserve.");
  };
  const vaultSpeech: CreditSpeech = {
    "en-IN": `Tax-Vault snapshot. Total bank balance ${formatINR(finance.cash)}. Locked GST and income-tax reserve ${formatINR(finance.taxVault)}. True spendable working cash ${formatINR(spendableCash)}. Outflows in MunimAI are checked against spendable cash so the reserve is protected.`,
  };
  const receiptSpeech: CreditSpeech = {
    "en-IN": `Payment received simulation: one lakh eighteen thousand rupees including eighteen thousand rupees GST. Of this, twenty-four thousand five hundred rupees is moved to the Tax-Vault: eighteen thousand GST plus a six thousand five hundred income-tax buffer. Receivables reduce by one lakh eighteen thousand rupees.`,
  };
  const countdownSpeech: CreditSpeech = {
    "en-IN": `Seven-day compliance countdown. The demo estimates late-fee avoidance at fifty rupees per day for seven days, exactly ${formatINR(sevenDaySavings)}. This is an illustrative planning estimate, not a statutory fee quote. Confirm the applicable return and due date with your tax professional.`,
  };
  const regimeSpeech: CreditSpeech = {
    "en-IN": `AI CA advice for FY 2026–27 under the requested Income-tax Act, 2025 model. With annual turnover ${formatINR(finance.annualTurnover)} and ${finance.digitalReceiptPct} percent digital receipts, the illustrative comparison marks the New Regime as optimal and shows exactly ₹46,800 lower modeled tax. Turnover and digital receipts alone do not determine company tax. Sri Balaji Precision Components is a private limited company, so this individual old-versus-new regime result is not a corporate tax assessment. Ask your chartered accountant to apply the correct company provisions and current rules.`,
  };
  return <div className="tax-page">
    <div className="tax-heading">
      <div>
        <div className="eyebrow"><span className="live-dot" /> GST &amp; TDS WORKSPACE <span className="heading-separator">·</span> MONTHLY CLOSE</div>
        <h1>Tax &amp; GST, with fewer surprises.</h1>
        <p>Reconcile your purchase credits and keep your next filing decision-ready.</p>
      </div>
      <div className="tax-period"><CalendarDays size={15} /><span>Tax period</span><strong>{period}</strong></div>
    </div>

    <div className="tax-kpi-grid">
      <article className="tax-kpi"><div className="tax-kpi-top"><span>GSTR-1 Sales</span><span className="tax-kpi-icon blue"><TrendingUp size={17} /></span></div><strong>{formatINR(1840000)}</strong><small><span className="tax-kpi-dot blue-dot" /> Outward taxable supplies <span className="tax-period-label">{period}</span></small><button className="listen-btn tax-listen" onClick={() => onSpeak(getTaxKpiSpeech("sales"))} aria-label="Listen to GSTR-1 Sales"><Volume2 size={15} /><span>Listen</span></button></article>
      <article className="tax-kpi"><div className="tax-kpi-top"><span>GSTR-2B ITC Available</span><span className="tax-kpi-icon green"><ArrowDownLeft size={17} /></span></div><strong>{formatINR(295000)}</strong><small><span className="tax-kpi-dot green-dot" /> Eligible input tax credit <span className="tax-period-label">{period}</span></small><button className="listen-btn tax-listen" onClick={() => onSpeak(getTaxKpiSpeech("itc"))} aria-label="Listen to GSTR-2B ITC Available"><Volume2 size={15} /><span>Listen</span></button></article>
      <article className="tax-kpi"><div className="tax-kpi-top"><span>Net GST Payable</span><span className="tax-kpi-icon amber"><Landmark size={17} /></span></div><strong>{formatINR(36200)}</strong><small><span className="tax-kpi-dot amber-dot" /> After available input credits <span className="tax-period-label">{period}</span></small><button className="listen-btn tax-listen" onClick={() => onSpeak(getTaxKpiSpeech("payable"))} aria-label="Listen to Net GST Payable"><Volume2 size={15} /><span>Listen</span></button></article>
    </div>

    <section className="panel reconciliation-panel">
      <div className="section-head reconciliation-head">
        <div><div className="section-title-row"><h2>ITC reconciliation &amp; mismatch</h2><span className="reconciliation-count">{supplierInvoices.length} invoices</span></div><p>Purchase register compared with GSTR-2B for {period}.</p></div>
        <span className="reconciliation-summary"><i /> {supplierInvoices.filter(invoice => invoice.status === "Mismatch").length} need review</span>
        <CreditListen speech={{
          "en-IN": "The input tax credit reconciliation compares four Telangana supplier invoices with November GSTR-2B. Two invoices need vendor follow-up before filing.",
        }} onSpeak={onSpeak} />
      </div>
      <div className="reconciliation-table-wrap">
        <table className="reconciliation-table">
          <thead><tr><th>SUPPLIER NAME</th><th>GSTIN</th><th>INVOICE AMOUNT (₹)</th><th>ITC STATUS</th><th>ACTIONS</th></tr></thead>
          <tbody>{supplierInvoices.map(invoice => {
            const flagged = flaggedVendors.includes(invoice.id);
            return <tr key={invoice.id}>
              <td><div className="supplier-identity"><span className="supplier-avatar">{invoice.supplier.slice(0, 1)}</span><span><strong>{invoice.supplier}</strong><small>{invoice.invoice} <i>·</i> {invoice.date}</small></span></div></td>
              <td className="supplier-gstin">{invoice.gstin}</td>
              <td className="supplier-amount tabular-nums">{formatINR(invoice.amount)}</td>
              <td><span className={`itc-status ${invoice.status.toLowerCase()}`}><i />{invoice.status}</span></td>
              <td><div className="tax-row-actions"><button className="listen-btn tax-row-listen" onClick={() => onSpeak(getSupplierSpeech(invoice))} aria-label={`Listen to ${invoice.supplier} ITC ${invoice.status.toLowerCase()}`} title={`Listen to ${invoice.supplier} ITC details`}><Volume2 size={15} /><span>Listen</span></button><button className={`flag-vendor ${flagged ? "flagged" : ""}`} aria-pressed={flagged} onClick={() => onToggleFlag(invoice.id)}>{flagged ? <CheckCircle2 size={14} /> : <Flag size={14} />}{flagged ? "Flagged" : "Flag Vendor"}</button></div></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      <div className="reconciliation-foot"><span><CircleAlert size={14} /> Verify supplier filings and invoice details before claiming credit.</span><CreditListen speech={{
        "en-IN": "Verify supplier filings and invoice details before claiming input tax credit. Follow up on each mismatch and retain the corrected invoice.",
      }} onSpeak={onSpeak} /><button className="text-link">View purchase register <ArrowRight size={14} /></button></div>
    </section>

    <section className="tax-vault-panel">
      <div className="tax-module-head"><div><span className="eyebrow">MODULE 7 · CASH RESERVED BEFORE SPENDING</span><h2>Locked Tax-Vault &amp; 7-day penalty shield</h2><p>Separate tax reserves from cash available for operations.</p></div><CreditListen speech={vaultSpeech} onSpeak={onSpeak} /></div>
      <div className="tax-vault-grid">
        <article className="tax-vault-card bank-balance"><div className="tax-vault-label"><Wallet size={16} /><span>Total bank balance</span></div><strong>{formatINR(finance.cash)}</strong><small>Live from Current Cash</small><CreditListen speech={{
          "en-IN": `Total bank balance is ${formatINR(finance.cash)}.`,
        }} onSpeak={onSpeak} /></article>
        <article className="tax-vault-card locked-balance"><div className="tax-vault-label"><ShieldCheck size={16} /><span>Locked Tax-Vault</span></div><strong>{formatINR(finance.taxVault)}</strong><small>GST + income-tax reserve protected from spending</small><CreditListen speech={{
          "en-IN": `Locked Tax-Vault: ${formatINR(finance.taxVault)} reserved for GST and income tax, not available for regular spending.`,
        }} onSpeak={onSpeak} /></article>
        <article className="tax-vault-card spendable-balance"><div className="tax-vault-label"><TrendingUp size={16} /><span>True spendable working cash</span></div><strong>{formatINR(spendableCash)}</strong><small>Bank balance less the protected reserve</small><CreditListen speech={{
          "en-IN": `True spendable working cash is ${formatINR(spendableCash)} after subtracting the locked Tax-Vault reserve.`,
        }} onSpeak={onSpeak} /></article>
      </div>
      <div className="tax-vault-bottom">
        <article className="tax-vault-payment">
          <div><span className="tax-vault-label"><ArrowDownLeft size={15} /> Payment allocation simulation</span><p>₹1,18,000 customer receipt includes ₹18,000 GST. Automatically reserve ₹24,500 (GST plus an income-tax buffer).</p></div>
          <CreditListen speech={receiptSpeech} onSpeak={onSpeak} />
          <button type="button" className="primary-btn tax-vault-action" disabled={finance.taxPaymentReceived} onClick={payIntoTaxVault}>{finance.taxPaymentReceived ? <><CheckCircle2 size={14} /> Payment simulated</> : <>Simulate ₹1,18,000 Payment Received (incl. ₹18,000 GST) <ArrowRight size={14} /></>}</button>
        </article>
        <article className="tax-countdown-card">
          <div className="tax-countdown-top"><span className="tax-countdown-icon"><Clock3 size={16} /></span><div><span className="tax-card-kicker">COMPLIANCE COUNTDOWN</span><strong>7 days to planned filing</strong></div><CreditListen speech={countdownSpeech} onSpeak={onSpeak} /></div>
          <div className="tax-countdown-track"><span /></div>
          <div className="tax-countdown-foot"><span>Estimated late-fee avoided</span><strong>{formatINR(sevenDaySavings)}</strong></div>
          <small>Demo estimate: ₹50/day × 7 days = ₹350. Confirm statutory fee and due date.</small>
        </article>
      </div>
      {finance.taxPaymentReceived && <div className="tax-vault-receipt" role="status"><CheckCircle2 size={15} /><span>₹1,18,000 receipt recorded · ₹24,500 moved into the protected Tax-Vault.</span><CreditListen speech={receiptSpeech} onSpeak={onSpeak} /></div>}
    </section>

    <section className="tax-regime-panel">
      <div className="tax-module-head"><div><span className="eyebrow">LIVE REGIME SCENARIO · FY 2026–27</span><h2>Old vs. New tax regime simulator</h2><p>Requested Income-tax Act, 2025 framework · illustrative scenario, not a company tax computation.</p></div><CreditListen speech={regimeSpeech} onSpeak={onSpeak} label="Listen to AI CA Advice" /></div>
      <div className="tax-regime-inputs">
        <article><span>Annual turnover</span><strong>{formatINR(finance.annualTurnover)}</strong><CreditListen speech={{
          "en-IN": `Annual turnover input: ${formatINR(finance.annualTurnover)} for the FY 2026–27 demo scenario.`,
        }} onSpeak={onSpeak} /></article>
        <article><span>Digital receipts</span><strong>{finance.digitalReceiptPct}%</strong><CreditListen speech={{
          "en-IN": `${finance.digitalReceiptPct} percent of demo receipts are digital.`,
        }} onSpeak={onSpeak} /></article>
      </div>
      <div className="tax-regime-options">
        <article className="tax-regime-option old"><div><span>OLD REGIME</span><span className="tax-regime-badge">Comparison</span></div><h3>Old Regime</h3><p>Deduction-led model; eligibility depends on the taxpayer and eligible claims.</p><strong>₹46,800 higher in this demo comparison</strong><CreditListen speech={{
          "en-IN": "Old Regime comparison. In this illustrative scenario it is forty-six thousand eight hundred rupees higher than the New Regime model. Actual deductions and entity treatment need a chartered accountant's review.",
        }} onSpeak={onSpeak} /></article>
        <article className="tax-regime-option new"><div><span>NEW REGIME · MODEL OPTIMAL</span><span className="tax-regime-badge">Recommended*</span></div><h3>New Regime</h3><p>Lower modeled liability under the demo assumptions for this FY 2026–27 comparison.</p><strong>₹46,800 modeled tax saved</strong><CreditListen speech={{
          "en-IN": "New Regime is marked optimal in the demo comparison, with exactly forty-six thousand eight hundred rupees lower modeled tax. This is not a determination that the private limited company qualifies for an individual regime election.",
        }} onSpeak={onSpeak} /></article>
      </div>
      <article className="tax-ai-advice"><span className="tax-ai-icon"><Sparkles size={16} /></span><div><span className="tax-card-kicker">PLAIN-LANGUAGE AI CA EXPLANATION</span><p>The demo scenario marks the New Regime as optimal and shows <strong>₹46,800 modeled savings</strong> using annual turnover of {formatINR(finance.annualTurnover)} and {finance.digitalReceiptPct}% digital receipts. Those inputs alone cannot determine tax. Sri Balaji Precision Components is a private limited company, so individual old/new regime rules do not automatically apply; confirm the correct corporate tax treatment under the Income-tax Act, 2025 with your CA.</p></div><CreditListen speech={regimeSpeech} onSpeak={onSpeak} label="Listen to AI CA Advice" /></article>
      <p className="tax-regime-disclaimer">*Illustrative simulator output supplied for demo evaluation, not tax advice or a filed computation. Tax treatment depends on entity type, taxable income, deductions, elections, and applicable law; have a CA verify before relying on it.</p>
    </section>

    <div className="tax-bottom-grid">
      <section className="panel tds-card">
        <div className="tds-icon"><Landmark size={17} /></div>
        <div className="tds-content"><span className="tax-card-kicker">TDS CREDIT TRACKER</span><h2>Keep withholding in sight.</h2><p>Record credits and reconcile deductions with your Form 26AS before quarterly filing.</p><div className="tds-metrics"><span>Credit tracked<strong>{formatINR(18400)}</strong></span><i /><span>Next statement<strong>31 Jan 2027</strong></span></div></div>
        <span className="tds-pending">REVIEW PENDING</span>
        <CreditListen speech={{
          "en-IN": "TDS credit tracker shows eighteen thousand four hundred rupees to reconcile with Form 26AS. The next statement reminder is 31 January 2027.",
        }} onSpeak={onSpeak} />
      </section>
      <section className="panel filing-card">
        <div className="filing-card-head"><span className="filing-icon"><FileCheck2 size={16} /></span><div><h2>Filing readiness</h2><p>A quick pre-file check</p></div></div>
        <div className="filing-row"><CheckCircle2 size={15} /><span>Sales summary is ready</span><strong>Ready</strong><CreditListen speech={{
          "en-IN": "Sales summary is ready for filing review.",
        }} onSpeak={onSpeak} /></div>
        <div className="filing-row needs-review"><CircleAlert size={15} /><span>Resolve 2 ITC mismatches</span><strong>Review</strong><CreditListen speech={{
          "en-IN": "Two input tax credit mismatches need review and vendor follow-up before filing.",
        }} onSpeak={onSpeak} /></div>
        <CreditListen speech={{
          "en-IN": "Filing readiness: sales summary is ready; two input tax credit mismatches need review.",
        }} onSpeak={onSpeak} />
      </section>
    </div>
    <p className="tax-disclaimer">Illustrative demo data for Sri Balaji Precision Components Pvt Ltd, Hyderabad. Reconcile invoices and consult your tax professional before filing or claiming input tax credit.</p>
  </div>;
}

function getTaxKpiSpeech(metric: "sales" | "itc" | "payable"): Record<Language, string> {
  const scripts: Record<typeof metric, Record<Language, string>> = {
    sales: {
      "en-IN": "G S T R one sales for November are 18 lakh 40 thousand rupees. This is the outward taxable supplies figure shown in the demo dashboard.",
    },
    itc: {
      "en-IN": "G S T R two B shows 2 lakh 95 thousand rupees of available input tax credit. Check that each supplier invoice is matched before claiming eligible credit.",
    },
    payable: {
      "en-IN": "The dashboard shows net G S T payable of 36 thousand 200 rupees after available input tax credits of 2 lakh 95 thousand rupees. Two supplier invoices have mismatches. Reconcile them with the vendors before filing G S T R three B. The demo does not include the full tax calculation breakdown.",
    },
  };
  return scripts[metric];
}

function getSupplierSpeech(invoice: SupplierInvoice): Record<Language, string> {
  const status = invoice.status === "Mismatch";
  return {
    "en-IN": status
      ? `${invoice.supplier}, invoice ${invoice.invoice}, amount ${formatINR(invoice.amount)}. Its input tax credit does not match G S T R two B. Ask the vendor to correct or upload the invoice, then reconcile before filing G S T R three B.`
      : `${invoice.supplier}, invoice ${invoice.invoice}, amount ${formatINR(invoice.amount)}. Its input tax credit is matched with G S T R two B. Keep the invoice and verify eligibility before filing.`,
  };
}

function getChatAnswer(question: string, finance: FinanceState, forecast: number, cashRisk: boolean): Record<Language, string> {
  const normalized = question.toLowerCase();
  if (/loan|emi|installment|ऋण|कर्ज|क़र्ज़|किस्त|क़िस्त|लोन|ఈఎంఐ|లోన్|రుణం|వాయిదా/.test(normalized)) {
    return {
      "en-IN": `Loan balances and EMI schedules are not included in the live dashboard data, so I can't confirm an EMI. Current cash is ${formatINR(finance.cash)} and the cash forecast after listed receivables and payables is ${formatINR(forecast)}. Check the lender schedule for your due amount.`,
    };
  }
  if (/order|stock|inventory|material|ऑर्डर|स्टॉक|माल|इन्वेंटरी|ఆర్డర్|స్టాక్|ఇన్వెంటరీ|ముడి సరుకు/.test(normalized)) {
    return {
      "en-IN": `Live stock quantities and open order details are not tracked in this dashboard, so I can't confirm stock on hand or order status. The current raw-material cost recorded in the finance data is ${formatINR(finance.rawMaterial)}, and upcoming payables are ${formatINR(finance.payables)}. These are finance totals, not inventory counts.`,
    };
  }
  if (/gst|gstr|itc|tds|tax|जीएसटी|कर|जिएसटी|జీఎస్టీ|జిఎస్టి|పన్ను|టిడిఎస్/.test(normalized)) {
    return {
      "en-IN": `For November 2026, GSTR-1 sales are ₹18,40,000, GSTR-2B ITC available is ₹2,95,000, and the dashboard's net GST payable is ₹36,200 after available credits. ${supplierInvoices.filter(invoice => invoice.status === "Mismatch").length} supplier invoices need mismatch review: ${supplierInvoices.filter(invoice => invoice.status === "Mismatch").map(invoice => invoice.supplier).join(" and ")}. Reconcile before filing GSTR-3B; the demo does not provide a full tax calculation breakdown.`,
    };
  }
  if (/overdue|over due|45\s*(day|days|दिन|दिनों|రోజు|రోజులు)?|invoice|invoices|receivable|collection|वसूली|प्राप्य|इनवॉइस|चालान|రావలసిన|వసూళ్లు|ఇన్‌వాయిస్|బకాయి/.test(normalized)) {
    return {
      "en-IN": `Expected receivables total ${formatINR(finance.receivables)}. The ledger doesn't include invoice aging, so I can't verify whether any invoice is overdue by more than 45 days. Review invoice due dates in the invoice register before deciding which customers to follow up with.`,
    };
  }
  if (/payable|bill|supplier|payment|देय|भुगतान|చెల్లించాల్సిన|చెల్లింపు|బిల్లు/.test(normalized)) {
    return {
      "en-IN": `Upcoming payables are ${formatINR(finance.payables)}. Current cash plus expected receivables is ${formatINR(finance.cash + finance.receivables)}, leaving a forecast balance of ${formatINR(forecast)}.`,
    };
  }
  if (/profit|margin|लाभ|मुनाफा|లాభం/.test(normalized)) {
    const profit = finance.sales - finance.rawMaterial - finance.wages - finance.overheads;
    return {
      "en-IN": `Your live net profit is ${formatINR(profit)}. This uses sales of ${formatINR(finance.sales)} less raw materials, wages and overheads.`,
    };
  }
  if (/cash|balance|position|कैश|नकद|शेष|నగదు|బ్యాలెన్స్|స్థితి/.test(normalized)) {
    return {
      "en-IN": `Current cash is ${formatINR(finance.cash)}. Expected receivables are ${formatINR(finance.receivables)} and upcoming payables are ${formatINR(finance.payables)}. That gives a forecast cash balance of ${formatINR(forecast)}.${cashRisk ? " A cash shortfall is forecast against the listed 15-day flows; follow up on collections and review payment timing." : " No cash shortfall is forecast against the listed 15-day flows."}`,
    };
  }
  return {
    "en-IN": `Here’s the Sri Balaji Precision Components snapshot: current cash ${formatINR(finance.cash)}, expected receivables ${formatINR(finance.receivables)}, upcoming payables ${formatINR(finance.payables)}, forecast cash ${formatINR(forecast)}, and live net profit ${formatINR(finance.sales - finance.rawMaterial - finance.wages - finance.overheads)}.${cashRisk ? " A cash shortfall risk needs attention." : " No shortfall is forecast against the listed flows."} Ask about cash, GST, invoices, loans, or stock.`,
  };
}

function ChatPopup({ language, onLanguageChange, listening, working, messages, onClose, onSend, onListen, onSpeak }: {
  language: Language; listening: boolean; messages: ChatMessage[]; onClose: () => void;
  onLanguageChange: (language: Language) => void; working: boolean;
  onSend: (question: string) => Promise<void>; onListen: () => void; onSpeak: (text: Record<Language, string>) => void;
}) {
  const [input, setInput] = useState("");
  const [showPrivacySettings, setShowPrivacySettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const welcome = {
    "en-IN": "Namaste! I’m your MunimAI co-pilot. Ask me about cash flow, GST, collections or profit.",
  };

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    void onSend(question);
    setInput("");
  };

  const suggestions = [
    { question: "What is my Net GST Payable?" },
    { question: "Show overdue >45 day invoices" },
    { question: "Cash flow summary" },
  ];

  return <section className="chat-popup" role="dialog" aria-modal="false" aria-labelledby="chat-title">
    <header className="chat-header">
      <span className="chat-avatar"><Sparkles size={17} /></span>
      <div className="chat-header-copy"><strong id="chat-title">Ask MunimAI</strong><small><i /> Ready to help · {locales[language]}</small></div>
      <div className="chat-language-toggle" aria-label="Chat voice language">
        {([["en-IN", "English"], ["hi-IN", "हिंदी"], ["te-IN", "తెలుగు"]] as const).map(([code, label]) => <button key={code} type="button" className={language === code ? "active" : ""} aria-pressed={language === code} onClick={() => onLanguageChange(code)}>{label}</button>)}
      </div>
      <button className={`icon-btn chat-settings ${showPrivacySettings ? "active" : ""}`} type="button" aria-label="AI key and privacy settings" title="AI key and privacy settings" aria-expanded={showPrivacySettings} onClick={() => setShowPrivacySettings(open => !open)}><Settings2 size={16} /></button>
      <button className="icon-btn chat-close" onClick={onClose} aria-label="Close chat"><X size={18} /></button>
    </header>
    {showPrivacySettings && <section className="chat-ai-settings" aria-label="AI key settings">
      <span className="chat-ai-settings-icon"><ShieldCheck size={15} /></span>
      <div><strong>Private local agent · no external AI key</strong><p>Live cash, tax and invoice data stays within this app. OpenAI/Gemini keys are not collected or used, and dashboard data is not sent to third-party models.</p></div>
      <button type="button" aria-label="Close AI key settings" onClick={() => setShowPrivacySettings(false)}><X size={14} /></button>
    </section>}
    <div className="chat-messages" aria-live="polite">
      <div className="chat-day-label">YOUR BUSINESS COPILOT</div>
      {!messages.length && <div className="chat-message assistant-message"><span className="chat-bot-icon"><Sparkles size={13} /></span><div className="chat-bubble">{welcome[language]}</div></div>}
      {messages.map(message => <div key={message.id} className={`chat-message ${message.role === "user" ? "user-message" : "assistant-message"}`}>
        {message.role === "assistant" && <span className="chat-bot-icon"><Sparkles size={13} /></span>}
        <div className="chat-message-body">
          <div className="chat-bubble">{message.role === "assistant" ? message.speech?.[language] ?? message.text : message.text}</div>
          {message.action && <div className="chat-action-card"><span className="chat-action-check"><CheckCircle2 size={15} /></span><span><strong>{message.action.label[language]}</strong><small>{message.action.details[language]}</small></span><i>Action Executed ✓</i></div>}
          {message.speech && <button className="chat-speak" onClick={() => onSpeak(message.speech!)}><Volume2 size={12} /> Listen</button>}
        </div>
      </div>)}
      {!messages.length && <div className="chat-suggestions">{suggestions.map(item => <button key={item.question} disabled={working} onClick={() => { void onSend(item.question); }}>{item.question}<ArrowRight size={12} /></button>)}</div>}
      {working && <div className="chat-agent-working"><span className="live-dot" /> Checking live dashboard data and available actions…</div>}
      <div ref={endRef} />
    </div>
    {listening && <div className="chat-listening"><span className="live-dot" /> Listening for your question…</div>}
    <form className="chat-compose" onSubmit={submit}>
      <input ref={inputRef} value={input} onChange={event => setInput(event.target.value)} placeholder="Ask about your business…" aria-label="Type your question" disabled={working} />
      <button type="button" className={`chat-mic ${listening ? "active" : ""}`} onClick={onListen} title="Ask by voice" aria-label="Ask by voice"><Mic size={16} /></button>
      <button type="submit" className="chat-send" disabled={!input.trim() || working} title="Send message" aria-label="Send message"><Send size={15} /></button>
    </form>
    <div className="chat-privacy"><ShieldCheck size={12} /> Answers use your current demo dashboard data.</div>
  </section>;
}

function QuickAddModal({ entries: ledger, onClose, onAdd, onImport }: {
  entries: LedgerEntry[]; onClose: () => void; onAdd: (entry: LedgerEntry) => void; onImport: (entries: LedgerEntry[], source: string) => void;
}) {
  const [type, setType] = useState<"inflow" | "outflow">("inflow");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const numeric = Number(amount);
    if (!label.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      setError("Enter a description and a valid amount greater than zero.");
      return;
    }
    onAdd({ id: crypto.randomUUID(), label: label.trim(), amount: numeric, type, date: "Today", source: "Quick add" });
  };

  const syncSample = (source: string) => {
    setSyncing(source);
    const entries: LedgerEntry[] = source === "TallyPrime"
      ? [
        { id: crypto.randomUUID(), label: "Customer payment · Venkatesh Auto", amount: 185000, type: "inflow", date: "Today", source: "TallyPrime" },
        { id: crypto.randomUUID(), label: "Aluminium stock purchase", amount: 72000, type: "outflow", date: "Today", source: "TallyPrime" },
      ]
      : [
        { id: crypto.randomUUID(), label: "Invoice settlement · Deccan Motors", amount: 240000, type: "inflow", date: "Today", source: "Zoho Books" },
        { id: crypto.randomUUID(), label: "Workshop utilities", amount: 18500, type: "outflow", date: "Today", source: "Zoho Books" },
      ];
    window.setTimeout(() => onImport(entries, source), 450);
  };

  const uploadCSV = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV needs a header row and at least one transaction.");
      const headers = splitCSVLine(lines[0]).map(value => value.toLowerCase().trim());
      const typeIndex = headers.findIndex(value => ["type", "direction"].includes(value));
      const amountIndex = headers.findIndex(value => ["amount", "value"].includes(value));
      const labelIndex = headers.findIndex(value => ["description", "label", "memo", "narration"].includes(value));
      if (typeIndex < 0 || amountIndex < 0) throw new Error("CSV must include Type and Amount columns.");
      const entries = lines.slice(1).map((line, index) => {
        const values = splitCSVLine(line);
        const rawType = (values[typeIndex] || "").toLowerCase();
        const rawAmount = Number((values[amountIndex] || "").replace(/[₹,\s]/g, ""));
        if (!Number.isFinite(rawAmount) || rawAmount <= 0) throw new Error(`Row ${index + 2} has an invalid amount.`);
        if (!["inflow", "income", "credit", "outflow", "expense", "debit"].includes(rawType)) throw new Error(`Row ${index + 2} type must be Inflow or Outflow.`);
        const inflow = ["inflow", "income", "credit"].includes(rawType);
        return { id: crypto.randomUUID(), label: values[labelIndex] || `Imported transaction ${index + 1}`, amount: rawAmount, type: inflow ? "inflow" as const : "outflow" as const, date: "Today", source: file.name };
      });
      onImport(entries, file.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the CSV file.");
    } finally {
      event.target.value = "";
    }
  };

  const exportCSV = () => {
    const rows = ["Type,Amount,Description,Date,Source", ...ledger.map(entry =>
      `${entry.type === "inflow" ? "Inflow" : "Outflow"},${entry.amount},"${entry.label.replace(/"/g, '""')}",${entry.date},${entry.source}`
    )];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "munimai-ledger-export.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="quick-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
    <header className="modal-header"><div><span className="modal-kicker">LEDGER UPDATE</span><h2 id="modal-heading">Quick add &amp; sync</h2><p>Keep your cash picture current with one small update.</p></div><button className="icon-btn close-modal" onClick={onClose} aria-label="Close"><X size={19} /></button></header>
    <form className="transaction-form" onSubmit={submit}>
      <div className="transaction-type"><button type="button" className={type === "inflow" ? "selected inflow" : ""} onClick={() => setType("inflow")}><ArrowDownLeft size={15} /> Money in</button><button type="button" className={type === "outflow" ? "selected outflow" : ""} onClick={() => setType("outflow")}><ArrowUpRight size={15} /> Money out</button></div>
      <label className="modal-field"><span>What was it for?</span><input ref={inputRef} value={label} onChange={event => setLabel(event.target.value)} placeholder={type === "inflow" ? "e.g. Customer invoice payment" : "e.g. Raw material purchase"} /></label>
      <label className="modal-field"><span>Amount</span><div className="amount-input"><span>₹</span><input type="number" min="1" step="1" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" /></div></label>
      {error && <div className="form-error"><CircleAlert size={14} />{error}</div>}
      <button className="primary-btn add-submit" type="submit"><Plus size={16} /> Add transaction</button>
    </form>
    <div className="sync-divider"><span /> OR SYNC YOUR BOOKS <span /></div>
    <div className="sync-options"><button onClick={() => syncSample("TallyPrime")} disabled={Boolean(syncing)}><span className="sync-brand tally">T</span><span><strong>TallyPrime</strong><small>Import a sample ledger</small></span><ArrowRight size={15} /></button><button onClick={() => syncSample("Zoho Books")} disabled={Boolean(syncing)}><span className="sync-brand zoho">z</span><span><strong>Zoho Books</strong><small>Import a sample ledger</small></span><ArrowRight size={15} /></button></div>
    <div className="csv-actions"><label className="csv-upload"><input type="file" accept=".csv,text/csv" onChange={uploadCSV} /><Upload size={15} /> Upload CSV file</label><button className="csv-export" onClick={exportCSV}><ArrowDownRight size={14} /> Export ledger</button></div>
    {syncing && <p className="sync-progress"><span className="live-dot" /> Connecting to {syncing}…</p>}
    <footer className="modal-footer"><ShieldCheck size={14} /> Your demo data is stored locally in this browser.<button onClick={() => { setLabel(""); setAmount(""); setError(""); setType("inflow"); inputRef.current?.focus(); }} type="button">Clear form</button></footer>
  </section></div>;
}

function splitCSVLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"' && quoted) { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  values.push(value.trim());
  return values;
}


import React, { useState, useRef } from "react";

/**
 * AgriFlowDesignerAppV2.jsx
 * Single-file React component for Quotation UI + Items Engine + Print
 *
 * Paste this file into src/AgriFlowDesignerAppV2.jsx and run the app.
 */

/* ----------------- Helpers ----------------- */
const formatMoney = (n) => {
  const v = Number(n || 0);
  return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Very simple number to words (English) for totals (works up to crores)
function numberToWords(amount) {
  if (amount == null) return "";
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num) {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
    if (num < 1000) return a[Math.floor(num / 100)] + " Hundred " + (num % 100 ? "and " + inWords(num % 100) : "");
    if (num < 100000) return inWords(Math.floor(num / 1000)) + " Thousand " + (num % 1000 ? inWords(num % 1000) : "");
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + " Lakh " + (num % 100000 ? inWords(num % 100000) : "");
    return inWords(Math.floor(num / 10000000)) + " Crore " + (num % 10000000 ? inWords(num % 10000000) : "");
  }

  const intPart = Math.floor(amount);
  const words = inWords(intPart) || "Zero";
  return words + " Rupees Only";
}

/* -------------- Sample catalog -------------- */
const sampleCatalog = [
  { id: "PVC-63-4kg", label: "Finolex Pipe 63 mm 4kg", category: "PVC Pipe", size: "63 mm_4kg", rate: 310, gst: 5 },
  { id: "PVC-75-4kg", label: "Finolex Pipe 75 mm 4kg", category: "PVC Pipe", size: "75 mm_4kg", rate: 440, gst: 5 },
  { id: "PVC-90-4kg", label: "Finolex Pipe 90 mm 4kg", category: "PVC Pipe", size: "90 mm_4kg", rate: 890, gst: 5 },

  { id: "LAT-20-4-40", label: "20-4-40 Lateral (finodrip)", category: "Lateral", size: "20-4-40", rate: 750, gst: 5 },
  { id: "LAT-20-2-40", label: "20-2-40 Lateral", category: "Lateral", size: "20-2-40", rate: 700, gst: 5 },
  { id: "LAT-20-plain", label: "20mm Plain Lateral", category: "Lateral", size: "20mm plain", rate: 6.6, gst: 5 },

  { id: "DR-4lph", label: "Online Dripper 4 LPH", category: "Dripper", size: "4 LPH", rate: 3.5, gst: 5 },
  { id: "DR-8lph", label: "Online Dripper 8 LPH", category: "Dripper", size: "8 LPH", rate: 6.6, gst: 5 },

  { id: "F-SCREEN-63", label: "Screen Filter 63mm", category: "Filter", size: "63 mm", rate: 1200, gst: 18 },
  { id: "F-DISC-75", label: "Disc Filter 75mm", category: "Filter", size: "75 mm", rate: 3200, gst: 18 },
  { id: "F-SAND-90", label: "Sand Filter 90mm", category: "Filter", size: "90 mm", rate: 14500, gst: 18 },

  { id: "VAL-63", label: "Control Valve 63mm", category: "Valve", size: "63 mm", rate: 2200, gst: 18 },
  { id: "TAKEUP-20", label: "Takeup 20mm (100pc)", category: "Accessories", size: "20 mm", rate: 660, gst: 12 },
  { id: "GROM-20", label: "Grommet 20mm (100pc)", category: "Accessories", size: "20 mm", rate: 220, gst: 12 },
  { id: "END-16", label: "End Cap 16mm (100pc)", category: "Accessories", size: "16 mm", rate: 150, gst: 5 },
];

/* ---------- Compute totals (full invoice) ---------- */
function computeTotals(invoice) {
  const items = invoice.items || [];
  let subtotal = 0;
  let totalGST = 0;

  items.forEach((it) => {
    const q = Number(it.qty || 0);
    const r = Number(it.rate || 0);
    const amt = q * r;
    subtotal += amt;
    totalGST += (amt * Number(it.gst || 0)) / 100;
  });

  // optional fields
  const installation = Number(invoice.installation || 0);
  const discount = Number(invoice.discount || 0);

  const beforeTax = subtotal + installation - discount;
  // We'll assume a single GST rate if needed; but we already calculated item GST total
  const finalGST = totalGST;
  const rawTotal = beforeTax + finalGST;
  const rounded = Math.round(rawTotal);
  const roundOff = Number((rounded - rawTotal).toFixed(2));
  const finalTotal = Number((rawTotal + roundOff).toFixed(2));

  return {
    subtotal,
    totalGST: finalGST,
    installation,
    discount,
    beforeTax,
    roundOff,
    finalTotal,
  };
}

/* ---------------- ItemsEngine Component ---------------- */
function ItemsEngine({ invoice, setInvoice }) {
  const items = invoice.items || [];

  const addRow = () => {
    const newItem = { id: Date.now(), desc: "", catalogId: "", size: "", qty: 1, rate: 0, gst: 5 };
    setInvoice({ ...invoice, items: [...items, newItem] });
  };

  const removeRow = (idx) => {
    const newItems = items.filter((_, i) => i !== idx);
    setInvoice({ ...invoice, items: newItems });
  };

  const updateRow = (idx, patch) => {
    const newItems = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setInvoice({ ...invoice, items: newItems });
  };

  const onCatalogSelect = (idx, catalogId) => {
    const catalogItem = sampleCatalog.find((c) => c.id === catalogId);
    if (!catalogItem) return;
    updateRow(idx, {
      catalogId,
      desc: catalogItem.label,
      size: catalogItem.size,
      rate: catalogItem.rate,
      gst: catalogItem.gst,
    });
  };

  const onQtyChange = (idx, v) => updateRow(idx, { qty: Number(v || 0) });
  const onRateChange = (idx, v) => updateRow(idx, { rate: Number(v || 0) });

  // derived totals for preview
  const derived = items.reduce(
    (acc, it) => {
      const amt = Number(it.qty || 0) * Number(it.rate || 0);
      acc.subtotal += amt;
      acc.totalGST += (amt * Number(it.gst || 0)) / 100;
      return acc;
    },
    { subtotal: 0, totalGST: 0 }
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Items</h3>
        <div>
          <button onClick={addRow} style={{ padding: "6px 10px", marginRight: 8 }}>+ Add item</button>
        </div>
      </div>

      <div style={{ border: "1px solid #e6efe7", borderRadius: 6, overflow: "hidden", marginTop: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 100px 100px 40px", background: "#f3faf4", padding: 8, fontWeight: 700, color: "#1b7a3a" }}>
          <div style={{ textAlign: "center" }}>#</div>
          <div>Item / Description</div>
          <div>Size</div>
          <div>Qty</div>
          <div>Rate</div>
          <div>GST</div>
          <div></div>
        </div>

        {items.map((it, idx) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 100px 100px 40px", padding: 8, borderTop: "1px solid #f0f6f0", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>{idx + 1}</div>

            <div>
              <select value={it.catalogId || ""} onChange={(e) => onCatalogSelect(idx, e.target.value)} style={{ width: "100%" }}>
                <option value="">-- pick from catalog --</option>
                {sampleCatalog.map((c) => (
                  <option key={c.id} value={c.id}>{c.category} → {c.label} (₹{c.rate})</option>
                ))}
              </select>

              <input
                placeholder="Or type description"
                value={it.desc}
                onChange={(e) => updateRow(idx, { desc: e.target.value })}
                style={{ width: "100%", marginTop: 6 }}
              />
            </div>

            <div>
              <input value={it.size || ""} onChange={(e) => updateRow(idx, { size: e.target.value })} />
            </div>

            <div>
              <input type="number" value={it.qty} onChange={(e) => onQtyChange(idx, e.target.value)} style={{ width: "70px" }} />
            </div>

            <div>
              <input type="number" step="0.01" value={it.rate} onChange={(e) => onRateChange(idx, e.target.value)} style={{ width: "90px" }} />
              <div style={{ fontSize: 11, color: "#666" }}>₹ {formatMoney((it.qty || 0) * (it.rate || 0))}</div>
            </div>

            <div>
              <select value={it.gst || 0} onChange={(e) => updateRow(idx, { gst: Number(e.target.value) })}>
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
              </select>
            </div>

            <div style={{ textAlign: "center" }}>
              <button onClick={() => removeRow(idx)} style={{ color: "red" }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#444" }}>Items: {items.length} • Subtotal: ₹ {formatMoney(derived.subtotal)} • GST total: ₹ {formatMoney(derived.totalGST)}</div>
        <div>
          <button onClick={() => {
            // add sample item quickly
            const c = sampleCatalog[0];
            setInvoice({
              ...invoice,
              items: [...items, { id: Date.now(), desc: c.label, catalogId: c.id, size: c.size, qty: 1, rate: c.rate, gst: c.gst }],
            });
          }}>Add sample</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Main Component ---------------- */
export default function AgriFlowDesignerAppV2() {
  const [invoice, setInvoice] = useState({
    number: "Q-001",
    date: new Date().toLocaleDateString("en-GB"),
    farmerName: "",
    village: "",
    applicationId: "",
    surveyNo: "",
    areaValue: "",
    areaUnit: "R",
    crop: "",
    lateral: "",
    installation: 0,
    discount: 0,
    items: [],
  });

  const quoteRef = useRef(null);

  const crops = [
    "Sugarcane",
    "Pomegranate",
    "Lemon",
    "Grapes",
    "Banana",
    "Mango",
    "Soyabean",
    "Turmeric",
    "Vegetables",
    "Custom Crop"
  ];

  const lateralTypes = [
    "20-4-40 (Inline)",
    "20-2-40 (Inline)",
    "20mm Plain Lateral",
    "16mm Plain Lateral",
    "Online Dripper 4LPH",
    "Online Dripper 8LPH",
    "FinoDrip (Strip Type)",
    "FinoGol (Round Inline)"
  ];

  const totals = computeTotals(invoice);

  /* Print handler: opens a new window with the quote HTML and calls print */
  const printQuotation = () => {
    if (!quoteRef.current) return;
    const content = quoteRef.current.innerHTML;
    const style = `
      <style>
        body{font-family: Arial, Helvetica, sans-serif; color:#222; padding:12px;}
        .header { display:flex; justify-content:space-between; align-items:flex-start;}
        .green { color:#1b7a3a; }
        .table { border-collapse: collapse; width:100%;}
        .table th, .table td { border: 1px solid #e6efe7; padding:6px; vertical-align: top;}
      </style>
    `;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    printWindow.document.open();
    printWindow.document.write(`<html><head><title>Quotation ${invoice.number}</title>${style}</head><body>${content}</body></html>`);
    printWindow.document.close();
    // wait briefly then print
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1 style={{ color: "#1b7a3a" }}>AgriFlow — Quotation Builder</h1>

      {/* Farmer form */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label>Farmer / शेतकरी</label><br />
          <input value={invoice.farmerName} onChange={(e) => setInvoice({ ...invoice, farmerName: e.target.value })} style={{ width: "98%" }} />
        </div>

        <div>
          <label>Village / गाव</label><br />
          <input value={invoice.village} onChange={(e) => setInvoice({ ...invoice, village: e.target.value })} style={{ width: "98%" }} />
        </div>

        <div>
          <label>Application ID / Aadhaar / Dealer GST</label><br />
          <input value={invoice.applicationId} onChange={(e) => setInvoice({ ...invoice, applicationId: e.target.value })} style={{ width: "98%" }} />
        </div>

        <div>
          <label>Survey No</label><br />
          <input value={invoice.surveyNo} onChange={(e) => setInvoice({ ...invoice, surveyNo: e.target.value })} style={{ width: "98%" }} />
        </div>

        <div>
          <label>Area (value)</label><br />
          <input value={invoice.areaValue} onChange={(e) => setInvoice({ ...invoice, areaValue: e.target.value })} style={{ width: "60%" }} />{" "}
          <select value={invoice.areaUnit} onChange={(e) => setInvoice({ ...invoice, areaUnit: e.target.value })}>
            <option>R</option>
            <option>Ha</option>
          </select>
        </div>

        <div>
          <label>Spacing</label><br />
          <input value={invoice.spacing} onChange={(e) => setInvoice({ ...invoice, spacing: e.target.value })} style={{ width: "98%" }} />
        </div>

        <div>
          <label>Crop</label><br />
          <select value={invoice.crop} onChange={(e) => setInvoice({ ...invoice, crop: e.target.value })} style={{ width: "98%" }}>
            <option value="">Select crop</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label>Lateral Type (choose manually)</label><br />
          <select value={invoice.lateral} onChange={(e) => setInvoice({ ...invoice, lateral: e.target.value })} style={{ width: "98%" }}>
            <option value="">Select lateral</option>
            {lateralTypes.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Items engine */}
      <ItemsEngine invoice={invoice} setInvoice={setInvoice} />

      {/* Installation / discount */}
      <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
        <div>
          <label>Installation (₹)</label><br />
          <input type="number" value={invoice.installation} onChange={(e) => setInvoice({ ...invoice, installation: Number(e.target.value || 0) })} />
        </div>

        <div>
          <label>Discount (₹)</label><br />
          <input type="number" value={invoice.discount} onChange={(e) => setInvoice({ ...invoice, discount: Number(e.target.value || 0) })} />
        </div>

        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div>Sub-Total: ₹ {formatMoney(totals.subtotal)}</div>
          <div>Total GST: ₹ {formatMoney(totals.totalGST)}</div>
          <div style={{ fontWeight: 800, marginTop: 6, color: "#1b7a3a" }}>Final Total: ₹ {formatMoney(totals.finalTotal)}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={printQuotation} style={{ padding: "10px 14px", background: "#1b7a3a", color: "#fff", border: "none", borderRadius: 6 }}>Print Quotation</button>
        {" "}
        <button onClick={() => {
          // quick save to localStorage (simple persistence)
          const projects = JSON.parse(localStorage.getItem("agri_projects_v1") || "[]");
          projects.push({ id: Date.now(), invoice });
          localStorage.setItem("agri_projects_v1", JSON.stringify(projects));
          alert("Saved locally (" + projects.length + ")");
        }} style={{ padding: "10px 12px" }}>Save Project (local)</button>
      </div>

      <hr style={{ marginTop: 18 }} />

      {/* Printable Quotation Block */}
      <div ref={quoteRef} style={{ width: 800, padding: 18, fontSize: 13, background: "#fff", color: "#222" }}>
        {/* header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: 6, background: "#eaf7ec", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b7a3a", fontWeight: 800 }}>
              AF
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#1b7a3a" }}>Gunwant Krishi Seva Kendra</div>
              <div style={{ fontSize: 12, color: "#0b5fa3" }}>Itkur, Tq. Kallam, Dist. Dharashiv</div>
              <div style={{ fontSize: 11, color: "#555" }}>Prop. Ganesh G. Adsul • Mob: 8975757606</div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0b5fa3" }}>{/* type */}QUOTATION</div>
            <div style={{ marginTop: 6 }}>No: <b>{invoice.number}</b></div>
            <div>Date: <b>{invoice.date}</b></div>
          </div>
        </div>

        <hr style={{ margin: "8px 0", borderTop: "2px solid #e6f0ea" }} />

        {/* farmer block */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
          <div>
            <div><strong>Farmer:</strong> {invoice.farmerName}</div>
            <div><strong>Village:</strong> {invoice.village}</div>
            <div><strong>Crop:</strong> {invoice.crop}</div>
            <div><strong>Application ID:</strong> {invoice.applicationId}</div>
          </div>
          <div>
            <div><strong>Survey No:</strong> {invoice.surveyNo}</div>
            <div><strong>Area:</strong> {invoice.areaValue} {invoice.areaUnit}</div>
            <div><strong>Spacing:</strong> {invoice.spacing}</div>
            <div><strong>Lateral:</strong> {invoice.lateral}</div>
          </div>
        </div>

        {/* items table */}
        <div style={{ border: "1px solid #e6efe7", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 120px 80px 100px 120px", background: "#f3faf4", padding: "8px 10px", fontWeight: 700, color: "#1b7a3a" }}>
            <div style={{ textAlign: "center" }}>No</div>
            <div>Description / वस्तू</div>
            <div style={{ textAlign: "center" }}>Size</div>
            <div style={{ textAlign: "center" }}>Qty</div>
            <div style={{ textAlign: "right" }}>Rate</div>
            <div style={{ textAlign: "right" }}>Amount</div>
          </div>

          {(invoice.items || []).map((it, idx) => {
            const qty = Number(it.qty || 0);
            const rate = Number(it.rate || 0);
            const amount = qty * rate;
            return (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "50px 1fr 120px 80px 100px 120px", padding: "8px 10px", borderTop: "1px solid #f0f6f0" }}>
                <div style={{ textAlign: "center" }}>{idx + 1}</div>
                <div>{it.desc}</div>
                <div style={{ textAlign: "center" }}>{it.size}</div>
                <div style={{ textAlign: "center" }}>{it.qty}</div>
                <div style={{ textAlign: "right" }}>₹ {formatMoney(it.rate)}</div>
                <div style={{ textAlign: "right" }}>₹ {formatMoney(amount)}</div>
              </div>
            );
          })}
        </div>

        {/* totals box */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10 }}>
          <div style={{ width: "60%", fontSize: 12, color: "#555" }}>
            <div><strong>Notes:</strong></div>
            <div>- Accessories & fittings charge usually 3–10% (choose per case)</div>
            <div>- Subsidy rules vary; verify with scheme authority</div>
          </div>

          <div style={{ width: "40%", border: "1px solid #e6efe7", borderRadius: 6, padding: 10, background: "#fbfff9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Sub-Total</div>
              <div>₹ {formatMoney(totals.subtotal)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Installation</div>
              <div>₹ {formatMoney(totals.installation)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Discount</div>
              <div>- ₹ {formatMoney(totals.discount)}</div>
            </div>

            <div style={{ borderTop: "1px dashed #e0e6e0", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <div>Taxable</div>
              <div>₹ {formatMoney(totals.beforeTax)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div>GST (items)</div>
              <div>₹ {formatMoney(totals.totalGST)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div>Round Off</div>
              <div>₹ {formatMoney(totals.roundOff)}</div>
            </div>

            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #e6efe7", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16 }}>
              <div style={{ color: "#1b7a3a", fontWeight: 800 }}>TOTAL</div>
              <div style={{ color: "#1b7a3a", fontWeight: 800 }}>₹ {formatMoney(totals.finalTotal)}</div>
            </div>
          </div>
        </div>

        {/* signatures */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <div style={{ width: "60%", fontSize: 11, color: "#444" }}>
            <div>Amount in words: <i>{numberToWords(totals.finalTotal)}</i></div>
            <div style={{ marginTop: 6 }}>Customer signature: ____________________</div>
          </div>
          <div style={{ textAlign: "right", width: "38%" }}>
            <div>For: Gunwant Krishi Seva Kendra</div>
            <div style={{ height: 36 }}></div>
            <div>Authorized Sign: ____________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}

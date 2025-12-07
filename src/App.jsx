import { /* ---------- Items Engine (paste into AgriFlowDesignerAppV2.jsx) ---------- */
const sampleCatalog = [
  // PVC Pipes
  { id: "PVC-63-4kg", label: "Finolex Pipe 63 mm 4kg", category: "PVC Pipe", size: "63 mm_4kg", rate: 310, gst: 5 },
  { id: "PVC-75-4kg", label: "Finolex Pipe 75 mm 4kg", category: "PVC Pipe", size: "75 mm_4kg", rate: 440, gst: 5 },
  { id: "PVC-90-4kg", label: "Finolex Pipe 90 mm 4kg", category: "PVC Pipe", size: "90 mm_4kg", rate: 890, gst: 5 },

  // Laterals / Drip
  { id: "LAT-20-4-40", label: "20-4-40 Lateral (finodrip)", category: "Lateral", size: "20-4-40", rate: 750, gst: 5 },
  { id: "LAT-20-2-40", label: "20-2-40 Lateral", category: "Lateral", size: "20-2-40", rate: 700, gst: 5 },
  { id: "LAT-20-plain", label: "20mm Plain Lateral", category: "Lateral", size: "20mm plain", rate: 6.6, gst: 5 },

  // Drippers
  { id: "DR-4lph", label: "Online Dripper 4 LPH", category: "Dripper", size: "4 LPH", rate: 3.5, gst: 5 },
  { id: "DR-8lph", label: "Online Dripper 8 LPH", category: "Dripper", size: "8 LPH", rate: 6.6, gst: 5 },
  { id: "DR-16lph", label: "Online Dripper 16 LPH", category: "Dripper", size: "16 LPH", rate: 13.2, gst: 5 },

  // Filters
  { id: "F-SCREEN-63", label: "Screen Filter 63mm", category: "Filter", size: "63 mm", rate: 1200, gst: 18 },
  { id: "F-DISC-75", label: "Disc Filter 75mm", category: "Filter", size: "75 mm", rate: 3200, gst: 18 },
  { id: "F-SAND-90", label: "Sand Filter 90mm", category: "Filter", size: "90 mm", rate: 14500, gst: 18 },

  // Valves & Accessories
  { id: "VAL-63", label: "Control Valve 63mm", category: "Valve", size: "63 mm", rate: 2200, gst: 18 },
  { id: "TAKEUP-20", label: "Takeup 20mm (100pc)", category: "Accessories", size: "20 mm", rate: 660, gst: 12 },
  { id: "GROM-20", label: "Grommet 20mm (100pc)", category: "Accessories", size: "20 mm", rate: 220, gst: 12 },
  { id: "END-16", label: "End Cap 16mm (100pc)", category: "Accessories", size: "16 mm", rate: 150, gst: 5 }
];

/* fallback helpers (if you already added formatMoney and computeTotals earlier, keep those) */
const formatMoney = (n) => {
  if (n == null || isNaN(n)) return "0.00";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const computeTotalsLocal = (items = []) => {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty || 0) * Number(it.rate || 0)), 0);
  // not using installation/discount here, those are computed separately in computeTotals parent
  const gstDetails = items.reduce((acc, it) => {
    const gstPct = Number(it.gst || 0);
    const amt = Number(it.qty || 0) * Number(it.rate || 0);
    const gstAmt = (amt * gstPct) / 100;
    acc.totalGST += gstAmt;
    return acc;
  }, { totalGST: 0 });
  return { subtotal, totalGST: gstDetails.totalGST };
};

/* ItemsEngine component */
function ItemsEngine({ invoice, setInvoice }) {
  // invoice expected to be in parent state: { items: [...] }
  const items = invoice.items || [];

  // add blank row
  const addRow = () => {
    const newItem = { id: Date.now(), desc: "", catalogId: "", size: "", qty: 1, rate: 0, gst: 5 };
    const newItems = [...items, newItem];
    setInvoice({ ...invoice, items: newItems });
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

  // derived totals (for UI)
  const derived = computeTotalsLocal(items);

  return (
    <div style={{ marginTop: 14 }}>
      <h3>Items (Add / Edit)</h3>

      <div style={{ marginBottom: 8 }}>
        <button onClick={addRow} style={{ padding: "6px 10px" }}>+ Add item</button>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 100px 100px 40px", background: "#f0f8f2", padding: 8, fontWeight: 700 }}>
          <div style={{ textAlign: "center" }}>#</div>
          <div>Item / Description</div>
          <div>Size</div>
          <div>Qty</div>
          <div>Rate</div>
          <div>GST</div>
          <div></div>
        </div>

        {items.map((it, idx) => (
          <div key={it.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 80px 100px 100px 40px", padding: "8px", borderTop: "1px solid #eee", alignItems: "center" }}>
            <div style={{ textAlign: "center" }}>{idx + 1}</div>

            <div>
              <select
                style={{ width: "100%" }}
                value={it.catalogId || ""}
                onChange={(e) => onCatalogSelect(idx, e.target.value)}
              >
                <option value="">-- pick item from catalog --</option>
                {sampleCatalog.map((c) => (
                  <option key={c.id} value={c.id}>{c.category} → {c.label} (₹{c.rate})</option>
                ))}
              </select>

              <input
                placeholder="Or type description"
                style={{ width: "100%", marginTop: 6 }}
                value={it.desc}
                onChange={(e) => updateRow(idx, { desc: e.target.value })}
              />
            </div>

            <div>
              <input value={it.size || ""} onChange={(e) => updateRow(idx, { size: e.target.value })} />
            </div>

            <div>
              <input type="number" value={it.qty} onChange={(e) => onQtyChange(idx, e.target.value)} />
            </div>

            <div>
              <input type="number" step="0.01" value={it.rate} onChange={(e) => onRateChange(idx, e.target.value)} />
              <div style={{ fontSize: 11, color: "#666" }}>₹ {formatMoney((it.qty || 0) * (it.rate || 0))}</div>
            </div>

            <div>
              <select value={it.gst || 0} onChange={(e) => updateRow(idx, { gst: Number(e.target.value) })}>
                <option value={0}>GST 0%</option>
                <option value={5}>GST 5%</option>
                <option value={12}>GST 12%</option>
                <option value={18}>GST 18%</option>
              </select>
            </div>

            <div style={{ textAlign: "center" }}>
              <button onClick={() => removeRow(idx)} style={{ color: "red" }}>✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* quick totals preview */}
      <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#666" }}>
          Items: {items.length} • Subtotal: ₹ {formatMoney(derived.subtotal)} • GST total: ₹ {formatMoney(derived.totalGST)}
        </div>
        <div>
          <button onClick={() => {
            // small convenience: if no items, add default sample
            if ((invoice.items || []).length === 0) {
              setInvoice({ ...invoice, items: [ { id: Date.now(), desc: sampleCatalog[0].label, catalogId: sampleCatalog[0].id, size: sampleCatalog[0].size, qty: 1, rate: sampleCatalog[0].rate, gst: sampleCatalog[0].gst } ] });
            }
          }}>Add sample item</button>
        </div>
      </div>
    </div>
  );
}
 } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App

import React, { useRef, useState, useEffect } from "react";

// AgriFlow Designer V2
// - Left: field layout drawing on grid (sprinkler Y, valve square, lines, rectangles)
// - Right: Quotation / Tax Invoice in Marathi-style format
// - Exports: Layout PDF, Quotation PDF, Tax Invoice PDF

export default function AgriFlowDesignerAppV2() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [tool, setTool] = useState("line"); // line | rect | symbol | pan
  const drawing = useRef(false);
  const [shapes, setShapes] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [color, setColor] = useState("#111827");
  const [lineWidth, setLineWidth] = useState(2);
  const [symbolType, setSymbolType] = useState("sprinkler"); // sprinkler | valve

  const layoutRef = useRef(null);
  const quoteRef = useRef(null);

  const [header, setHeader] = useState({
    title: "गुणवंत कृषी सेवा केंद्र",
    address: "Itkur, Tq. Kalamb, Dist. Dharashiv",
    distributor: "Finolex Plasson Ind. Pvt. Ltd.",
    mob: "8975757606",
    gst: "27AOBPA0712N1ZB",
  });

  const [invoice, setInvoice] = useState({
  type: "Quotation", // or "Tax Invoice"
  number: "113",
  date: new Date().toLocaleDateString("en-GB"),
  farmerName: "",
  village: "",
  appId: "",
  crop: "",
  spacing: "12 मि. X 12 मि.",
  surveyNo: "",
  areaValue: "",
  areaUnit: "R", // R or HA etc.
  extra1Label: "Application ID",
  extra1Value: "",
  extra2Label: "",
  extra2Value: "",
  taxPercent: 18,
  installationCharges: 0,
  discount: 0,
  roundOff: 0,
  items: [
    { desc: "स्प्रिंकलर पाईप", size: "फिनोलेक्स 3/4\"", qty: 30, rate: 659 },
    { desc: "नोझल / स्प्रिंकलर", size: "गन मेटल", qty: 8, rate: 746 },
  ],
});

// ------------------- totals helpers -------------------
const formatMoney = (n) => {
  if (n == null || isNaN(n)) return "0.00";
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const computeTotals = (inv) => {
  const items = inv.items || [];
  const subtotal = items.reduce((s, it) => {
    const qty = Number(it.qty || 0);
    const rate = Number(it.rate || 0);
    return s + qty * rate;
  }, 0);

  const installation = Number(inv.installationCharges || 0);
  const discount = Number(inv.discount || 0);
  const roundOff = Number(inv.roundOff || 0);
  const beforeTax = subtotal + installation - discount;
  const taxPercent = Number(inv.taxPercent || 0);
  const totalGST = (beforeTax * taxPercent) / 100;
  const finalTotal = beforeTax + totalGST + roundOff;

  return {
    subtotal,
    installation,
    discount,
    beforeTax,
    totalGST,
    finalTotal,
    taxPercent,
    roundOff,
  };
};


  // ========== CANVAS SETUP ============

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = 1000;
    c.height = 700;
    const ctx = c.getContext("2d");
    ctxRef.current = ctx;
    ctx.lineCap = "round";
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redrawAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, color, lineWidth, symbolType]);

  function startDraw(e) {
    if (tool === "pan") return;
    drawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentShape({
      tool,
      color,
      lineWidth,
      symbolType,
      start: { x, y },
      end: { x, y },
    });
  }

  function moveDraw(e) {
    if (!drawing.current || !currentShape) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const updated = { ...currentShape, end: { x, y } };
    setCurrentShape(updated);
    redrawAll(updated);
  }

  function endDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentShape) {
      setShapes((prev) => [...prev, currentShape]);
      setCurrentShape(null);
    }
  }

  function drawGrid(ctx) {
    const step = 20;
    ctx.save();
    ctx.strokeStyle = "#dbe7db"; // pale greenish grid
    ctx.lineWidth = 1;
    for (let x = 0; x <= canvasRef.current.width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasRef.current.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvasRef.current.height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasRef.current.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawArrow(ctx, x1, y1, x2, y2) {
    const headlen = 8;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle - Math.PI / 6),
      y2 - headlen * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(x2, y2);
    ctx.lineTo(
      x2 - headlen * Math.cos(angle + Math.PI / 6),
      y2 - headlen * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }

  function drawShape(ctx, s) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.lineWidth;

    if (s.tool === "line") {
      ctx.beginPath();
      ctx.moveTo(s.start.x, s.start.y);
      ctx.lineTo(s.end.x, s.end.y);
      ctx.stroke();
      drawArrow(ctx, s.start.x, s.start.y, s.end.x, s.end.y);
    } else if (s.tool === "rect") {
      const x = Math.min(s.start.x, s.end.x);
      const y = Math.min(s.start.y, s.end.y);
      const w = Math.abs(s.end.x - s.start.x);
      const h = Math.abs(s.end.y - s.start.y);
      ctx.strokeRect(x, y, w, h);
    } else if (s.tool === "symbol") {
      const cx = s.end.x;
      const cy = s.end.y;
      if (s.symbolType === "sprinkler") {
        // sprinkler Y symbol
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(cx, cy + 12);
        ctx.moveTo(cx, cy - 2);
        ctx.lineTo(cx - 8, cy + 6);
        ctx.moveTo(cx, cy - 2);
        ctx.lineTo(cx + 8, cy + 6);
        ctx.stroke();
      } else if (s.symbolType === "valve") {
        ctx.strokeRect(cx - 6, cy - 6, 12, 12);
      }
    }

    ctx.restore();
  }

  function redrawAll(tempShape) {
    const c = canvasRef.current;
    const ctx = ctxRef.current;
    if (!ctx || !c) return;
    ctx.clearRect(0, 0, c.width, c.height);
    drawGrid(ctx);

    // Example outer boundary (you can change)
    ctx.save();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 120, 520, 400);
    ctx.restore();

    shapes.forEach((s) => drawShape(ctx, s));
    if (tempShape) drawShape(ctx, tempShape);
  }

  function undoShape() {
    setShapes((prev) => prev.slice(0, -1));
  }

  function clearCanvas() {
    setShapes([]);
  }

  // ========== INVOICE MATH ============

  const subtotal = () =>
    invoice.items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0),
      0
    );

  const taxAmount = () => (subtotal() * (invoice.taxPercent || 0)) / 100;

  const total = () =>
    subtotal() +
    Number(invoice.installationCharges || 0) -
    Number(invoice.discount || 0) +
    taxAmount() +
    Number(invoice.roundOff || 0);

  function updateItem(index, key, value) {
    setInvoice((old) => {
      const items = [...old.items];
      items[index] = {
        ...items[index],
        [key]:
          key === "desc" || key === "size" ? value : value === "" ? "" : Number(value),
      };
      return { ...old, items };
    });
  }

  function addItem() {
    setInvoice((old) => ({
      ...old,
      items: [...old.items, { desc: "", size: "", qty: 1, rate: 0 }],
    }));
  }

  // ========== PDF EXPORT HELPERS ============

  async function exportElementToPdf(element, filename) {
    const html2canvas = (await import("html2canvas")).default;
    const jsPDF = (await import("jspdf")).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "pt", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    pdf.addImage(imgData, "PNG", margin, margin, imgW, imgH);
    pdf.save(filename);
  }

  async function exportLayoutPDF() {
    const layoutEl = layoutRef.current;
    if (!layoutEl || !canvasRef.current) return;

    // put latest canvas snapshot into hidden layout box
    const holder = layoutEl.querySelector(".layout-snapshot");
    if (holder) {
      holder.innerHTML = "";
      const img = document.createElement("img");
      img.src = canvasRef.current.toDataURL("image/png");
      img.style.width = "100%";
      img.style.display = "block";
      holder.appendChild(img);
    }

    await exportElementToPdf(
      layoutEl,
      `${invoice.farmerName || "layout"}-layout.pdf`
    );
  }

  async function exportQuotationPDF() {
    const qnode = quoteRef.current;
    if (!qnode) return;
    await exportElementToPdf(
      qnode,
      `${invoice.farmerName || "quotation"}-quotation.pdf`
    );
  }

  async function exportTaxInvoicePDF() {
    const qnode = quoteRef.current;
    if (!qnode) return;
    const originalType = invoice.type;
    setInvoice((old) => ({ ...old, type: "Tax Invoice" }));
    // allow React to update text then capture (small delay)
    setTimeout(async () => {
      await exportElementToPdf(
        qnode,
        `${invoice.farmerName || "invoice"}-taxinvoice.pdf`
      );
      // restore type
      setInvoice((old) => ({ ...old, type: originalType }));
    }, 200);
  }

  // ========== RENDER ============

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 12 }}>
      <h2 style={{ marginBottom: 8 }}>AgriFlow Design Lab — Layout + Quotation</h2>

      <div style={{ display: "flex", gap: 12 }}>
        {/* LEFT: CANVAS */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <label>
              Tool:{" "}
              <select
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                style={{ marginLeft: 4 }}
              >
                <option value="line">Line (Pipe)</option>
                <option value="rect">Rect (Field)</option>
                <option value="symbol">Symbol (Sprinkler / Valve)</option>
                <option value="pan">Pan (No draw)</option>
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Color:
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>

            <label>
              Width:
              <input
                type="range"
                min="1"
                max="6"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
              />
            </label>

            <label>
              Symbol:
              <select
                value={symbolType}
                onChange={(e) => setSymbolType(e.target.value)}
                disabled={tool !== "symbol"}
                style={{ marginLeft: 4 }}
              >
                <option value="sprinkler">Sprinkler (Y)</option>
                <option value="valve">Valve (□)</option>
              </select>
            </label>

            <button onClick={undoShape}>Undo</button>
            <button onClick={clearCanvas}>Clear</button>
          </div>

          <div
            style={{
              border: "1px solid #ccc",
              background: "#f7fff7",
              padding: 6,
            }}
          >
            <div style={{ width: "100%", overflow: "auto" }}>
              <canvas
                ref={canvasRef}
                style={{
                  background: "#ffffff",
                  display: "block",
                  cursor: tool === "pan" ? "default" : "crosshair",
                  width: "100%",
                }}
                onMouseDown={startDraw}
                onMouseMove={moveDraw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
              />
            </div>
          </div>

          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={exportLayoutPDF}>Export Layout (PDF)</button>
            <button
              onClick={() => {
                const a = document.createElement("a");
                a.href = canvasRef.current.toDataURL("image/png");
                a.download = `${invoice.farmerName || "layout"}.png`;
                a.click();
              }}
            >
              Save Layout PNG
            </button>
          </div>
        </div>

        {/* RIGHT: QUOTATION / INVOICE */}
        <div style={{ width: 460 }}>
          {/* Header block */}
          <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 8 }}>
            <h3 style={{ marginTop: 0 }}>Header / Shop Details</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                fontSize: 13,
              }}
            >
              <input
                value={header.title}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, title: e.target.value }))
                }
              />
              <input
                value={header.address}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, address: e.target.value }))
                }
              />
              <input
                value={header.distributor}
                onChange={(e) =>
                  setHeader((h) => ({ ...h, distributor: e.target.value }))
                }
              />
              <input
                value={header.mob}
                onChange={(e) => setHeader((h) => ({ ...h, mob: e.target.value }))}
              />
              <input
                value={header.gst}
                onChange={(e) => setHeader((h) => ({ ...h, gst: e.target.value }))}
              />
            </div>
          </div>

          {/* Invoice block */}
          <div style={{ border: "1px solid #ddd", padding: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 6,
                marginBottom: 6,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <label>
                प्रकार:
                <select
                  value={invoice.type}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, type: e.target.value }))
                  }
                  style={{ marginLeft: 4 }}
                >
                  <option value="Quotation">QUOTATION</option>
                  <option value="Tax Invoice">TAX INVOICE</option>
                </select>
              </label>
              <input
                placeholder="No"
                value={invoice.number}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, number: e.target.value }))
                }
              />
              <input
                placeholder="Date"
                value={invoice.date}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, date: e.target.value }))
                }
              />
            </div>

                        <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <input
                placeholder="शेतकर्‍याचे नाव / Farmer"
                value={invoice.farmerName}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, farmerName: e.target.value }))
                }
              />
              <input
                placeholder="गाव / Village"
                value={invoice.village}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, village: e.target.value }))
                }
              />
              <input
                placeholder="Spacing (उदा. 12 X 12 मि.)"
                value={invoice.spacing}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, spacing: e.target.value }))
                }
              />
              <input
                placeholder="पीक / Crop"
                value={invoice.crop}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, crop: e.target.value }))
                }
              />
              <input
                placeholder="Survey No / सर्वे नं"
                value={invoice.surveyNo}
                onChange={(e) =>
                  setInvoice((inv) => ({ ...inv, surveyNo: e.target.value }))
                }
              />
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  placeholder="Area"
                  value={invoice.areaValue}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, areaValue: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
                <select
                  value={invoice.areaUnit}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, areaUnit: e.target.value }))
                  }
                  style={{ width: 70 }}
                >
                  <option value="R">R</option>
                  <option value="HA">HA</option>
                  <option value="R/HA">R/HA</option>
                </select>
              </div>
            </div>

            {/* Flexible extra info fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  placeholder="Field 1 Label (उदा. Application ID)"
                  value={invoice.extra1Label}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, extra1Label: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
                <input
                  placeholder="Value"
                  value={invoice.extra1Value}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, extra1Value: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <input
                  placeholder="Field 2 Label (उदा. Farmer ID / Dealer GST)"
                  value={invoice.extra2Label}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, extra2Label: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
                <input
                  placeholder="Value"
                  value={invoice.extra2Value}
                  onChange={(e) =>
                    setInvoice((inv) => ({ ...inv, extra2Value: e.target.value }))
                  }
                  style={{ flex: 1 }}
                />
              </div>
            </div>



            {/* Items table */}
            <div
              style={{
                maxHeight: 260,
                overflow: "auto",
                border: "1px solid #eee",
                padding: 4,
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                      }}
                    >
                      क्र.
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #ddd",
                        textAlign: "left",
                      }}
                    >
                      वस्तू / आकार
                    </th>
                    <th style={{ borderBottom: "1px solid #ddd" }}>सं</th>
                    <th style={{ borderBottom: "1px solid #ddd" }}>दर</th>
                    <th style={{ borderBottom: "1px solid #ddd" }}>रक्कम</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((it, i) => (
                    <tr key={i}>
                      <td style={{ padding: "4px 2px" }}>{i + 1}</td>
                      <td style={{ padding: "4px 2px" }}>
                        <input
                          style={{ width: "100%", border: "none" }}
                          value={it.desc}
                          onChange={(e) =>
                            updateItem(i, "desc", e.target.value)
                          }
                        />
                        <div style={{ fontSize: 11, color: "#555" }}>
                          <input
                            style={{
                              width: "100%",
                              border: "none",
                              fontSize: 11,
                            }}
                            placeholder="आकार"
                            value={it.size}
                            onChange={(e) =>
                              updateItem(i, "size", e.target.value)
                            }
                          />
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          style={{
                            width: 50,
                            border: "none",
                            textAlign: "center",
                          }}
                          value={it.qty}
                          onChange={(e) => updateItem(i, "qty", e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 4 }}>
                        <input
                          style={{
                            width: 80,
                            border: "none",
                            textAlign: "right",
                          }}
                          value={it.rate}
                          onChange={(e) =>
                            updateItem(i, "rate", e.target.value)
                          }
                        />
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 4 }}>
                        {(
                          (Number(it.qty) || 0) * (Number(it.rate) || 0)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button onClick={addItem} style={{ marginTop: 4 }}>
                Add Item
              </button>
            </div>

            {/* Totals box */}
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <div
                style={{
                  border: "1px solid #ddd",
                  padding: 6,
                  width: 220,
                  fontSize: 13,
                }}
              >
                <Row label="Sub-total" value={subtotal().toFixed(2)} />
                <Row
                  label="Install."
                  valueInput
                  value={invoice.installationCharges}
                  onChange={(v) =>
                    setInvoice((inv) => ({
                      ...inv,
                      installationCharges: Number(v || 0),
                    }))
                  }
                />
                <Row
                  label={`Tax (${invoice.taxPercent}%)`}
                  value={taxAmount().toFixed(2)}
                />
                <Row
                  label="Discount"
                  valueInput
                  value={invoice.discount}
                  onChange={(v) =>
                    setInvoice((inv) => ({
                      ...inv,
                      discount: Number(v || 0),
                    }))
                  }
                />
                <Row
                  label="Round off"
                  valueInput
                  value={invoice.roundOff}
                  onChange={(v) =>
                    setInvoice((inv) => ({
                      ...inv,
                      roundOff: Number(v || 0),
                    }))
                  }
                />
                <Row
                  label="Final"
                  bold
                  value={total().toFixed(2)}
                />
              </div>
            </div>

            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button onClick={exportQuotationPDF}>Export Quotation PDF</button>
              <button onClick={exportTaxInvoicePDF}>
                Export Tax Invoice PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden layout print template */}
      <div
        ref={layoutRef}
        style={{ position: "absolute", left: -10000, top: 0, width: 794 }}
      >
        <div
          style={{
            width: 794,
            padding: 20,
            background: "#fff",
            fontSize: 12,
          }}
        >
          <div
            style={{
              textAlign: "center",
              fontWeight: "bold",
              fontSize: 16,
            }}
          >
            {header.title}
          </div>
          <div style={{ textAlign: "center", marginBottom: 6 }}>
            {header.address} — Mob: {header.mob} — GST: {header.gst}
          </div>
                    <div style={{ marginBottom: 4 }}>
            शेतकरी: {invoice.farmerName} | गाव: {invoice.village} | पीक:{" "}
            {invoice.crop} | अंतर: {invoice.spacing}
          </div>
          <div style={{ marginBottom: 4 }}>
            सर्वे नं: {invoice.surveyNo} | क्षेत्रफळ: {invoice.areaValue}{" "}
            {invoice.areaUnit}
          </div>
          {(invoice.extra1Label && invoice.extra1Value) && (
            <div style={{ marginBottom: 2 }}>
              {invoice.extra1Label}: {invoice.extra1Value}
            </div>
          )}
          {(invoice.extra2Label && invoice.extra2Value) && (
            <div style={{ marginBottom: 4 }}>
              {invoice.extra2Label}: {invoice.extra2Value}
            </div>
          )}



          <div
            className="layout-snapshot"
            style={{
              border: "1px solid #666",
              height: 800,
              overflow: "hidden",
            }}
          />
          <div style={{ marginTop: 6 }}>
            Legend: स्प्रिंकलर (Y), वॉल्व (□), पाईप (रेषा), दिशा (बाण)
          </div>
        </div>
      </div>

      {/* Hidden quotation / invoice print template */}
      {/* ----- QUOTATION / TAX INVOICE PRINT BLOCK ----- */}
<div ref={quoteRef} style={{ width: 800, padding: 18, fontFamily: "Arial, Helvetica, sans-serif", color: "#222" }}>
  {/* Header */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: 6, background: "#eaf7ec", display: "flex", alignItems: "center", justifyContent: "center", color: "#1b7a3a", fontWeight: 700 }}>
        AF
      </div>
      <div>
        <div style={{ fontSize: 20, color: "#1b7a3a", fontWeight: 800 }}>Gunwant Krishi Seva Kendra</div>
        <div style={{ fontSize: 12, color: "#0b5fa3", marginTop: 2 }}>Itkur, Tq. Kallam, Dist. Dharashiv</div>
        <div style={{ fontSize: 11, color: "#555" }}>Prop. Ganesh G. Adsul • Mob: 8975757606</div>
      </div>
    </div>

    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#0b5fa3" }}>{invoice.type || "QUOTATION"}</div>
      <div style={{ fontSize: 12, marginTop: 6 }}>No: <b>{invoice.number}</b></div>
      <div style={{ fontSize: 12 }}>Date: <b>{invoice.date}</b></div>
    </div>
  </div>

  <hr style={{ border: "none", borderTop: "2px solid #e6f0ea", margin: "6px 0 12px 0" }} />

  {/* Farmer block */}
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10, fontSize: 12 }}>
    <div>
      <div><strong>Farmer / शेतकरी:</strong> {invoice.farmerName}</div>
      <div><strong>Village / गाव:</strong> {invoice.village}</div>
      <div><strong>Crop / पीक:</strong> {invoice.crop}</div>
    </div>
    <div>
      <div><strong>Spacing / अंतर:</strong> {invoice.spacing}</div>
      <div><strong>Survey No / सर्वे नं:</strong> {invoice.surveyNo}</div>
      <div><strong>Area / क्षेत्रफळ:</strong> {invoice.areaValue} {invoice.areaUnit}</div>
    </div>

    {/* Extra fields (spans both columns) */}
    <div style={{ gridColumn: "1 / -1", marginTop: 6 }}>
      {invoice.extra1Label && invoice.extra1Value && (
        <div><strong>{invoice.extra1Label}:</strong> {invoice.extra1Value}</div>
      )}
      {invoice.extra2Label && invoice.extra2Value && (
        <div><strong>{invoice.extra2Label}:</strong> {invoice.extra2Value}</div>
      )}
    </div>
  </div>

  {/* Items table */}
  <div style={{ border: "1px solid #e6efe7", borderRadius: 6, overflow: "hidden", marginBottom: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 120px 80px 100px 120px", background: "#f3faf4", padding: "8px 10px", fontWeight: 700, color: "#1b7a3a", fontSize: 12 }}>
      <div style={{ textAlign: "center" }}>No</div>
      <div>Description / वस्तू</div>
      <div style={{ textAlign: "center" }}>Size / आकार</div>
      <div style={{ textAlign: "center" }}>Qty</div>
      <div style={{ textAlign: "right" }}>Rate</div>
      <div style={{ textAlign: "right" }}>Amount</div>
    </div>

    <div>
      {(invoice.items || []).map((it, idx) => {
        const qty = Number(it.qty || 0);
        const rate = Number(it.rate || 0);
        const amount = qty * rate;
        return (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "50px 1fr 120px 80px 100px 120px", padding: "8px 10px", borderTop: "1px solid #f0f6f0", fontSize: 12, color: "#222" }}>
            <div style={{ textAlign: "center" }}>{idx + 1}</div>
            <div>{it.desc || ""}</div>
            <div style={{ textAlign: "center" }}>{it.size || ""}</div>
            <div style={{ textAlign: "center" }}>{it.qty || ""}</div>
            <div style={{ textAlign: "right" }}>{formatMoney(rate)}</div>
            <div style={{ textAlign: "right" }}>{formatMoney(amount)}</div>
          </div>
        );
      })}
    </div>
  </div>

  {/* Totals box */}
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
    <div style={{ width: "60%", fontSize: 12, color: "#555" }}>
      <div><strong>Notes:</strong></div>
      <div>- Accessories / fittings charge usually 3–10% (choose per-case)</div>
      <div>- Subsidy / government rules may apply — verify with scheme</div>
      <div style={{ marginTop: 6 }}><small>Generated by AgriFlow</small></div>
    </div>

    <div style={{ width: "40%", border: "1px solid #e6efe7", borderRadius: 6, padding: 10, background: "#fbfff9" }}>
      {(() => {
        const t = computeTotals(invoice);
        return (
          <div style={{ fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Sub-Total</div>
              <div>₹ {formatMoney(t.subtotal)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Installation</div>
              <div>₹ {formatMoney(t.installation)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>Discount</div>
              <div>- ₹ {formatMoney(t.discount)}</div>
            </div>

            <div style={{ borderTop: "1px dashed #e0e6e0", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
              <div>Taxable</div>
              <div>₹ {formatMoney(t.beforeTax)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div>GST ({t.taxPercent}%)</div>
              <div>₹ {formatMoney(t.totalGST)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div>Round Off</div>
              <div>₹ {formatMoney(t.roundOff)}</div>
            </div>

            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "2px solid #e6efe7", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16 }}>
              <div style={{ color: "#1b7a3a", fontWeight: 800 }}>TOTAL</div>
              <div style={{ color: "#1b7a3a", fontWeight: 800 }}>₹ {formatMoney(t.finalTotal)}</div>
            </div>
          </div>
        );
      })()}
    </div>
  </div>

  {/* Signature area */}
  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
    <div style={{ width: "60%", fontSize: 11, color: "#444" }}>
      <div>Amount in words: <i>{/* optional: we will add words later */}</i></div>
      <div style={{ marginTop: 6 }}>Customer signature: ____________________</div>
    </div>
    <div style={{ textAlign: "right", width: "38%" }}>
      <div>For: Gunwant Krishi Seva Kendra</div>
      <div style={{ height: 36 }}></div>
      <div>Authorised Sign: ____________________</div>
    </div>
  </div>
</div>

    </div>
  );
}

function Row({ label, value, valueInput, onChange, bold }) {
  const styleRow = {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 2,
    fontWeight: bold ? "bold" : "normal",
  };
  return (
    <div style={styleRow}>
      <div>{label}</div>
      <div>
        {valueInput ? (
          <input
            style={{ width: 80, border: "none", textAlign: "right" }}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

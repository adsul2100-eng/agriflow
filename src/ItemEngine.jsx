import React, { useState, useEffect } from "react";

/*
 ItemEngine.jsx
 AgriFlow Catalogue Editor — with two rates:
  - companyRate (company / govt rate)
  - shopRate (our selling rate)
*/

const CATEGORIES = {
  "PVC Pipe": [
    "63 mm 4 kg",
    "75 mm 4 kg",
    "90 mm 4 kg",
    "63 mm 6 kg",
    "75 mm 6 kg",
  ],
  Lateral: ["20-4-40", "20-2-40", "Plain lateral (class 2)", "Regular lateral"],
  "Online Dripper": ["8 LPH", "16 LPH", "4 LPH"],
  "Inline Dripper": ["Finodrip", "Finogol", "Plain inline"],
  Filter: ["Screen (63mm)", "Screen (75mm)", "Screen (90mm)", "Disc", "Sand"],
  Valve: ["Control Valve 63mm", "Control Valve 75mm", "Flush Valve 63mm"],
  Accessories: ["Take-up 16mm", "Grommet 16mm", "Joiner 16mm", "End cap 16mm"],
  "Fertilizer Unit": ["Venturi 1\"", "Venturi 1.5\"", "Tank 1\"", "Tank 2\""],
  Other: ["Misc"],
};

function blankItem() {
  return {
    name: "",
    category: "",
    subcategory: "",
    size: "",
    companyRate: "", // company / govt
    shopRate: "",    // our selling price
    gst: "5", // default 5%
  };
}

export default function ItemEngine() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankItem());
  const [editingIndex, setEditingIndex] = useState(-1);

  useEffect(() => {
    const s = localStorage.getItem("agriflow_items_v2");
    if (s) setItems(JSON.parse(s));
  }, []);

  useEffect(() => {
    localStorage.setItem("agriflow_items_v2", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (form.category && CATEGORIES[form.category]) {
      if (!CATEGORIES[form.category].includes(form.subcategory)) {
        setForm((f) => ({ ...f, subcategory: "" }));
      }
    } else {
      setForm((f) => ({ ...f, subcategory: "" }));
    }
  }, [form.category]);

  function validateForm() {
    if (!form.name || !form.category) {
      alert("Please fill Item Name and Category.");
      return false;
    }
    if (form.companyRate && isNaN(parseFloat(form.companyRate))) {
      alert("Company Rate must be a number.");
      return false;
    }
    if (!form.shopRate || isNaN(parseFloat(form.shopRate))) {
      alert("Shop Rate is required and must be a number.");
      return false;
    }
    return true;
  }

  function handleAddOrUpdate() {
    if (!validateForm()) return;

    const cleaned = {
      ...form,
      companyRate: form.companyRate ? parseFloat(form.companyRate).toFixed(2) : "",
      shopRate: parseFloat(form.shopRate).toFixed(2),
    };

    if (editingIndex >= 0) {
      const copy = [...items];
      copy[editingIndex] = cleaned;
      setItems(copy);
      setEditingIndex(-1);
    } else {
      setItems([...items, cleaned]);
    }
    setForm(blankItem());
  }

  function startEdit(idx) {
    setForm(items[idx]);
    setEditingIndex(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingIndex(-1);
    setForm(blankItem());
  }

  function handleDelete(idx) {
    if (!confirm("Delete this item?")) return;
    const copy = [...items];
    copy.splice(idx, 1);
    setItems(copy);
    if (editingIndex === idx) cancelEdit();
  }

  function importSample() {
    const sample = [
      {
        name: "Finodrip",
        category: "Inline Dripper",
        subcategory: "Finodrip",
        size: "20-4-40",
        companyRate: "10.00",
        shopRate: "11.00",
        gst: "5",
      },
      {
        name: "Finogol",
        category: "Inline Dripper",
        subcategory: "Finogol",
        size: "20-4-40",
        companyRate: "10.50",
        shopRate: "11.40",
        gst: "5",
      },
      {
        name: "Finolex Pipe 75 mm 4 kg",
        category: "PVC Pipe",
        subcategory: "75 mm 4 kg",
        size: "75 mm 4 kg",
        companyRate: "380.00",
        shopRate: "400.00",
        gst: "5",
      },
    ];
    setItems([...items, ...sample]);
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <h1 style={{ color: "#0b7a2a" }}>🟢 AgriFlow – Catalogue Editor (Item Engine)</h1>

      <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          placeholder="Item Name"
          style={{ flex: "0 1 260px", padding: 8 }}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          style={{ flex: "0 1 160px", padding: 8 }}
        >
          <option value="">Select Category</option>
          {Object.keys(CATEGORIES).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={form.subcategory}
          onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
          style={{ flex: "0 1 200px", padding: 8 }}
          disabled={!form.category}
        >
          <option value="">Subcategory / size</option>
          {form.category &&
            CATEGORIES[form.category].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
        </select>

        <input
          placeholder="Size (optional)"
          style={{ flex: "0 1 140px", padding: 8 }}
          value={form.size}
          onChange={(e) => setForm({ ...form, size: e.target.value })}
        />

        <input
          placeholder="Company Rate (govt)"
          style={{ flex: "0 1 120px", padding: 8 }}
          value={form.companyRate}
          onChange={(e) => setForm({ ...form, companyRate: e.target.value })}
        />

        <input
          placeholder="Shop Rate"
          style={{ flex: "0 1 120px", padding: 8 }}
          value={form.shopRate}
          onChange={(e) => setForm({ ...form, shopRate: e.target.value })}
        />

        <select
          value={form.gst}
          onChange={(e) => setForm({ ...form, gst: e.target.value })}
          style={{ width: 90, padding: 8 }}
        >
          <option value="0">GST 0%</option>
          <option value="5">GST 5%</option>
          <option value="12">GST 12%</option>
          <option value="18">GST 18%</option>
        </select>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleAddOrUpdate} style={{ padding: "8px 14px" }}>
            {editingIndex >= 0 ? "Update" : "Add Item"}
          </button>
          {editingIndex >= 0 && (
            <button onClick={cancelEdit} style={{ padding: "8px 10px" }}>
              Cancel
            </button>
          )}
          <button onClick={importSample} style={{ padding: "8px 10px" }}>
            Sample
          </button>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Catalogue Items ({items.length})</h3>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }} border="1">
          <thead style={{ background: "#f4f4f4" }}>
            <tr>
              <th style={{ padding: 8 }}>Name</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Size</th>
              <th>Company Rate</th>
              <th>Shop Rate</th>
              <th>GST %</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8 }}>{it.name}</td>
                <td>{it.category}</td>
                <td>{it.subcategory}</td>
                <td>{it.size}</td>
                <td style={{ textAlign: "right", paddingRight: 8 }}>
                  {it.companyRate ? `₹ ${it.companyRate}` : "-"}
                </td>
                <td style={{ textAlign: "right", paddingRight: 8 }}>₹ {it.shopRate}</td>
                <td style={{ textAlign: "center" }}>{it.gst}</td>
                <td style={{ textAlign: "center" }}>
                  <button onClick={() => startEdit(idx)} style={{ marginRight: 6 }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDelete(idx)}>🗑️</button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: "center", padding: 20 }}>
                  No items yet — add items above or click Sample.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Small CSV helpers shared by the export route and the import button.
// Good enough for Excel-generated files: quoted fields, embedded commas,
// embedded newlines, and escaped ("") quotes.

export function csvField(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n\r]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function buildItemsCsv(
  items: { category: string; name: string; quantity: string; notes: string }[]
): string {
  const header = ["category", "item", "quantity", "notes"].join(",");
  const rows = items.map((i) =>
    [i.category, i.name, i.quantity, i.notes].map(csvField).join(",")
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += char;
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += char;
    i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Turns parsed CSV rows (header + data) into item objects, matching
// columns by header name rather than assuming a fixed order, so a
// slightly reordered or Excel-resaved file still imports correctly.
export function csvRowsToItems(
  rows: string[][]
): { category: string; name: string; quantity: string; notes: string }[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) =>
    header.findIndex((h) => names.includes(h));

  const categoryIdx = idx(["category"]);
  const nameIdx = idx(["item", "name", "item name"]);
  const qtyIdx = idx(["quantity", "qty"]);
  const notesIdx = idx(["notes", "note"]);

  if (nameIdx === -1) return [];

  return rows
    .slice(1)
    .map((r) => ({
      category: categoryIdx >= 0 ? (r[categoryIdx] ?? "").trim() : "General",
      name: (r[nameIdx] ?? "").trim(),
      quantity: qtyIdx >= 0 ? (r[qtyIdx] ?? "").trim() : "",
      notes: notesIdx >= 0 ? (r[notesIdx] ?? "").trim() : "",
    }))
    .filter((i) => i.name.length > 0);
}

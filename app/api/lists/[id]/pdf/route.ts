import { NextRequest, NextResponse } from "next/server";
import path from "path";
import PDFDocument from "pdfkit";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type LoadList, type LoadListItem } from "@/lib/types";

export const runtime = "nodejs";

const RED = "#c72127";
const INK = "#111111";
const MUTED = "#6b6b6b";
const BORDER = "#d8d8d8";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // RLS (can_access_load_list) makes this come back empty if the current
  // user isn't allowed to see the list, exactly like the list detail page.
  const { data: list } = await supabase
    .from("load_lists")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!list) {
    return NextResponse.json(
      { error: "Load list not found, or you don't have access to it." },
      { status: 404 }
    );
  }

  const { data: itemRows } = await supabase
    .from("load_list_items")
    .select("*")
    .eq("load_list_id", params.id)
    .order("category", { ascending: true })
    .order("created_at", { ascending: true });

  const items = (itemRows as LoadListItem[] | null) ?? [];
  const pdfBuffer = await renderLoadListPdf(list as LoadList, items);

  const safeName = (list as LoadList).program
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "load-list";

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-load-list.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

function renderLoadListPdf(
  list: LoadList,
  items: LoadListItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "LETTER", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const logoPath = path.join(process.cwd(), "public", "fel-icon.png");
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Header -----------------------------------------------------
    try {
      doc.image(logoPath, doc.page.margins.left, 44, { width: 28 });
    } catch {
      // Logo is a nice-to-have; a missing file shouldn't break the export.
    }
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("FEL MOTORSPORTS", doc.page.margins.left + 38, 48, {
        characterSpacing: 1,
      });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(9)
      .text("WAREHOUSE LOAD LIST", doc.page.margins.left + 38, 61, {
        characterSpacing: 1,
      });

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .text(`Exported ${new Date().toLocaleString("en-CA")}`, {
        align: "right",
      });

    doc
      .moveTo(doc.page.margins.left, 92)
      .lineTo(doc.page.width - doc.page.margins.right, 92)
      .strokeColor(RED)
      .lineWidth(2)
      .stroke();

    doc.y = 108;

    // --- Program title + status pill ---------------------------------
    doc
      .fillColor(INK)
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(list.program || "Untitled load list", doc.page.margins.left, doc.y, {
        continued: false,
      });

    const statusLabel = STATUS_LABEL[list.status]?.toUpperCase() ?? list.status.toUpperCase();
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(RED)
      .text(statusLabel, doc.page.margins.left, doc.y + 2, { characterSpacing: 1 });

    doc.moveDown(0.8);

    // --- Summary grid --------------------------------------------------
    const fields: [string, string][] = [
      ["Program lead / contact", list.contact_name || "—"],
      ["Destination", list.location || "—"],
      ["Mode of transportation", list.mode || "—"],
      ["Departure date", list.depart_date || "TBD"],
      ["Return date", list.return_date || "TBD"],
    ];

    const colWidth = pageWidth / 3;
    let gridStartY = doc.y + 4;
    fields.forEach(([label, value], i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = doc.page.margins.left + col * colWidth;
      const y = gridStartY + row * 38;
      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(label.toUpperCase(), x, y, { characterSpacing: 0.5, width: colWidth - 10 });
      doc
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .fillColor(INK)
        .text(value, x, y + 11, { width: colWidth - 10 });
    });

    const rows = Math.ceil(fields.length / 3);
    doc.y = gridStartY + rows * 38 + 6;

    const packedCount = items.filter((i) => i.packed).length;
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(`${packedCount} of ${items.length} items packed`, doc.page.margins.left, doc.y);

    doc.moveDown(0.8);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor(BORDER)
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.6);

    // --- Items grouped by category --------------------------------------
    const categories = Array.from(new Set(items.map((i) => i.category)));
    const colPacked = doc.page.margins.left;
    const colItem = colPacked + 22;
    const colQty = doc.page.margins.left + pageWidth - 150;
    const colNotes = doc.page.margins.left + pageWidth - 110;
    const notesWidth = pageWidth - (colNotes - doc.page.margins.left);

    if (categories.length === 0) {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text("No items were added to this load list.");
    }

    for (const category of categories) {
      ensureSpace(doc, 40);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(RED)
        .text(category.toUpperCase(), doc.page.margins.left, doc.y, { characterSpacing: 0.5 });
      doc.moveDown(0.3);

      // Column headers
      const headerY = doc.y;
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(MUTED)
        .text("", colPacked, headerY, { width: 18 })
        .text("ITEM", colItem, headerY)
        .text("QTY", colQty, headerY, { width: 40 })
        .text("NOTES", colNotes, headerY, { width: notesWidth });
      doc.moveDown(0.4);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor(BORDER)
        .lineWidth(0.5)
        .stroke();
      doc.moveDown(0.3);

      for (const item of items.filter((i) => i.category === category)) {
        const rowHeight = Math.max(
          16,
          doc.heightOfString(item.name || "", { width: colQty - colItem - 10 }),
          doc.heightOfString(item.notes || "", { width: notesWidth })
        );
        ensureSpace(doc, rowHeight + 6);

        const rowY = doc.y;
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(INK)
          .text(item.packed ? "✓" : "☐", colPacked, rowY, { width: 18 })
          .text(item.name || "", colItem, rowY, { width: colQty - colItem - 10 })
          .fillColor(MUTED)
          .text(item.quantity || "", colQty, rowY, { width: 40 })
          .text(item.notes || "", colNotes, rowY, { width: notesWidth });

        doc.y = rowY + rowHeight + 6;
      }
      doc.moveDown(0.6);
    }

    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}

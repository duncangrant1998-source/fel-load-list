// Minimal Resend REST client (no SDK dependency — a single fetch call).
// RESEND_API_KEY / RESEND_FROM are server-only env vars, set on Railway.

type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.error("RESEND_API_KEY or RESEND_FROM is not set; skipping email send.");
    return { ok: false, error: "Email sending isn't configured." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Resend send failed", res.status, body);
    return { ok: false, error: `Resend returned ${res.status}` };
  }
  return { ok: true };
}

function appBaseUrl() {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return process.env.NEXT_PUBLIC_APP_URL ?? "";
}

export function buildAddedToListEmail(params: {
  recipientName: string;
  addedByName: string;
  program: string;
  contactName: string;
  location: string;
  mode: string;
  departDate: string | null;
  returnDate: string | null;
  listId: string;
}) {
  const { recipientName, addedByName, program, contactName, location, mode, departDate, returnDate, listId } = params;
  const link = `${appBaseUrl()}/lists/${listId}`;

  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #1f3b42;font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#7f9199;width:38%;vertical-align:top;">${label}</td>
      <td style="padding:8px 0;border-bottom:1px solid #1f3b42;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#eef3f3;font-weight:bold;vertical-align:top;">${escapeHtml(value || "—")}</td>
    </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px 12px;background-color:#041216;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">
      <tr>
        <td style="background-color:#06191d;border-top:3px solid #c72127;border-radius:10px 10px 0 0;padding:20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.08em;color:#eef3f3;">FEL MOTORSPORTS</td>
            </tr>
            <tr>
              <td style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:.08em;color:#c72127;padding-top:2px;">LOAD LIST</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background-color:#0c2126;padding:28px 24px 8px 24px;">
          <p style="margin:0 0 4px 0;font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:bold;color:#eef3f3;">You've been added to a load list</p>
          <p style="margin:0 0 20px 0;font-family:Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#9fb1b6;">
            Hi ${escapeHtml(recipientName)}, ${escapeHtml(addedByName)} gave you access to the load list below.
            Open it in the app to see what's on it, add items, or ask a question.
          </p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
            <tr>
              <td colspan="2" style="padding:0 0 10px 0;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:bold;color:#ffffff;">${escapeHtml(program || "Untitled load list")}</td>
            </tr>
            ${row("Program lead / contact", contactName)}
            ${row("Destination", location)}
            ${row("Mode of transportation", mode)}
            ${row("Departure date", departDate ?? "TBD")}
            ${row("Return date", returnDate ?? "TBD")}
          </table>
        </td>
      </tr>
      <tr>
        <td style="background-color:#0c2126;padding:12px 24px 32px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="border-radius:8px;background-color:#c72127;">
                <a href="${link}" style="display:inline-block;padding:12px 22px;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:.04em;color:#ffffff;text-decoration:none;">OPEN LOAD LIST →</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background-color:#06191d;border-radius:0 0 10px 10px;padding:16px 24px;border-top:1px solid #1f3b42;">
          <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:#5f7379;">
            You're receiving this because you were given access to this load list in the FEL Load List app.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `You've been added to a load list

${addedByName} gave you access to "${program || "Untitled load list"}" in the FEL Load List app.

Program lead / contact: ${contactName || "—"}
Destination: ${location || "—"}
Mode of transportation: ${mode || "—"}
Departure date: ${departDate ?? "TBD"}
Return date: ${returnDate ?? "TBD"}

Open it here: ${link}`;

  return { html, text };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

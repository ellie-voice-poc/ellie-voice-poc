export default function handler(req, res) {
  // Accept both GET and POST
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).end();
    return;
  }
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi, this is Ellie. Your phone webhook is live.</Say>
  <Hangup/>
</Response>`;
  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

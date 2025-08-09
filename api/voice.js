export default function handler(req, res) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi, this is Ellie. Your phone webhook is live.</Say>
  <Hangup/>
</Response>`;
  res.setHeader("Content-Type", "text/xml");
  res.status(200).send(twiml);
}

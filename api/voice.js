export default function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const base = `${proto}://${host}`;
  const startMs = Date.now();
  const actionUrl = `${base}/api/reply?start=${startMs}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hi there, it’s Ellie. I’m right here with you. How are you feeling today</Say>
  <Gather input="speech" action="${actionUrl}" method="POST" speechTimeout="auto" language="en-US">
    <Say voice="alice">Go ahead and tell me anything on your mind. I’m listening.</Say>
  </Gather>
  <Say voice="alice">I didn’t quite catch that. Let’s try again soon.</Say>
  <Hangup/>
</Response>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

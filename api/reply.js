export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const body = new URLSearchParams(raw);

  const heard = (body.get("SpeechResult") || "").trim();
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const nextAction = `${proto}://${host}/api/reply`;

  const say = heard
    ? `I heard you say: ${heard}`
    : "I didn't catch anything. Try one clear sentence after the beep.";

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${say}</Say>
  <Gather input="speech" language="en-US" action="${nextAction}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Say voice="alice">Beep. I'm listening.</Say>
  </Gather>
  <Say voice="alice">Still nothing. We'll try again later.</Say>
  <Hangup/>
</Response>`;

  console.log("DEBUG SpeechResult:", heard);
  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

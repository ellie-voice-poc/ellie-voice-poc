// Turn-by-turn loop: Mom speaks → Ellie replies → repeat until time limit
export default async function handler(req, res) {
  // 1) Parse Twilio's form POST safely
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const body = new URLSearchParams(raw);

  // 2) Pull what Twilio heard
  const userText = (body.get("SpeechResult") || "").trim();
  const start = new URL(req.url, `https://${req.headers.host}`).searchParams.get("start");
  const callStart = Number(start || Date.now());
  const maxMinutes = Number(process.env.CALL_MAX_MINUTES || 10);
  const msLeft = maxMinutes * 60000 - (Date.now() - callStart);

  const goodbye =
    "Uh-uh, sounds like someone's at my door. I think I need to end this call, my friend, but I'll talk with you soon. This chat has been lovely. I sure appreciate you!";

  // 3) Time up? Say goodbye and hang up
  if (msLeft <= 0) {
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${goodbye}</Say><Hangup/></Response>`);
    return;
  }

  // 4) If Twilio heard nothing, prompt again quickly
  if (!userText) {
    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers.host;
    const nextAction = `${proto}://${host}/api/reply?start=${callStart}`;
    const twimlNoInput = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I’m listening.</Say>
  <Gather input="speech" language="en-US" action="${nextAction}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Say voice="alice">Tell me what’s on your mind.</Say>
  </Gather>
  <Redirect method="POST">${nextAction}</Redirect>
</Response>`;
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(twimlNoInput);
    return;
  }

  // 5) Ask OpenAI for Ellie’s short, warm reply
  let ellie = "I’m here, sugar. Tell me a little more about that.";
  try {
    const prompt = `Caller said: "${userText}". Reply as Ellie, an elderly woman with a gentle Southern drawl. Be warm, 1–3 sentences, simple words, and you may ask a short follow-up.`;
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are Ellie, a kind, elderly woman with a gentle Southern drawl. Speak slowly, warmly, and simply. Avoid medical or legal advice." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      })
    });
    const data = await r.json();
    ellie = (data?.choices?.[0]?.message?.content || "").trim() || ellie;
  } catch {}

  // 6) If under 20s remain, land the plane
  const almostOut = msLeft < 20000;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const nextAction = `${proto}://${host}/api/reply?start=${callStart}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${almostOut ? goodbye : ellie}</Say>
  ${almostOut ? "<Hangup/>" : `
  <Gather input="speech" language="en-US" action="${nextAction}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Say voice="alice">I’m listening.</Say>
  </Gather>
  <Say voice="alice">I didn’t catch that. Let’s try again.</Say>
  <Redirect method="POST">${nextAction}</Redirect>`}
</Response>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

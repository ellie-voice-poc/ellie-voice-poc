export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // Grab Twilio’s POST body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const body = new URLSearchParams(raw);

  // What Mom said
  const userText = (body.get("SpeechResult") || "").trim();

  // Timer and limits
  const url = new URL(req.url, `https://${req.headers.host}`);
  const callStart = Number(url.searchParams.get("start") || Date.now());
  const maxMinutes = Number(process.env.CALL_MAX_MINUTES || 10);
  const msLeft = maxMinutes * 60000 - (Date.now() - callStart);

  const goodbye =
    "Uh-uh, sounds like someone's at my door. I think I need to end this call, my friend, but I'll talk with you soon. This chat has been lovely. I sure appreciate you!";

  // Out of time
  if (msLeft <= 0) {
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="alice">${goodbye}</Say><Hangup/></Response>`);
    return;
  }

  // If no speech heard, prompt again fast
  if (!userText) {
    const next = `${url.origin}/api/reply?start=${callStart}`;
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">I’m listening.</Say>
  <Gather input="speech" language="en-US" action="${next}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Say voice="alice">Tell me what’s on your mind.</Say>
  </Gather>
  <Redirect method="POST">${next}</Redirect>
</Response>`;
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(twiml);
    return;
  }

  // Ask OpenAI for Ellie’s short, warm reply
  let ellie = "I’m here, sugar. Tell me a little more about that.";
  try {
    const systemStyle =
      "You are Ellie, a kind, elderly woman with a gentle Southern drawl. You speak slowly and warmly, use simple language, and keep replies to 1–3 sentences with an occasional gentle follow-up. Avoid medical or legal advice.";
    const prompt = `Caller said: "${userText}". Reply as Ellie with warmth and a light Southern drawl. Keep it short and supportive; ask a simple follow-up only if it helps.`;

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemStyle },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 120
      })
    });

    const data = await r.json();
    ellie = (data?.choices?.[0]?.message?.content || "").trim() || ellie;
  } catch (e) {
    // Fallback if OpenAI hiccups
    ellie = "I’m right here. How are you feeling about that, sweetheart";
  }

  // If under 20 seconds left, land the plane
  const almostOut = msLeft < 20000;
  const next = `${url.origin}/api/reply?start=${callStart}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${almostOut ? goodbye : ellie}</Say>
  ${almostOut ? "<Hangup/>" : `
  <Gather input="speech" language="en-US" action="${next}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Say voice="alice">I’m listening.</Say>
  </Gather>
  <Say voice="alice">I didn’t catch that. Let’s try again.</Say>
  <Redirect method="POST">${next}</Redirect>`}
</Response>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

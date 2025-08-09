export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  // read Twilio POST body
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  const body = new URLSearchParams(raw);

  const said = (body.get("SpeechResult") || "").trim();

  // timer
  const url = new URL(req.url, `https://${req.headers.host}`);
  const start = Number(url.searchParams.get("start") || Date.now());
  const maxMin = Number(process.env.CALL_MAX_MINUTES || 10);
  const msLeft = maxMin * 60000 - (Date.now() - start);

  const goodbye = "Uh-uh, sounds like someone's at my door. I think I need to end this call, my friend, but I'll talk with you soon. This chat has been lovely. I sure appreciate you!";

  if (msLeft <= 0) {
    const byeUrl = `${url.origin}/api/tts?t=${encodeURIComponent(goodbye)}`;
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${byeUrl}</Play>
  <Hangup/>
</Response>`);
    return;
  }

  // if nothing heard, prompt again with TTS and keep gathering
  if (!said) {
    const next = `${url.origin}/api/reply?start=${start}`;
    const promptUrl = `${url.origin}/api/tts?t=${encodeURIComponent("I’m listening. Tell me what’s on your mind.")}`;
    res.setHeader("Content-Type", "application/xml");
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${promptUrl}</Play>
  <Gather input="speech" language="en-US" action="${next}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Play>${promptUrl}</Play>
  </Gather>
  <Redirect method="POST">${next}</Redirect>
</Response>`);
    return;
  }

  // ask OpenAI for Ellie’s reply
  let ellie = "";
  try {
    const systemStyle = "You are Ellie, a kind, elderly woman with a gentle Southern drawl. Speak slowly, warmly, and simply. Keep replies 1–3 sentences. Avoid medical or legal advice.";
    const prompt = `Caller said: "${said}". Reply as Ellie with warmth and a light Southern drawl. Keep it short and supportive; ask a simple follow-up only if helpful.`;

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
        temperature: 0.6,
        max_tokens: 120
      })
    });

    if (!r.ok) throw new Error(`OpenAI ${r.status} ${r.statusText}`);
    const data = await r.json();
    ellie = (data?.choices?.[0]?.message?.content || "").trim() || "I’m right here with you, sweetheart.";
  } catch {
    ellie = "I’m right here with you, sweetheart. Could you tell me a little more about that";
  }

  const almostOut = msLeft < 20000;
  const next = `${url.origin}/api/reply?start=${start}`;

  const speakUrl = `${url.origin}/api/tts?t=${encodeURIComponent(almostOut ? goodbye : ellie)}`;
  const promptUrl = `${url.origin}/api/tts?t=${encodeURIComponent("I’m listening.")}`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${speakUrl}</Play>
  ${almostOut ? "<Hangup/>" : `
  <Gather input="speech" language="en-US" action="${next}" method="POST" speechTimeout="5" actionOnEmptyResult="true">
    <Play>${promptUrl}</Play>
  </Gather>
  <Redirect method="POST">${next}</Redirect>`}
</Response>`);
}

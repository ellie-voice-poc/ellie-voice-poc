// api/tts.js
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const text = url.searchParams.get("t") || "Hello there";
    const styled = `In the voice of Ellie, an elderly woman with a gentle Southern drawl, speak this naturally and warmly: ${text}`;

    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: styled,
        format: "mp3"
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("TTS error", r.status, err.slice(0, 200));
      res.status(502).end();
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buf);
  } catch (e) {
    console.error("TTS exception", e);
    res.status(500).end();
  }
}

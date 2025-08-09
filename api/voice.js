// api/tts.js — ElevenLabs TTS, with fallback to OpenAI if needed
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const text = url.searchParams.get("t") || "Hello there";

  // Prefer ElevenLabs if configured
  const elKey = process.env.ELEVENLABS_API_KEY;
  const elVoice = process.env.ELEVENLABS_VOICE_ID;

  if (elKey && elVoice) {
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoice}`, {
        method: "POST",
        headers: {
          "xi-api-key": elKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: `Please speak like an elderly woman with a gentle Southern drawl. ${text}`,
          model_id: "eleven_monolingual_v1",
          voice_settings: { stability: 0.6, similarity_boost: 0.7, style: 0.4, use_speaker_boost: true }
        })
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-store");
        res.status(200).send(buf);
        return;
      }
    } catch {}
  }

  // Fallback to OpenAI TTS
  try {
    const r = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy",
        input: `In the voice of an elderly woman with a light Southern drawl, read this naturally: ${text}`,
        format: "mp3"
      })
    });
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(buf);
  } catch {
    res.status(502).end();
  }
}

export default async function handler(req, res) {
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello in 3 words." }
        ],
        max_tokens: 20
      })
    });
    const txt = await r.text();
    res.status(200).json({ ok: r.ok, status: r.status, body: txt.slice(0, 300) });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
}

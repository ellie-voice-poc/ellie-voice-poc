export default function handler(req, res) {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  const base = `${proto}://${host}`;
  const startMs = Date.now();
  const actionUrl = `${base}/api/reply?start=${startMs}`;

  const hello = `${base}/api/tts?t=${encodeURIComponent("Hi there, it’s Ellie. I’m right here with you. How are you feeling today")}`;
  const prompt = `${base}/api/tts?t=${encodeURIComponent("Go ahead and tell me anything on your mind. I’m listening.")}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Play>${hello}</Play>
  <Gather input="speech"
          language="en-US"
          action="${actionUrl}"
          method="POST"
          speechTimeout="5"
          actionOnEmptyResult="true">
    <Play>${prompt}</Play>
  </Gather>
  <Play>${base}/api/tts?t=${encodeURIComponent("I didn’t quite catch that. Let’s try again soon.")}</Play>
  <Hangup/>
</Response>`;

  res.setHeader("Content-Type", "application/xml");
  res.status(200).send(twiml);
}

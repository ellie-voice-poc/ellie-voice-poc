export default function handler(req, res) {
  const has = k => Boolean(process.env[k]);
  res.status(200).json({
    OPENAI_API_KEY: has("OPENAI_API_KEY"),
    CALL_MAX_MINUTES: has("CALL_MAX_MINUTES"),
    TWILIO_NUMBER: has("TWILIO_NUMBER")
  });
}

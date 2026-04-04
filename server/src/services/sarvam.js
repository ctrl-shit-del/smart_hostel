const DEFAULT_STT_URL = 'https://api.sarvam.ai/speech-to-text';
const DEFAULT_TTS_URL = 'https://api.sarvam.ai/text-to-speech';

const getSarvamKey = () => (
  process.env.SARVAM_API_KEY ||
  process.env.SARVAM_SUBSCRIPTION_KEY ||
  process.env.sarvam ||
  ''
).trim();

const hasSarvamConfig = () => Boolean(getSarvamKey());

const languageMap = {
  tamil: 'ta-IN',
  'ta-in': 'ta-IN',
  hindi: 'hi-IN',
  'hi-in': 'hi-IN',
  hinglish: 'hi-IN',
  english: 'en-IN',
  'en-in': 'en-IN',
};

const normalizeLanguageCode = (value) => {
  if (!value) return '';
  return languageMap[`${value}`.trim().toLowerCase()] || `${value}`.trim();
};

const decodeAudioPayload = (audioBase64, mimeType = 'audio/webm') => {
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new Error('Audio payload is required');
  }

  const dataUrlMatch = audioBase64.match(/^data:(.+);base64,(.+)$/);
  const resolvedMimeType = dataUrlMatch?.[1] || mimeType || 'audio/webm';
  const rawBase64 = dataUrlMatch?.[2] || audioBase64;
  const buffer = Buffer.from(rawBase64, 'base64');

  let extension = 'webm';
  if (resolvedMimeType.includes('ogg')) extension = 'ogg';
  else if (resolvedMimeType.includes('wav')) extension = 'wav';
  else if (resolvedMimeType.includes('mp3') || resolvedMimeType.includes('mpeg')) extension = 'mp3';
  else if (resolvedMimeType.includes('mp4')) extension = 'mp4';

  return {
    buffer,
    mimeType: resolvedMimeType,
    filename: `late-return-call.${extension}`,
  };
};

const buildSarvamError = (message, code = 'SARVAM_ERROR', statusCode = 502) => {
  const err = new Error(message);
  err.code = code;
  err.statusCode = statusCode;
  return err;
};

const transcribeAudio = async ({ audioBase64, mimeType, languageHint }) => {
  if (!hasSarvamConfig()) {
    throw buildSarvamError(
      'Sarvam AI is not configured yet. Add SARVAM_API_KEY (or sarvam) to enable automatic call transcripts.',
      'SARVAM_CONFIG_MISSING',
      503
    );
  }

  const { buffer, mimeType: resolvedMimeType, filename } = decodeAudioPayload(audioBase64, mimeType);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: resolvedMimeType }), filename);
  form.append('model', process.env.SARVAM_STT_MODEL || 'saarika:v2.5');

  const languageCode = normalizeLanguageCode(languageHint);
  if (languageCode) {
    form.append('language_code', languageCode);
  }

  const response = await fetch(process.env.SARVAM_STT_URL || DEFAULT_STT_URL, {
    method: 'POST',
    headers: {
      'api-subscription-key': getSarvamKey(),
    },
    body: form,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'Sarvam AI could not transcribe the call recording.';
    throw buildSarvamError(message);
  }

  const transcript =
    payload?.transcript ||
    payload?.text ||
    payload?.result?.transcript ||
    payload?.data?.transcript ||
    '';

  if (!transcript) {
    throw buildSarvamError('Sarvam AI returned an empty transcript for this call.');
  }

  return {
    transcript: `${transcript}`.trim(),
    raw: payload,
  };
};

const synthesizeSpeech = async ({ text, languageCode = 'en-IN', speaker }) => {
  if (!hasSarvamConfig()) {
    throw buildSarvamError(
      'Sarvam AI is not configured yet. Add SARVAM_API_KEY (or sarvam) to enable spoken warden notes.',
      'SARVAM_CONFIG_MISSING',
      503
    );
  }

  const response = await fetch(process.env.SARVAM_TTS_URL || DEFAULT_TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': getSarvamKey(),
    },
    body: JSON.stringify({
      text,
      target_language_code: normalizeLanguageCode(languageCode) || 'en-IN',
      model: process.env.SARVAM_TTS_MODEL || 'bulbul:v3',
      speaker: speaker || process.env.SARVAM_TTS_SPEAKER || 'anushka',
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.message ||
      'Sarvam AI could not generate audio for the warden note.';
    throw buildSarvamError(message);
  }

  const audioBase64 = payload?.audios?.[0];
  if (!audioBase64) {
    throw buildSarvamError('Sarvam AI returned no audio for this request.');
  }

  return {
    audioBase64,
    mimeType: 'audio/wav',
    raw: payload,
  };
};

module.exports = {
  hasSarvamConfig,
  normalizeLanguageCode,
  transcribeAudio,
  synthesizeSpeech,
};

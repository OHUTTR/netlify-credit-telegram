const fetch = require('node-fetch');
const AWS = require('aws-sdk');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';
const s3 = new AWS.S3({ region: REGION });

exports.handler = async function (event) {
  try {
    const headerToken = (event.headers && (event.headers['x-telegram-bot-api-secret-token'] || event.headers['X-Telegram-Bot-Api-Secret-Token'] || ''));
    if (TELEGRAM_WEBHOOK_SECRET && headerToken !== TELEGRAM_WEBHOOK_SECRET) {
      console.warn('Invalid webhook secret');
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: 'invalid_secret' }) };
    }

    const body = JSON.parse(event.body || '{}');

    if (!body.message || !body.message.photo) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, info: 'no photo' }) };
    }

    const photos = body.message.photo;
    const fileId = photos[photos.length - 1].file_id;

    const getFileUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`;
    const gf = await fetch(getFileUrl);
    const gfJson = await gf.json();

    if (!gfJson.ok) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'getFile_failed' }) };
    }

    const filePath = gfJson.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
    const fileRes = await fetch(fileUrl);
    const buffer = await fileRes.buffer();

    if (buffer.length > 5_000_000) {
      return { statusCode: 200, body: JSON.stringify({ ok: false, error: 'file_too_large' }) };
    }

    const ext = (filePath.split('.').pop() || 'jpg').split('?')[0];
    const key = `logos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    await s3.putObject({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: fileRes.headers.get('content-type') || 'image/jpeg',
      ACL: 'public-read'
    }).promise();

    return { statusCode: 200, body: JSON.stringify({ ok: true, key }) };
  } catch (err) {
    console.error('telegram-webhook error', err);
    return { statusCode: 500, body: JSON.stringify({ ok: false }) };
  }
};

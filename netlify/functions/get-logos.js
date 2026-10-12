const AWS = require('aws-sdk');

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';
const s3 = new AWS.S3({ region: REGION });

exports.handler = async function () {
  if (!BUCKET) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }

  try {
    const data = await s3.listObjectsV2({ Bucket: BUCKET, Prefix: '' }).promise();
    const items = (data.Contents || []).map((o) => {
      return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(o.Key)}`;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};

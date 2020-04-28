const AWS = require('aws-sdk');
const {simpleParser} = require('mailparser');
const {Readable} = require('stream');
const {createUnzip, createGzip} = require('zlib');
const unzipper = require('unzipper');
const path = require('path');

const s3 = new AWS.S3({signatureVersion: 'v4'});

const s3bucketName = process.env.OUTPUT_S3_PATH_PREFIX;
const s3reportsPrefix = process.env.OUTPUT_S3_BUCKET_NAME;

exports.handler = async function (event, context, callback) {
    verifyEvent(event);

    const s3event = event.Records[0].s3;
    const key = decodeURIComponent(s3event.object.key.replace(/\+/g, " "));
    const message = await fetchMessage(s3event.bucket.name, key);
    const report = await getXmlReport(message);
    const s3Object = await saveReport(report);

    console.debug(s3Object);
    console.log("OK");
};

function verifyEvent(event) {
    // Validate characteristics of a SES event record.
    if (!event ||
        !event.hasOwnProperty('Records') ||
        event.Records.length !== 1 ||
        !event.Records[0].hasOwnProperty('eventSource') ||
        event.Records[0].eventSource !== 'aws:s3' ||
        !event.Records[0].eventVersion.startsWith('2.')) {
        console.log({
            message: "parseEvent() received invalid S3 event message:",
            level: "error", event: JSON.stringify(event)
        });
        throw new Error('Error: Received invalid S3 event message.');
    }
}

async function fetchMessage(bucket, key) {
    console.log([bucket, key]);
    const result = await s3.getObject({
        Bucket: bucket,
        Key: key
    }).promise();

    return result.Body;
}

async function getXmlReport(message) {
    const mail = await simpleParser(message);
    const attachments = mail.attachments;
    if (attachments.length !== 1) {
        throw new Error('Error: DMARC reports must have right 1 attachment');
    }

    const attachment = attachments[0];
    let stream = bufferToStream(attachment.content);

    let contentType = attachment.contentType;
    let filename = attachment.filename;

    if (['application/gzip', 'application/x-gzip'].includes(contentType)) {
        stream = stream.pipe(createUnzip());
        contentType = 'text/xml';
        if (filename.endsWith('.gz') || filename.endsWith('.gzip')) {
            filename = path.parse(filename).name; //strip extension
        }
    }

    if (['application/zip', 'application/x-zip-compressed'].includes(contentType)) {
        stream = stream.pipe(unzipper.ParseOne());
        contentType = 'text/xml';
        if (filename.endsWith('.zip')) {
            filename = path.parse(filename).name; //strip extension
        } else {
            filename = filename + '.xml';
        }
    }

    return {contentType: contentType, filename: filename, content: stream};
}

async function saveReport(report) {
    let stream = report.content.pipe(createGzip());
    const key = s3reportsPrefix + report.filename;

    return await s3.upload({
        Bucket: s3bucketName,
        Key: key,
        Body: stream,
        ContentType: report.contentType,
        ContentEncoding: 'gzip',
    }).promise();
}

function bufferToStream(buffer) {
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    return stream;
}
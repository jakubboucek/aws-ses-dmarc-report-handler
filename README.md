# DMARC report handler
> Node.js 12.x AWS Lambda microservice environment

Parser for DMARC report email massages. It export XML file from (g)zipper attachment from e-mail.

## Requirements
- Runtime: Node.js 12.x and newer
- Environment: AWS Lambda
- Trigger: AWS S3 event `ObjectCreated` (object on S3 must contains DMARC report email received through AWS SES)
- Environment variables: `OUTPUT_S3_PATH_PREFIX` and `OUTPUT_S3_BUCKET_NAME`
- Output: Gzipped XML reports uploaded to S3 (by Environment variables, using `Content-Encoding` to stream-unzip with any HTTP client)

Project shloud respects [RFC 7489](https://tools.ietf.org/html/rfc7489).

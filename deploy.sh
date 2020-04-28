#!/bin/bash

set -u
set -e

realpath() {
    [[ $1 = /* ]] && echo "$1" || echo "$PWD/${1#./}"
}

WORK_DIR=$(realpath $(dirname "$0"))
cd $WORK_DIR

PROJECT_DIR="ses-handler-dmarc-report-from-email"

(cd ses-handler-dmarc-report-from-email && npm install --production --loglevel=error && npm prune --production --loglevel=error)

ZIP_FILE="$WORK_DIR/ses-handler-dmarc-report-from-email.zip"
[ -e $ZIP_FILE ] && rm $ZIP_FILE

echo "Zipping function to $ZIP_FILE..."
(cd $PROJECT_DIR && zip -r9 -q $ZIP_FILE .)
ls -lh $ZIP_FILE

echo "Uploading to AWS Lambda..."
export AWS_PAGER=""
aws lambda --profile redbit update-function-code --function-name ses-handler-dmarc-report-from-email --zip-file fileb://$ZIP_FILE

rm $ZIP_FILE

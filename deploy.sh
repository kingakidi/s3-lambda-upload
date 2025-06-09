#!/bin/bash

FUNCTION_NAME="pdf-upload-lambda"
BUCKET_NAME="your-pdf-upload-bucket-12345"
REGION="us-east-1"

# Get account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/lambda-s3-upload-role"

zip -r function.zip index.js node_modules/ package.json

if aws lambda get-function --function-name $FUNCTION_NAME 2>/dev/null; then
    echo "Updating existing function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip
    
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --environment Variables="{S3_BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$REGION}"
else
    echo "Creating new function..."
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime nodejs18.x \
        --role $ROLE_ARN \
        --handler index.handler \
        --zip-file fileb://function.zip \
        --timeout 30 \
        --memory-size 128 \
        --environment Variables="{S3_BUCKET_NAME=$BUCKET_NAME,AWS_REGION=$REGION}"
fi

# Clean up
rm function.zip

echo "Deployment complete!"

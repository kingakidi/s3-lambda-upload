const AWS = require('aws-sdk');

const s3 = new AWS.S3({
    region: process.env.AWS_REGION || 'us-east-1'
});

exports.handler = async (event) => {
    try {
        const BUCKET_NAME = process.env.S3_BUCKET_NAME;
        
        if (!BUCKET_NAME) {
            throw new Error('S3_BUCKET_NAME environment variable is required');
        }

        let fileData, fileName, contentType;
        
        if (event.isBase64Encoded) {
            fileData = Buffer.from(event.body, 'base64');
            fileName = event.headers['x-file-name'] || `upload-${Date.now()}.pdf`;
            contentType = event.headers['content-type'] || 'application/pdf';
        } else if (event.Records && event.Records[0] && event.Records[0].s3) {
            const record = event.Records[0].s3;
            const sourceBucket = record.bucket.name;
            const sourceKey = decodeURIComponent(record.object.key);
            
            const getObjectParams = {
                Bucket: sourceBucket,
                Key: sourceKey
            };
            
            const sourceFile = await s3.getObject(getObjectParams).promise();
            fileData = sourceFile.Body;
            fileName = sourceKey;
            contentType = sourceFile.ContentType || 'application/pdf';
        } else {
            if (!event.fileData) {
                throw new Error('File data is required');
            }
            
            fileData = Buffer.from(event.fileData, 'base64');
            fileName = event.fileName || `upload-${Date.now()}.pdf`;
            contentType = event.contentType || 'application/pdf';
        }

        if (!contentType.includes('pdf') && !fileName.toLowerCase().endsWith('.pdf')) {
            throw new Error('Only PDF files are allowed');
        }

        // Generate unique key for S3
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const s3Key = `pdfs/${timestamp}-${fileName}`;

        // Upload parameters
        const uploadParams = {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileData,
            ContentType: contentType,
            ServerSideEncryption: 'AES256',
            Metadata: {
                'uploaded-at': new Date().toISOString(),
                'original-name': fileName
            }
        };

        // Upload to S3
        const uploadResult = await s3.upload(uploadParams).promise();

        // Generate pre-signed URL for download
        const downloadUrl = s3.getSignedUrl('getObject', {
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Expires: 3600
        });

        // Success response
        const response = {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-file-name',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                success: true,
                message: 'File uploaded successfully',
                data: {
                    bucket: BUCKET_NAME,
                    key: s3Key,
                    location: uploadResult.Location,
                    etag: uploadResult.ETag,
                    downloadUrl: downloadUrl,
                    fileName: fileName,
                    fileSize: fileData.length,
                    uploadedAt: new Date().toISOString()
                }
            })
        };

        return response;

    } catch (error) {
        console.error('Upload error:', error);

        const errorResponse = {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,x-file-name',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            body: JSON.stringify({
                success: false,
                message: 'File upload failed',
                error: error.message
            })
        };

        return errorResponse;
    }
};
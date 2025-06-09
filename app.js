require("dotenv").config();
const express = require("express");
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json({ limit: "10mb" }));

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
});

app.post("/upload", async (req, res) => {
  try {
    const { fileName, fileType, fileContent } = req.body;

    if (!fileName || !fileType || !fileContent) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const buffer = Buffer.from(fileContent, "base64");

    const params = {
      Bucket: process.env.S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentEncoding: "base64",
      ContentType: fileType,
    };

    await s3.putObject(params).promise();

    res.status(200).json({ message: "File uploaded successfully." });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed.", error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));

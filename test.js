const { handler } = require("./index");
const fs = require("fs");

(async () => {
  const fileBuffer = fs.readFileSync("sample.pdf");
  const base64 = fileBuffer.toString("base64");

  const event = {
    body: JSON.stringify({
      fileName: "sample.pdf",
      fileType: "application/pdf",
      fileContent: base64,
    }),
  };

  const result = await handler(event);
  console.log(result);
})();

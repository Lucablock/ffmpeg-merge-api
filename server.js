const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

// สร้างโฟลเดอร์สำหรับ temp ถ้ายังไม่มี
const ensureFolderExists = (folderPath) => {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
};

app.post('/merge', upload.any(), async (req, res) => {
  try {
    ensureFolderExists('inputs');
    ensureFolderExists('outputs');

    const timestamp = Date.now();
    const inputFiles = [];

    // 🔁 1. เขียนไฟล์ทั้งหมดลง disk
    for (let i = 0; i < req.files.length; i++) {
      const field = req.files[i];
      const filePath = `inputs/input-${i}-${timestamp}.wav`;
      fs.writeFileSync(filePath, field.buffer);
      inputFiles.push(filePath);
    }

    // 🔧 2. เตรียม input.txt สำหรับ FFmpeg
    const concatFilePath = `inputs/list-${timestamp}.txt`;
    const concatList = inputFiles.map(f => `file '${path.resolve(f)}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatList);

    // 📦 3. ตั้งค่า path output
    const outputPath = `outputs/merged-${timestamp}.wav`;

    // ▶️ 4. ใช้ FFmpeg รวม
    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .on('start', (cmd) => console.log('🚀 FFmpeg:', cmd))
      .on('end', () => {
        console.log('✅ Merge done');
        res.download(outputPath, () => {
          [...inputFiles, concatFilePath, outputPath].forEach(f => fs.unlinkSync(f));
        });
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg Error:', err.message);
        res.status(500).send('Merge error: ' + err.message);
      })
      .save(outputPath);

  } catch (err) {
    console.error('❌ Server Error:', err.message);
    res.status(500).send('Unexpected error: ' + err.message);
  }
});

app.get('/', (req, res) => {
  res.send('✅ FFmpeg Merge API is ready');
});

app.listen(port, () => {
  console.log(`🚀 Listening on port ${port}`);
});

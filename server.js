const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const upload = multer({ storage: multer.memoryStorage() });

app.post('/merge', upload.fields([{ name: 'audio' }, { name: 'video' }]), (req, res) => {
const audioPath = req.files['audio'][0].path;
const videoPath = req.files['video'][0].path;
const outputPath = `outputs/merged-${Date.now()}.mp4`;

if (!fs.existsSync('outputs')) fs.mkdirSync('outputs');

ffmpeg()
.input(videoPath)
.input(audioPath)
.outputOptions('-map 0:v:0', '-map 1:a:0', '-c:v copy', '-shortest')
.on('end', () => {
res.download(outputPath, () => {
fs.unlinkSync(audioPath);
fs.unlinkSync(videoPath);
fs.unlinkSync(outputPath);
});
})
.on('error', (err) => {
res.status(500).send('Merge failed: ' + err.message);
})
.save(outputPath);
});

app.get('/', (req, res) => {
res.send('FFmpeg Merge API is running.');
});

app.listen(port, () => {
console.log(`Server listening on port ${port}`);
});

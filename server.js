const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
cconst upload = multer({ storage: multer.memoryStorage() });

app.post('/merge', upload.fields([{ name: 'audio' }, { name: 'video' }]), (req, res) => {
const audioBuffer = req.files['audio'][0].buffer;
const videoBuffer = req.files['video'][0].buffer;

const audioPath = `inputs/audio-${Date.now()}.mp3`;
const videoPath = `inputs/video-${Date.now()}.mp4`;

fs.writeFileSync(audioPath, audioBuffer);
fs.writeFileSync(videoPath, videoBuffer);

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

app.post('/merge', upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).send('❌ ต้องอัปโหลดไฟล์เสียงอย่างน้อย 2 ไฟล์');
    }

    ensureFolderExists('inputs');
    ensureFolderExists('outputs');

    const timestamp = Date.now();
    const inputPaths = [];

    // บันทึกไฟล์ลงดิสก์
    req.files.forEach((file, index) => {
      const filePath = `inputs/input_${timestamp}_${index}.wav`;
      fs.writeFileSync(filePath, file.buffer);
      inputPaths.push(filePath);
    });

    // เขียน input.txt สำหรับ FFmpeg
    const listPath = `inputs/list_${timestamp}.txt`;
    const listContent = inputPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    const outputPath = `outputs/combined_${timestamp}.wav`;

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .on('start', cmd => console.log('🚀 FFmpeg:', cmd))
      .on('end', () => {
        console.log('✅ Merge complete');
        res.download(outputPath, () => {
          [...inputPaths, listPath, outputPath].forEach(p => fs.unlinkSync(p));
        });
      })
      .on('error', err => {
        console.error('❌ FFmpeg error:', err.message);
        res.status(500).send('Merge failed');
      })
      .save(outputPath);

  } catch (err) {
    console.error('❌ Server error:', err.message);
    res.status(500).send('Unexpected error');
  }
});

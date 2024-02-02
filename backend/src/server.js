const express = require('express');
const fs = require('fs').promises; // Use fs promises for async/await
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(cors());
// Path to the 'outputs' directory from 'server.js'
app.use('/getCatenaries', express.static(path.join(__dirname, "..", "..", "data", "outputs","content")));

app.get('/getCatenaries/:zoomLevel/:x/:y', async (req, res) => {
    const { zoomLevel, x, y } = req.params;
    // Updated path to 'outputs' directory
    const dataPath = path.join(__dirname, "..", "..", "data", "outputs","content", zoomLevel, x, `${y}-data.json`);

    try {
        const rawData = await fs.readFile(dataPath);
        const jsonData = JSON.parse(rawData);
        res.json(jsonData);
    } catch (error) {
        console.error('Error reading file:', error);
        res.status(500).send('Error reading file');
    }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

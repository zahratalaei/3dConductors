const express = require('express');
const fs = require('graceful-fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

// Static files are served from 'data/content'
// app.use('/getCatenaries', express.static(path.join(__dirname, "data", "contentNew")));
app.use('/getCatenaries', express.static(path.join(__dirname,"..","..","data", "outputs", "content")));

// Endpoint to serve full data (attributes + Cartesian)
app.get('/getCatenaries/:zoomLevel/:x/:y', async (req, res) => {
    const dataPath = getDataPath(req.params);
    try {
        const jsonData = await readJsonData(dataPath);
        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to serve only the attributes of a specific conductor by ID
app.get('/getConductorAttributes/:zoomLevel/:x/:y/:conductorId', async (req, res) => {
    const { zoomLevel, x, y, conductorId } = req.params;
    const dataPath = getDataPath({ zoomLevel, x, y });

    try {
        const jsonData = await readJsonData(dataPath);
        // Find the specific conductor by ID
        const conductor = jsonData.find(item => String(item.ConductorId) === conductorId);

        if (!conductor) {
            res.status(404).send('Conductor not found');
            return;
        }

        // Exclude Cartesian data for this conductor
        const { cartesian, ...attributes } = conductor;
        res.json(attributes);
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to serve only the Cartesian data with ConductorId
app.get('/getConductorCartesian/:zoomLevel/:x/:y', async (req, res) => {
    const dataPath = getDataPath(req.params);
    try {
        const jsonData = await readJsonData(dataPath);
        const cartesianDataWithId = jsonData.map(item => {
            return {
                conductorId: item.ConductorId,  // Include the ConductorId
                cartesian: item.cartesian,
                color: item.color
            };
        });
        res.json(cartesianDataWithId);
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Function to construct the data path
function getDataPath({ zoomLevel, x, y }) {
    // return path.join(__dirname, "data", "content", zoomLevel, x, `${y}.json`);
    return path.join(__dirname,"..","..","data", "outputs", "content", zoomLevel, x, `${y}-data.json`);
}

// Function to read and parse JSON data from a file
async function readJsonData(dataPath) {
    const rawData = await fs.readFile(dataPath);
    return JSON.parse(rawData);
}

// Function to handle file read errors
function handleFileReadError(error, res) {
    console.error('Error reading file:', error);
    res.status(500).send('Error reading file');
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

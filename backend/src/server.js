const express = require('express');
const fs = require('graceful-fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());

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
                color: item.color,
                BayId: item.Bay_Id // Including BayId for reference
            };
        });
        res.json(cartesianDataWithId);
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to retrieve all information of a specific minimum within a tile
app.get('/getConductors/:zoomLevel/:x/:y', async (req,res)=>{
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'conductors', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);

        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
})


// Function to construct the data path
function getDataPath({ zoomLevel, x, y }) {
    // return path.join(__dirname, "data", "content", zoomLevel, x, `${y}.json`);
    return path.join(__dirname,"..","..","data", "outputs", "conductors", zoomLevel, x, `${y}-data.json`);
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



// Endpoint to serve the first point of each conductor by BayId within a tile
app.get('/getFirstPointByBayId/:zoomLevel/:x/:y/:BayId', async (req, res) => {
    const { zoomLevel, x, y, BayId } = req.params;
    const dataPath = getDataPath({ zoomLevel, x, y });

    try {
        const jsonData = await readJsonData(dataPath);
        // Filter conductors by BayId
        const filteredConductors = jsonData.filter(item => item.Bay_Id === BayId.trim());

        // Extract the first point from each filtered conductor's cartesian data
        const firstPoints = filteredConductors.map(conductor => ({
            ConductorId: conductor.ConductorId,
            FirstPoint: conductor.cartesian[0], // Assuming 'cartesian' array exists and has at least one point
            Color: conductor.color, // Including color if needed
            
        }));

        // Respond with the first points, or indicate that no matching conductors were found
        if (firstPoints.length > 0) {
            res.json(firstPoints);
        } else {
            res.json({ message: 'No conductors found for the specified BayId in this tile.', firstPoints: [] });
        }
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to serve the end point of each conductor by BayId within a tile
app.get('/getEndPointByBayId/:zoomLevel/:x/:y/:BayId', async (req, res) => {
    const { zoomLevel, x, y, BayId } = req.params;
    const dataPath = getDataPath({ zoomLevel, x, y });

    try {
        const jsonData = await readJsonData(dataPath);
        // Filter conductors by BayId
        const filteredConductors = jsonData.filter(item => item.Bay_Id === BayId.trim());

        // Extract the first point from each filtered conductor's cartesian data
        const endPoints = filteredConductors.map(conductor => ({
            ConductorId: conductor.ConductorId,
            EndPoint: conductor.cartesian[1], // Assuming 'cartesian' array exists and has at least one point
            Color: conductor.color, // Including color if needed
            
        }));

        // Respond with the first points, or indicate that no matching conductors were found
        if (endPoints.length > 0) {
            res.json(endPoints);
        } else {
            res.json({ message: 'No conductors found for the specified BayId in this tile.', endPoints: [] });
        }
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to serve only the attributes of a specific pole by ID
app.get('/getPolesByTile/:zoomLevel/:x/:y', async (req, res) => {
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'poles', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);

        // Extracting only coordinates and Pole_Id for each pole
        const polesData = jsonData.map(pole => ({
            coordinates: pole.coordinates,
            Pole_Id: pole.Pole_Id,
            poleHeight: pole.Pole_Height,
            poleColor: pole.color
        }));

        res.json(polesData);
    } catch (error) {
        handleFileReadError(error, res);
    }
});
// Endpoint to retrieve all information of a specific pole by its Pole_Id within a tile
app.get('/getPoleById/:zoomLevel/:x/:y/:Pole_Id', async (req, res) => {
    const { zoomLevel, x, y, Pole_Id } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'poles', zoomLevel, x, `${y}-data.json`);

    try {
        const jsonData = await readJsonData(dataPath);
        
        // Find the pole by Pole_Id
        const pole = jsonData.find(pole => pole.Pole_Id === Pole_Id);
        
        if (!pole) {
            res.status(404).json({ message: 'Pole not found' });
            return;
        }
  // Exclude the coordinate information
  const { coordinates, ...poleInfo } = pole;
        // Respond with the pole's information
        res.json(poleInfo);
    } catch (error) {
        handleFileReadError(error, res);
    }
});

// Endpoint to retrieve all information of the Poles within a tile
app.get('/getPoles/:zoomLevel/:x/:y', async (req,res)=>{
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'poles', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);

        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
})

// Endpoint to retrieve all information of a specific minimum within a tile
app.get('/getMGCByTile/:zoomLevel/:x/:y', async (req,res)=>{
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'mgc', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);

        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
})
// Endpoint to retrieve all information of a Vegetation Intrusion  within a tile
app.get('/getVIByTile/:zoomLevel/:x/:y', async (req,res)=>{
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'VI', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);
        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
})
// Endpoint to retrieve all information of a Structural Intrusion  within a tile
app.get('/getSICBByTile/:zoomLevel/:x/:y', async (req,res)=>{
    const { zoomLevel, x, y } = req.params;
    const dataPath = path.join(__dirname, '..', '..', 'data', 'outputs', 'SICB', zoomLevel, x, `${y}-data.json`);
    try {
        const jsonData = await readJsonData(dataPath);
        res.json(jsonData);
    } catch (error) {
        handleFileReadError(error, res);
    }
})
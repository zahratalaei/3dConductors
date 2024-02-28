import fs from "fs";
import path from "path";
import { Cartesian3 } from "cesium";
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import * as mercator from "../../mercator-transforms-master/src/index.mjs";

// Recreate __dirname functionality
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZOOM_LEVEL = 18; // Set your zoom level
// const UTM_PROJECTION =
//   "+proj=utm +zone=55 +south +ellps=GRS80 +datum=GDA94 +units=m +no_defs";
const tileSystemName = "cesium";

// Function to create the directory if it doesn't exist
async function createDirectory(path) {
    try {
        await mkdir(path, { recursive: true });
    } catch (err) {
        if (err.code !== "EEXIST") {
            // Ignore the error if the directory already exists
            throw err;
        }
    }
}
function toCartesian3(latitude, longitude, elevation) {
    return Cartesian3.fromDegrees(
        parseFloat(longitude),
        parseFloat(latitude),
        parseFloat(elevation)
    );
}
const directoryPath = path.join(
    __dirname,
    "..",
    "..",
    "data",
    "outputs",
    "mgc",
    `${ZOOM_LEVEL}`
);

// Main function to process data and save as JSON in output directory
async function processDataAndSave() {
    try {
        // Initialize an object to keep track of existing tile data
        const existingTileData = {};

        // Directory containing input files
        const inputDirectory = path.join(__dirname, "..", "..", "data", "inputs", "MGC");

        // List all files in the directory
        const inputFiles = fs.readdirSync(inputDirectory);

        for (const inputFile of inputFiles) {
            // Read the data from the current input file
            const dataPath = path.join(inputDirectory, inputFile);
            const rawData = fs.readFileSync(dataPath);
            const jsonData = JSON.parse(rawData);

            // Process the data and group by tiles
            const tilesData = {};

            // Iterate over each object in jsonData
            jsonData.forEach((item) => {
                const color = item.COLOR;
                item.ConductorsData.forEach((conductor) => {
                    const firstPoint = conductor.Coordinates[0];
                    const latlon = [
                        parseFloat(firstPoint["Longitude"]),
                        parseFloat(firstPoint["Latitude"]),
                    ];
                    // Convert lat/lon to tile
                    const tile = mercator.latlon2mercTile(
                        latlon,
                        ZOOM_LEVEL,
                        tileSystemName
                    );

                    const processedInfo = {
                        color: color,
                        Bay_Id: conductor.Bay_Id,
                        Captured_Date: conductor.Captured_Date,
                        Captured_Time: conductor.Captured_Time,
                        ConductorId: conductor.ConductorId,
                        Minimum_Ground_Clearance: conductor.Minimum_Ground_Clearance,
                        Voltage: conductor.Voltage,
                    };
                    const coordinates = conductor.Coordinates;
                    // Use the tile coordinates as a key
                    const tileKey = `${tile[0]}-${tile[1]}`;

                    // Initialize an array for the tile if it doesn't exist
                    if (!tilesData[tileKey]) {
                        tilesData[tileKey] = [];
                    }

                    // Add the combined data to the tile's array
                    tilesData[tileKey].push({
                        coordinates,
                        ...processedInfo,
                    });
                });
            });

            // Update existingTileData with data from the current input file
            for (const [tileKey, data] of Object.entries(tilesData)) {
                if (!existingTileData[tileKey]) {
                    existingTileData[tileKey] = [];
                }
                existingTileData[tileKey].push(...data);
            }
        }

        // Save or append the combined data to output files
    for (const [tileKey, data] of Object.entries(existingTileData)) {
        const [x, y] = tileKey.split("-");
        const filePath = path.join(directoryPath, x, `${y}-data.json`);
  
        // Ensure the tile's directory exists
        await createDirectory(path.join(directoryPath, x));
  
        // Check if the file exists
        if (fs.existsSync(filePath)) {
          // Read existing data
          const existingDataRaw = fs.readFileSync(filePath);
          let existingData = [];
          try {
            existingData = JSON.parse(existingDataRaw);
          } catch (error) {
            console.error("Error parsing existing data:", error);
          }
  
          // Append new data to existing data
          const combinedData = existingData.concat(data);
  
          // Write the combined data back to the file
          fs.writeFileSync(filePath, JSON.stringify(combinedData, null, 2));
        } else {
          // If the file does not exist, simply write the new data
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
      }
  

        console.log("Data has been processed and saved successfully.");
    } catch (error) {
        console.error("Error processing data:", error);
    }
}

// Execute the function
processDataAndSave();

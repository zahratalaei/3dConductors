import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import streamJson from "stream-json";
const { parser } = streamJson
import pkg from "stream-json/streamers/StreamArray.js";
const streamArray = pkg;
import { mkdir } from "fs/promises";
import { fileURLToPath } from "url";
import * as mercator from "../../mercator-transforms-master/src/index.mjs";

// Recreate __dirname functionality
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ZOOM_LEVEL = 18; // Set your zoom level
// const UTM_PROJECTION =
//   "+proj=utm +zone=55 +south +ellps=GRS80 +datum=GDA94 +units=m +no_defs";
const tileSystemName = "cesium";
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

const directoryPath = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "outputs",
  "pole",
  `${ZOOM_LEVEL}`
);
async function processFile(inputFile, existingTileData) {
  return new Promise((resolve, reject) => {
    const dataPath = inputFile;
    const source = fs.createReadStream(dataPath);
    const jsonStream = pipeline(source, parser(),new streamArray(), (err) => {
      if (err) {
        console.error(`Pipeline failed for file ${inputFile}: `, err);
        reject(err);
      } else {
        console.log(`Pipeline succeeded for file ${inputFile}`);
        resolve();
      }
    });

    jsonStream.on('data', ({ value }) => {
      const item = value; // 'value' is your JSON object
      const color = item.COLOR;
      item.PoleData.forEach((pole) => {
        if (
          pole &&
          pole.Coordinates &&
          pole.Coordinates.length > 0 &&
          pole.Coordinates[0].Longitude !== undefined &&
          pole.Coordinates[0].Latitude !== undefined
        ) {
          const firstPoint = pole.Coordinates[0];
          const latlon = [
            parseFloat(firstPoint.Longitude),
            parseFloat(firstPoint.Latitude),
          ];
          // Convert lat/lon to tile
          const tile = mercator.latlon2mercTile(
            latlon,
            ZOOM_LEVEL,
            tileSystemName
          );

          const processedInfo = {
            color: color,
            coordinates: pole.Coordinates,
            Pole_Id: pole.Pole_Id,
            Site_Label: pole.Site_Label,
            Max_Voltage: pole.Max_Voltage,
            Pole_Height: pole.Pole_Height,
            Pole_Lean: pole.Pole_Lean,
            Captured_Date: pole.Captured_Date,
            Captured_Time: pole.Captured_Time,
            MaintenanceArea: pole.MaintenanceArea,
            Depot: pole.Depot,
          };

          // Use the tile coordinates as a key
          const tileKey = `${tile[0]}-${tile[1]}`;

          // Initialize an array for the tile if it doesn't exist
          if (!existingTileData[tileKey]) {
            existingTileData[tileKey] = [];
          }

          // Add the combined data to the tile's array
          existingTileData[tileKey].push(processedInfo);
        }
      });
    });
  });
}


      

//       // Update existingTileData with data from the current input file
//       for (const [tileKey, data] of Object.entries(tilesData)) {
//         if (!existingTileData[tileKey]) {
//           existingTileData[tileKey] = [];
//         }
//         existingTileData[tileKey].push(...data);
//       }
//     }catch(err){
//       console.error(`Error processing file ${inputFile}: ${err.message}`);
//     return; // Stop processing this file or use 'continue;' to skip to the next file
//     }
//     }

//     // Save the combined data to output files
//     for (const [tileKey, data] of Object.entries(existingTileData)) {
//       const [x, y] = tileKey.split("-");
//       const filePath = path.join(directoryPath, x, `${y}-data.json`);

//       // Ensure the tile's directory exists
//       await createDirectory(path.join(directoryPath, x));

//       fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
//     }

//     console.log("Data has been processed and saved successfully.");
//   } catch (error) {
//     console.error("Error processing data:", error);
//   }
// }
async function processDataAndSave() {
  try {
    const existingTileData = {};
    const inputDirectory = path.join(__dirname, "..", "..", "data", "inputs", "poles");
    const inputFile = path.join(inputDirectory, 'formatted_poles_voltage.json'); // Specify the exact file to process

    await processFile(inputFile, existingTileData);

    // After processing, existingTileData will contain all the processed information
    // Iterate over existingTileData to save it based on the tile keys
    for (const [tileKey, data] of Object.entries(existingTileData)) {
      const [x, y] = tileKey.split("-");
      const dirPath = path.join(directoryPath, x);
      const filePath = path.join(dirPath, `${y}-data.json`);
      
      // Ensure the directory exists before writing the file
      await createDirectory(dirPath);

      // Check if the file exists and append or create new
      if (fs.existsSync(filePath)) {
        const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Merge new data with existing data
        existingData.push(...data); // Append new data to the existing array
        fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
      } else {
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

import fs from "fs";
import readline from "readline";
import { mkdir } from "fs/promises";  // Ensure to import mkdir
// Fetch the dataName from command line arguments
const dataName = process.argv[2];  // Now dataName is provided as a command line argument
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
async function splitJsonFileByLine(filePath, outputBasePath, linesPerFile) {
  try {
    const fileStream = fs.createReadStream(filePath);

    fileStream.on("error", (error) => {
      console.error(`Error reading file: ${error}`);
    });

    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let filePart = 0;
    let lineCount = 0;
     const directory = outputBasePath.substring(
       0,
       outputBasePath.lastIndexOf("/")
     );
     await createDirectory(directory); // Ensure the directory is created before proceeding

     let writeStream = fs.createWriteStream(
       `${outputBasePath}_part${filePart}.json`
     );

    writeStream.on("error", (error) => {
      console.error(`Error writing file: ${error}`);
    });

    for await (const line of rl) {
      if (!writeStream.write(line + "\n")) {
        await new Promise((resolve) => writeStream.once("drain", resolve));
      }
      lineCount++;

      if (lineCount >= linesPerFile) {
        await new Promise((resolve) => writeStream.end(resolve));
        filePart++;
        lineCount = 0;
        writeStream = fs.createWriteStream(
          `${outputBasePath}_part${filePart}.json`
        );
        writeStream.on("error", (error) => {
          console.error(`Error writing file: ${error}`);
        });
      }
    }

    await new Promise((resolve) => writeStream.end(resolve));
  } catch (e) {
    console.log(e.message);
  }
}

splitJsonFileByLine(
  `../../data/${dataName}.json`,
  `../../data/splitFile/${dataName}/${dataName}`,
  30000
); // Splits into files with 30000 records each


// // Data Sets Configuration
// const dataSets = [
//   { filePath: "../../data/3DVegetationIntrusions_ClearanceBand.json", outputPath: "../../data/splitFile/VI/VI", linesPerFile: 100000 },
//   { filePath: "../../data/3DMinimumGroundClearance_Voltage.json", outputPath: "../../data/splitFile/MGC/MGC", linesPerFile: 100000 },
//   { filePath: "../../data/vis_3DConductors_Voltage.json", outputPath: "../../data/splitFile/conductors/conductors", linesPerFile: 30000 },
//   { filePath: "../../data/vis_3DStructureIntrusions_ClearanceBand.json", outputPath: "../../data/splitFile/SICB/SICB", linesPerFile: 10000 }
// ];

// // Process each data set
// dataSets.forEach(async (dataSet) => {
//   if (await fileExists(dataSet.filePath)) {
//     console.log(`File found: ${dataSet.filePath}. Proceeding with split.`);
//     splitJsonFileByLine(dataSet.filePath, dataSet.outputPath, dataSet.linesPerFile);
//   } else {
//     console.log(`File does not exist: ${dataSet.filePath}. Skipping.`);
//   }
// });

// Example usage
// splitJsonFileByLine('../../data/3DVegetationIntrusions_ClearanceBand.json', '../../data/splitFile/VI/VI', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine('../../data/3DMinimumGroundClearance_Voltage.json', '../../data/splitFile/MGC/MGC', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine('../../data/test.json', '../../data/splitFile/poles/poles', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine("../../data/vis_3DConductors_Voltage.json","../../data/splitFile/conductors/conductors",30000); // Splits into files with 100000 records each
// splitJsonFileByLine(
//   "../../data/vis_3DStructureIntrusions_ClearanceBand.json",
//   "../../data/splitFile/SICB/SICB",
//   10000
// ); // Splits into files with 100000 records each

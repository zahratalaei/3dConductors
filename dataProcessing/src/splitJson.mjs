import fs from "fs";
import readline from "readline";

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

// Example usage
// splitJsonFileByLine('../../data/3DVegetationIntrusions_ClearanceBand.json', '../../data/splitFile/VI/VI', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine('../../data/3DMinimumGroundClearance_Voltage.json', '../../data/splitFile/MGC/MGC', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine('../../data/vis_3DPoles_Voltage.json', '../../data/splitFile/poles/poles', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine("../../data/vis_3DConductors_Voltage.json","../../data/splitFile/conductors/conductors",30000); // Splits into files with 100000 records each
splitJsonFileByLine(
  "../../data/vis_3DStructureIntrusions_ClearanceBand.json",
  "../../data/splitFile/SICB/SICB",
  10000
); // Splits into files with 100000 records each

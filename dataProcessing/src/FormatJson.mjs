/*code for formatting a series of file*/
import fs from 'fs';
import path from 'path';
import readline from 'readline';
// const dataName = "MGC" //for Minimum ground clearance
const dataName = "SICB"
// The modified function that converts a single NDJSON file to an array in a JSON file
async function convertNdjsonToArray(inputFile, outputFile) {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const jsonArray = [];
    let lineNumber = 0;

    for await (const line of rl) {
        lineNumber++;
        try {
            const json = JSON.parse(line);
            jsonArray.push(json);
        } catch (err) {
            console.error(`Error parsing JSON from line ${lineNumber}: ${line}, error: ${err}`);
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(jsonArray, null, 2));
    console.log(`Conversion complete. Output saved to ${outputFile}`);
}

async function convertAllNdjsonInDirectory(sourceDir, outputDir) {
    if (!fs.existsSync(outputDir)){
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const files = fs.readdirSync(sourceDir);

    for (const file of files) {
        if (path.extname(file) === '.json') {
            const baseName = path.basename(file, '.json');
            // Construct the output filename based on the convention used in 'conductors'
            const outputFileName = `formatted_${baseName.replace('splitFile', dataName)}.json`;
            const inputFile = path.join(sourceDir, file);
            const outputFile = path.join(outputDir, outputFileName);
            await convertNdjsonToArray(inputFile, outputFile);
        }
    }
}


const sourceDir = `../../data/splitFile/${dataName}`;
const outputDir = `../../data/inputs/${dataName}`;
await convertAllNdjsonInDirectory(sourceDir, outputDir);


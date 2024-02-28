import fs from 'fs';
import readline from 'readline';

async function splitJsonFileByLine(filePath, outputBasePath, linesPerFile) {
    const fileStream = fs.createReadStream(filePath);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let filePart = 0;
    let lineCount = 0;
    let writeStream = fs.createWriteStream(`${outputBasePath}_part${filePart}.json`);

    for await (const line of rl) {
        writeStream.write(line + '\n');
        lineCount++;

        if (lineCount >= linesPerFile) {
            writeStream.end();
            filePart++;
            lineCount = 0;
            writeStream = fs.createWriteStream(`${outputBasePath}_part${filePart}.json`);
        }
    }

    writeStream.end();
}


// Example usage
splitJsonFileByLine('../../data/3DVegetationIntrusions_ClearanceBand.json', '../../data/splitFile/VI/VI', 100000); // Splits into files with 100000 records each
// splitJsonFileByLine('../../data/3DMinimumGroundClearance_Voltage.json', '../../data/splitFile/MGC/MGC', 100000); // Splits into files with 100000 records each

import fs from 'fs';
import readline from 'readline';

async function convertNdjsonToArray(inputFile, outputFile) {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const jsonArray = [];

    for await (const line of rl) {
        try {
            const json = JSON.parse(line);
            jsonArray.push(json);
        } catch (err) {
            console.error(`Error parsing JSON from line: ${err}`);
        }
    }

    fs.writeFileSync(outputFile, JSON.stringify(jsonArray, null, 2));
}

// Example usage
convertNdjsonToArray('../../data/splitFile/conductors_part7.json', '../../data/splitFile/formatted_conductors_part7.json');

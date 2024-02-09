// import fs from 'fs';
// import readline from 'readline';

// async function convertNdjsonToArray(inputFile, outputFile) {
//     const fileStream = fs.createReadStream(inputFile);
//     const rl = readline.createInterface({
//         input: fileStream,
//         crlfDelay: Infinity
//     });

//     const jsonArray = [];

//     for await (const line of rl) {
//         try {
//             const json = JSON.parse(line);
//             jsonArray.push(json);
//         } catch (err) {
//             console.error(`Error parsing JSON from line: ${err}`);
//         }
//     }

//     fs.writeFileSync(outputFile, JSON.stringify(jsonArray, null, 2));
// }

// // Example usage
// convertNdjsonToArray('../../data/inputs/poles/poles_voltage.json', '../../data/inputs/poles/formatted_poles_voltage.json');
import fs from 'fs';
import readline from 'readline';

async function convertNdjsonToArray(inputFile, outputFile) {
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity // Treat all instances of CR LF ('\r\n') as a single line break.
    });

    const jsonArray = [];
    let lineNumber = 0; // Add a line number counter for better error tracking

    for await (const line of rl) {
        lineNumber++; // Increment line number with each iteration
        try {
            const json = JSON.parse(line);
            jsonArray.push(json);
        } catch (err) {
            // Log the line number and content of the line that caused the error for easier debugging
            console.error(`Error parsing JSON from line ${lineNumber}: ${line}, error: ${err}`);
        }
    }

    // Write the output file with pretty-printed JSON
    fs.writeFileSync(outputFile, JSON.stringify(jsonArray, null, 2));

    console.log(`Conversion complete. Output saved to ${outputFile}`);
}

// Example usage
convertNdjsonToArray('../../data/inputs/poles/poles_voltage.json', '../../data/inputs/poles/formatted_poles_voltage.json');

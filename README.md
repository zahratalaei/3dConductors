# Display 3D Conductors in Cesium


This repository is dedicated to processing data for visualization and displaying conductors as primitives within Cesium. It enables users to interactively click on each conductor, highlighting the selected conductor and displaying an info box with its attributes.

## **Getting Started**

To use this project, you'll need to follow these steps to set up your environment, process the data, and run the application locally.

### **Prerequisites**

- Node.js installed on your machine
- Access to Google BigQuery for data extraction
- A local or remote instance of Cesium for 3D visualization


### **Data Processing Pipeline Overview**

This pipeline automates the extraction and processing of data from BigQuery, facilitating efficient management and preparation of data for visualization with Cesium. It is designed to handle large datasets by splitting them into manageable chunks, formatting them as needed, and organizing them into a structured directory format.

#### **How to Use `extractData.sh`**

**`extractData.sh`** is a comprehensive script that manages the workflow from data extraction to storage. To run the script, you will need to specify both the view name in BigQuery and the data name that dictates the processing logic and output format.

#### **Command to Execute the Pipeline**

Run the script from the terminal with the following command:

```bash
bashCopy code
./extractData.sh "VIEW_NAME" "DATA_NAME"

```

#### **Example Command**

```bash
bashCopy code
./extractData.sh "vis_3DStructureIntrusions_ClearanceBand" "SICB"

```

#### **Detailed Steps in the Pipeline**

The script follows these detailed steps to ensure accurate data handling:

1. **Extract Data**:
    - **Purpose**: Retrieves data from a specified BigQuery view, exporting it directly in JSON format.
    - **Process**: Data is pulled based on the provided **`VIEW_NAME`** and temporarily stored in BigQuery's environment.
    - **Output**: Data is exported to a Google Cloud Storage bucket for subsequent processing.
2. **Split Data**:
    - **Purpose**: Breaks down the large JSON file into smaller segments, making it easier to process sequentially or in parallel.
    - **Execution**: Utilizes a Node.js script to divide the data.
    - **Command**:
    node dataProcessing/src/splitJson.mjs
3. **Format Data**:
    - **Purpose**: Converts each segment of JSON data into a format suitable for use with visualization tools such as Cesium.
    - **Execution**: Another Node.js script is used for reformatting.
    - **Command**:
    node dataProcessing/src/FormatJson.mjs
4. **Organize Data**:
    - **Purpose**: Ensures that all formatted files are correctly placed into the designated directory structure, aligning with the needs of the frontend application for efficient data retrieval and display.
    - **Details**: Processed files are systematically stored in a directory named **`data`** at the root of the project.

#### **Cleanup Process**

After processing, the script performs cleanup activities:

- **Temporary BigQuery Table**: Removes the temporary table created in BigQuery to free up resources.
- **Bucket Data**: Deletes the exported JSON files from Google Cloud Storage to prevent data redundancy and manage storage costs.

#### **Configuration and Environment Setup**

Before running the script, ensure that:

- The Google Cloud SDK is installed and configured correctly.
- Node.js and necessary dependencies are installed in the **`dataProcessing`** directory.
- Proper access permissions are granted for BigQuery and Google Cloud Storage.
- A local or remote instance of mercator-transforms repository

### **Running the Server Locally**
*** If you have processed data, create data/outputs directory at root directory and copy proccessed data into it. e.g. data/outputs/conductors

To serve the data to the Cesium frontend, follow these steps:

```bash
cd backend
npm install
npm run server

```

### **Running the Frontend Locally**

To start the frontend application and visualize the 3D conductors:

```bash
cd frontend
npm install
npm start

```

## **Usage**

After starting both the backend server and the frontend application, navigate to the URL provided by the frontend's **`npm start`** command, typically **`http://localhost:3000`**. Click on any conductor to highlight it and view its attributes in the info box.

# Display 3D Conductors in Cesium


This repository is dedicated to processing data for visualization and displaying conductors as primitives within Cesium. It enables users to interactively click on each conductor, highlighting the selected conductor and displaying an info box with its attributes.

## **Getting Started**

To use this project, you'll need to follow these steps to set up your environment, process the data, and run the application locally.

### **Prerequisites**

- Node.js installed on your machine
- Access to Google BigQuery for data extraction
- A local or remote instance of Cesium for 3D visualization

### **Data Preparation**

The data processing involves extracting data from BigQuery, splitting it into manageable chunks, formatting it for Cesium, and organizing it into the correct directory structure.

1. **Extract Data**:
    - Extract data from a specific table in BigQuery in JSON format.
    - Save the extracted data into a new directory named **`data`** at the root of the project.
2. **Split Data**:
    - Divide the large JSON file into smaller chunks for easier processing.
    - Run the splitting script with the following command:
        
        ```bash
        node dataProcessing/src/splitJson.mjs
        
        ```
        
3. **Format Data**:
    - Format each JSON file to comply with the expected structure for visualization.
    - Run the formatting script with the following command:
        
        ```bash
        node dataProcessing/src/FormatJson.mjs
        
        ```
        
4. **Organize Data**:
    - Ensure that the processed data is placed in the correct path and structure as expected by the frontend application for visualization.

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

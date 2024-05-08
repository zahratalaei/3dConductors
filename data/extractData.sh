#!/bin/bash
BASE_DIR=$(cd $(dirname "$0")/..; pwd)
# Config variables
PROJECT_ID="virtual-tas-reports"
DATASET="tasnetworksVisualisation"
BUCKET_NAME="ce-tas-networks-visualisations"
# Check if sufficient arguments are passed
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 VIEW_NAME DATA_NAME"
    exit 1
fi

VIEW_NAME="$1"
DATA_NAME="$2"

QUERY_FILE="query.sql"
TEMP_TABLE="temporary_table_for_${VIEW_NAME}"

# Step 1: Create a temporary table
bq query --use_legacy_sql=false --destination_table="${PROJECT_ID}:${DATASET}.${TEMP_TABLE}" "SELECT * FROM \`${PROJECT_ID}.${DATASET}.${VIEW_NAME}\`"

# Step 2: Export the table to a bucket
bq extract --destination_format NEWLINE_DELIMITED_JSON "${PROJECT_ID}:${DATASET}.${TEMP_TABLE}" "gs://${BUCKET_NAME}/${VIEW_NAME}"

# Optional: Wait for the extract to complete if needed
echo "Checking for file in bucket..."
while ! gsutil ls "gs://${BUCKET_NAME}/${VIEW_NAME}" &> /dev/null; do
  echo "Waiting for file to appear in bucket..."
  sleep 10
done
echo "File is now in the bucket, proceeding to next step..."

# Step 4: Download data from the bucket (Assuming you have gsutil installed)
gsutil cp "gs://${BUCKET_NAME}/${VIEW_NAME}" "${BASE_DIR}/data/${DATA_NAME}.json"

# Step 5: Clean up - remove the temporary table
bq rm -t "${PROJECT_ID}:${DATASET}.${TEMP_TABLE}"

# Step 6: Remove file from the bucket
echo "Removing file from the bucket..."
gsutil rm "gs://${BUCKET_NAME}/${VIEW_NAME}"
echo "File removed from bucket."# Integrating JavaScript Processing Steps

echo "Running JavaScript processing steps..."

# Step 7: Run JavaScript file 1
echo "Changing to data processing directory..."
cd ${BASE_DIR}/dataProcessing/src || { echo "Failed to change directory"; exit 1; }
echo "Running first JavaScript file..."
node splitJson.mjs "${DATA_NAME}"|| { echo "Failed to execute splitJson.mjs"; exit 1; }

# Step 8: Remove the original JSON file after splitFile execution
echo "Removing the original data file after processing..."
rm "${BASE_DIR}/data/${DATA_NAME}.json"
echo "${DATA_NAME}.json removed successfully."

# Step 9: Run JavaScript file 2
echo "Running second JavaScript file..."
node FormatJson.mjs "${DATA_NAME}"|| { echo "Failed to execute formatJson.mjs"; exit 1; }

# Step 10: Select and run the appropriate processing script based on DATA_NAME
echo "Now in directory: $(pwd)"
case "$DATA_NAME" in
  "poles")
    echo "Processing poles data..."
    node poleProcessData.mjs
    ;;
  "MGC")
    echo "Processing MGC data..."
    node mgcProcessData.mjs
    ;;
  "SICB")
    echo "Processing SICB data..."
    node SICBProcessData.mjs
    ;;
  "conductors")
    echo "Processing conductors data..."
    node conductorProcessData.mjs
    ;;
  "VIP")
    echo "Processing VIP data..."
    node VIPProcessData.mjs
    ;;
  *)
    echo "No valid processing script available for ${DATA_NAME}"
    exit 1
    ;;
esac


# Return to the original directory
cd "$BASE_DIR/data"
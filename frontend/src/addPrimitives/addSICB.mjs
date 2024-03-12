import { getOrCreatePrimitiveArrayForTile } from "./helpers.mjs";
import * as Cesium from "cesium/Cesium";

// fetch data for structural intrusions
export async function fetchSICBsData(tile, zoomLevel) {
  try {
    const response = await fetch(
      `http://localhost:3000/getSICBByTile/${zoomLevel}/${tile._x}/${tile._y}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch structural intrusion data");
    }
    const data = await response.json(); // Correctly await the JSON data

    return data;
  } catch (e) {
    console.log(e.message);
  }
}

// Create alert icon for intrusion
export async function createSICBAlert(
  tile,
  structuralIntrusion,
  viewer,
  primitiveCollectionMap,
  primitiveMap
) {
  try {
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;

    const sicbId = `sicb_${structuralIntrusion.Intrusion_Id}`;
    // Check if a primitive already exists for this sicbId, and if so, remove it

    const existingPrimitive = primitiveMap.get(sicbId);
    if (existingPrimitive) {
      structuralIntrusion = {
        ...viewer.scene.primitives.providedProperties,
        ...structuralIntrusion,
      };
      viewer.scene.primitives.remove(existingPrimitive);
    }

    // const billboards = viewer.scene.primitives.add(
    //   new Cesium.BillboardCollection()
    // );

    const pointPrimitives = viewer.scene.primitives.add(
      new Cesium.PointPrimitiveCollection()
    );

    if (
      structuralIntrusion.Coordinates &&
      structuralIntrusion.Coordinates.length > 0
    ) {
      const coord = structuralIntrusion.Coordinates[0]; // Assuming we use the first coordinate set
      const position = Cesium.Cartesian3.fromDegrees(
        parseFloat(coord.Longitude),
        parseFloat(coord.Latitude),
        parseFloat(coord.Elevation)
      );

      const pointPrimitive = pointPrimitives.add({
        position: position,
        pixelSize: 10,
        color: Cesium.Color.GREEN,
        id: JSON.stringify(sicbId),
      });


      //     billboards.add({
      //       id: JSON.stringify(sicbId),
      //       position: position,
      //       image: "assets/icons/circle.svg", // URL to your alert icon image
      //       scale: 0.2, // Adjust the scale as needed
      //       pixelOffset: new Cesium.Cartesian2(0, 0), // Offset in pixels
      //       eyeOffset: new Cesium.Cartesian3(0.0, 0.0, 0.0), // Adjust to move the billboard in front of or behind other billboards
      //       horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      //       verticalOrigin: Cesium.VerticalOrigin.CENTER, // Adjust to anchor at the bottom or center
      //     });
    }

    const { Coordinates, ...remainingProperties } = structuralIntrusion;
    pointPrimitives.providedProperties = { ...remainingProperties };
    // console.log("🚀 ~ pointPrimitives:", pointPrimitives);

    // Get or create the array for the tileId and add the primitive
    const sicbPrimitiveArray = getOrCreatePrimitiveArrayForTile(
      tileId,
      primitiveCollectionMap
    );
    sicbPrimitiveArray.push(pointPrimitives);
    primitiveCollectionMap.set(tileId, sicbPrimitiveArray);

    // Store a reference to the primitive with its mgcId
    primitiveMap.set(sicbId, pointPrimitives);
  } catch (e) {
    console.error("Error fetching or creating structural intrusion:", e);
  }
}

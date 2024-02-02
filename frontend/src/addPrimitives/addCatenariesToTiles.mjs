import {getOrCreatePrimitiveArrayForTile} from "./helpers.mjs"
import * as Cesium from 'cesium/Cesium';
// Create a new map for storing points data
export const pointsDataMap = new Map();

export async function fetchDataForTile(tile, zoomLevel, dataType = 'full') {
  let url;
  switch (dataType) {
      case 'attributes':
          url = `http://localhost:3000/getConductorAttributes/${zoomLevel}/${tile._x}/${tile._y}`;
          break;
      case 'cartesian':
          url = `http://localhost:3000/getConductorCartesian/${zoomLevel}/${tile._x}/${tile._y}`;
          break;
      default:
          url = `http://localhost:3000/getCatenaries/${zoomLevel}/${tile._x}/${tile._y}`;
  }

  try {
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log(data);
      return data;
  } catch (error) {
      console.error(`Failed to fetch ${dataType} data for tile:`, error);
      return null;
  }
}
export function addSplineForPoints(tileId,conductorId, points,primitiveMap,primitiveCollectionMap,viewer) {
   // Check if a primitive already exists for this conductorId, and if so, remove it
   const existingPrimitive = primitiveMap.get(conductorId);
   console.log("🚀 ~ file: addCatenariesToTiles.mjs:24 ~ addSplineForPoints ~ existingPrimitive:", existingPrimitive)
   if (existingPrimitive) {
       viewer.scene.primitives.remove(existingPrimitive);
   }
      // Convert points to Cesium Cartesian3     
      const positions = points.map((point) => {
        return new Cesium.Cartesian3(point.x, point.y, point.z);
      });
     
      // Create a CatmullRomSpline using the positions
      const spline = new Cesium.CatmullRomSpline({
        times: positions.map((_, index) => index),
        points: positions,
      });
    
      // Sample the spline at various intervals to get positions along the curve
      const sampledPositions = [];
      for (let i = 0; i <= positions.length - 1; i += 0.1) {
        sampledPositions.push(spline.evaluate(i));
      }
      const combinedId = { tileId, conductorId };
      // Create the geometry instance for the polyline
      const geometryInstance = new Cesium.GeometryInstance({
        geometry: new Cesium.PolylineGeometry({
          positions: sampledPositions,
          width: 2.0, // Set the desired width
          // Set the correct vertex format
          vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT 
  
        }),
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED)
        },
        id: JSON.stringify(combinedId),
         
      });
    
      // Create the polyline primitive
      const polylinePrimitive = new Cesium.Primitive({
        geometryInstances: [geometryInstance],
          appearance: new Cesium.PolylineMaterialAppearance({
          material: new Cesium.Material.fromType('Color', {
              color: Cesium.Color.RED
            }),
            translucent: false
          }),
        asynchronous: false,
        pointsData: points
      });
    // Store the points data in pointsDataMap
    pointsDataMap.set(conductorId, points);
      // Get or create the primitive array for this tile
      const catenaryPrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId,primitiveMap);
      catenaryPrimitiveArray.push(polylinePrimitive); // Add the new primitive to the array
      primitiveCollectionMap.set(tileId, catenaryPrimitiveArray); // Make sure this line exists
   

      // Add the primitive to the scene
      viewer.scene.primitives.add(polylinePrimitive);
      // Store the polyline primitive in the primitive map by conductorId
      primitiveMap.set(conductorId, polylinePrimitive);
    }
    
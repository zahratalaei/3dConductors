import { getOrCreatePrimitiveArrayForTile } from './helpers.mjs';
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
      url = `http://localhost:3000/getConductors/${zoomLevel}/${tile._x}/${tile._y}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    console.log('url:', url);
    console.log('🚀 ~ fetchDataForTile ~ data in addCatenaries:', data);
    return data;
  } catch (error) {
    console.error(`Failed to fetch ${dataType} data for ${tile._x}:`, error);
    return null;
  }
}

// Function to fetch poles data from the server
export async function fetchPolesData(tile, zoomLevel) {
  const response = await fetch(
    `http://localhost:3000/getPoles/${zoomLevel}/${tile._x}/${tile._y}`
  );
  if (!response.ok) {
    throw new Error('Failed to fetch poles data');
  }
  return response.json();
}
export async function fetchMGCsData(tile, zoomLevel) {
  const response = await fetch(`http://localhost:3000/getMGCByTile/${zoomLevel}/${tile._x}/${tile._y}`);
  if (!response.ok) {
    throw new Error('Failed to fetch poles data');
  }
  return response.json();
}
// fetch data for vegetation intrusions
export async function fetchVIsData(tile, zoomLevel) {
  const response = await fetch(`http://localhost:3000/getVIByTile/${zoomLevel}/${tile._x}/${tile._y}`);
  if (!response.ok) {
    throw new Error('Failed to fetch vegetation intrusion data');
  }
  const data = await response.json(); // Correctly await the JSON data

  return data;
}


export function addSplineForPoints(tileId, conductorId, points, color, primitiveMap, primitiveCollectionMap, viewer) {
  console.log('=>(addCatenariesToTiles.mjs:37) tileId', tileId);

  // Check if a primitive already exists for this conductorId, and if so, remove it
  const existingPrimitive = primitiveMap.get(conductorId);
  if (existingPrimitive) {
    viewer.scene.primitives.remove(existingPrimitive);
  }
  // Convert the color from hex to a Cesium.Color instance
  const conductorColor = Cesium.Color.fromCssColorString(color);
  // Convert points to Cesium Cartesian3
  const positions = points.map(point => {
    return new Cesium.Cartesian3(point.x, point.y, point.z);
  });

  // Create a CatmullRomSpline using the positions
  const spline = new Cesium.CatmullRomSpline({
    times: positions.map((_, index) => index),
    points: positions
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

    id: JSON.stringify(combinedId)
  });

  // Create the polyline primitive
  const polylinePrimitive = new Cesium.Primitive({
    geometryInstances: [geometryInstance],
    appearance: new Cesium.PolylineMaterialAppearance({
      material: new Cesium.Material.fromType('Color', {
        color: conductorColor
      }),
      translucent: false
    }),
    asynchronous: false,
    pointsData: points
  });
  polylinePrimitive.appearance.material.depthTestEnabled = false;

  // Store the points data in pointsDataMap
  pointsDataMap.set(conductorId, points);
  // Get or create the primitive array for this tile
  const catenaryPrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId, primitiveMap);
  catenaryPrimitiveArray.push(polylinePrimitive); // Add the new primitive to the array
  primitiveCollectionMap.set(tileId, catenaryPrimitiveArray); // Make sure this line exists
  
  // Add the primitive to the scene
  viewer.scene.primitives.add(polylinePrimitive);
   // Store the polyline primitive in the primitive map by conductorId
  primitiveMap.set(conductorId, polylinePrimitive);
  
}

// Function to create poles based on the fetched data
export async function drawPole(tile, pole, viewer, primitiveCollectionMap, primitiveMap) {
  try {
    // Fetch poles data from the server
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;

    // Extract start and end coordinates for the pole
    const startCoordinate = pole.coordinates[0];
    const endCoordinate = pole.coordinates[1];

    const poleId = pole.Pole_Id;
    // Check if a primitive already exists for this conductorId, and if so, remove it
    const existingPrimitive = primitiveMap.get(poleId);
    if (existingPrimitive) {
      pole = { ...viewer.scene.primitives.providedProperties, ...pole };
      viewer.scene.primitives.remove(existingPrimitive);
    }
    // Convert color to string
    const color = Cesium.Color.fromCssColorString(pole.color);

    // Create start and end Cartesian3 positions
    const start = Cesium.Cartesian3.fromDegrees(
      startCoordinate.Longitude,
      startCoordinate.Latitude,
      startCoordinate.Elevation
    );
    const end = Cesium.Cartesian3.fromDegrees(endCoordinate.Longitude, endCoordinate.Latitude, endCoordinate.Elevation);

    // Calculate the length of the cylinder (vertical distance between start and end points)
    const length = Math.abs(startCoordinate.Elevation - endCoordinate.Elevation);

    // Calculate the midpoint between start and end points
    const midpoint = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());

    // Calculate the model matrix to position and orient the cylinder
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      midpoint,
      Cesium.Ellipsoid.WGS84,
      Cesium.Transforms.NORTH_UP_EAST
    );

    // Create the cylinder geometry
    const geometry = new Cesium.CylinderGeometry({
      length: length,
      topRadius: 0.2,
      bottomRadius: 0.35,
      vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL
    });

    // Create the geometry instance
    const instance = new Cesium.GeometryInstance({
      geometry: geometry,
      modelMatrix: modelMatrix,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
      },
      id: JSON.stringify({ tileId, poleId })
    });

    // Create the cylinder primitive
    const polePrimitive = viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: instance,
        appearance: new Cesium.MaterialAppearance({
          material: Cesium.Material.fromType('Color', {
            color: color
          })
        })
      })
    );

    const { coordinates, ...remainingProperties } = pole;
    polePrimitive.providedProperties = { ...remainingProperties };

    // Get or create the array for the tileId and add the primitive
    const polePrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId, primitiveMap);
    polePrimitiveArray.push(polePrimitive);
    primitiveCollectionMap.set(tileId, polePrimitiveArray);

    // Store the polyline primitive in the primitive map by conductorId
    primitiveMap.set(poleId, polePrimitive);
  } catch (error) {
    console.error('Error fetching or creating pole cylinders:', error);
  }
}


// Function to create MGC
export async function drawMGC(tile, mgc, viewer, primitiveCollectionMap, primitiveMap) {
  try {
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;

    const mgcId = `mgc_${mgc.ConductorId}`;
    // Check if a primitive already exists for this mgcId, and if so, remove it
    const existingPrimitive = primitiveMap.get(mgcId);
    if (existingPrimitive) {
      mgc = { ...viewer.scene.primitives.providedProperties, ...mgc };
      viewer.scene.primitives.remove(existingPrimitive);
    }

    // Convert color to string and add transparency
    // console.log("🚀 ~ mgc.color:", mgc.color);
    const color = Cesium.Color.fromCssColorString(mgc.color).withAlpha(0.2);
    // Create start and end Cartesian3 positions
    const start = Cesium.Cartesian3.fromDegrees(
      mgc.coordinates[0].Longitude,
      mgc.coordinates[0].Latitude,
      mgc.coordinates[0].Elevation
    );
    const end = Cesium.Cartesian3.fromDegrees(
      mgc.coordinates[1].Longitude,
      mgc.coordinates[1].Latitude,
      mgc.coordinates[1].Elevation
    );

    // Calculate the length of the cylinder (vertical distance between start and end points)
    const length = Math.abs(mgc.coordinates[0].Elevation - mgc.coordinates[1].Elevation);

    // Calculate the midpoint between start and end points
    const midpoint = Cesium.Cartesian3.midpoint(start, end, new Cesium.Cartesian3());

    // Calculate the model matrix to position and orient the cylinder
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      midpoint,
      Cesium.Ellipsoid.WGS84,
      Cesium.Transforms.NORTH_UP_EAST
    );
    // Create the cylinder geometry
    const geometry = new Cesium.CylinderGeometry({
      length: length,
      topRadius: 0.1,
      bottomRadius: 0.1,
      vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL
    });

    // Create the geometry instance
    const instance = new Cesium.GeometryInstance({
      geometry: geometry,
      modelMatrix: modelMatrix,
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(color)
      },
      id: JSON.stringify(mgcId)
    });

    // Create the cylinder primitive
    const linePrimitive = viewer.scene.primitives.add(
      new Cesium.Primitive({
        geometryInstances: instance,
        appearance: new Cesium.MaterialAppearance({
          material: Cesium.Material.fromType('Color', {
            color: color
          })
        })
      })
    );
    const { coordinates, ...remainingProperties } = mgc;
    linePrimitive.providedProperties = { ...remainingProperties };

    // Get or create the array for the tileId and add the primitive
    const mgcPrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId, primitiveCollectionMap);
    mgcPrimitiveArray.push(linePrimitive);
    primitiveCollectionMap.set(tileId, mgcPrimitiveArray);

    // Store a reference to the primitive with its mgcId
    primitiveMap.set(mgcId, linePrimitive);
  } catch (error) {
    console.error('Error fetching or creating mgc line:', error);
  }
}



// Create alert icon for intrusion
export async function createAlert(tile, vegetationIntrusion, viewer, primitiveCollectionMap, primitiveMap) {
  try {
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;

    const viId = `vi_${vegetationIntrusion.Intrusion_Id}`;
    // Check if a primitive already exists for this viId, and if so, remove it

    const existingPrimitive = primitiveMap.get(viId);
    if (existingPrimitive) {
      vegetationIntrusion = {
        ...viewer.scene.primitives.providedProperties,
        ...vegetationIntrusion
      };
      viewer.scene.primitives.remove(existingPrimitive);
    }


    const pointPrimitives = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

    if (vegetationIntrusion.Coordinates && vegetationIntrusion.Coordinates.length > 0) {
      const coord = vegetationIntrusion.Coordinates[0]; // Assuming we use the first coordinate set
      const position = Cesium.Cartesian3.fromDegrees(
        parseFloat(coord.Longitude),
        parseFloat(coord.Latitude),
        parseFloat(coord.Elevation)
      );

      const pointPrimitive = pointPrimitives.add({
        position: position,
        pixelSize: 10,
        color: Cesium.Color.RED,
        id: JSON.stringify(viId)
      });

    }

    const { coordinates, ...remainingProperties } = vegetationIntrusion;
    pointPrimitives.providedProperties = { ...remainingProperties };


    // Get or create the array for the tileId and add the primitive
    const viPrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId, primitiveCollectionMap);
    viPrimitiveArray.push(pointPrimitives);
    primitiveCollectionMap.set(tileId, viPrimitiveArray);

    // Store a reference to the primitive with its mgcId
    primitiveMap.set(viId, pointPrimitives);
  } catch (e) {
    console.error('Error fetching or creating vegetation intrusion:', e);
  }
}

import getOrCreatePrimitiveArrayForTile from "./helpers.mjs"
import * as Cesium from 'cesium/Cesium';

// Function to add a polyline entity for a given tile and store it
export function addPolylinePrimitiveForTile(tile) {
    // Define tileId at the beginning of the function
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;

    const westSouth = Cesium.Cartographic.fromRadians(tile._rectangle.west, tile._rectangle.south);
    const eastSouth = Cesium.Cartographic.fromRadians(tile._rectangle.east, tile._rectangle.south);
    const eastNorth = Cesium.Cartographic.fromRadians(tile._rectangle.east, tile._rectangle.north);
    const westNorth = Cesium.Cartographic.fromRadians(tile._rectangle.west, tile._rectangle.north);
  
    const wsCart = viewer.scene.globe.ellipsoid.cartographicToCartesian(westSouth);
    const esCart = viewer.scene.globe.ellipsoid.cartographicToCartesian(eastSouth);
    const enCart = viewer.scene.globe.ellipsoid.cartographicToCartesian(eastNorth);
    const wnCart = viewer.scene.globe.ellipsoid.cartographicToCartesian(westNorth);
  
    // Create the geometry instance for the polyline
    const geometryInstance = new Cesium.GeometryInstance({
      geometry: new Cesium.PolylineGeometry({
        positions: [wsCart, esCart, enCart, wnCart, wsCart],
        width: 2.0,
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE)
      },
      id: tileId // Optionally set an ID for the instance
    });
  
    // Create the polyline primitive
    const polylinePrimitive = new Cesium.Primitive({
      geometryInstances: [geometryInstance],
      appearance: new Cesium.PolylineColorAppearance({
        translucent: false,
        
      }),
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.BLUE)
    },
      asynchronous: false,
    });
  
    // Add the primitive to the scene
    viewer.scene.primitives.add(polylinePrimitive);
  
    // Get or create the primitive array for this tile
    const primitiveArray = getOrCreatePrimitiveArrayForTile(tileId);
   
    // Store the primitive for future removal
    primitiveArray.push(polylinePrimitive);
}

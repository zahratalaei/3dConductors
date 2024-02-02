import * as Cesium from 'cesium/Cesium';
// Function to get or create a primitive array for a given tile
export function getOrCreatePrimitiveArrayForTile(tileId,primitiveMap) {
    if (!primitiveMap.has(tileId)) {
      // Create a new array to hold primitives for this tile
        const newPrimitiveArray = []; 
        primitiveMap.set(tileId, newPrimitiveArray);
    }
    return primitiveMap.get(tileId);
}
export function removePrimitiveForInvisibleTiles(newVisibleTileIds,primitiveCollectionMap,viewer) {
  // Create a list of tileIds to remove by filtering out those that are still visible
  const tileIdsToRemove = Array.from(primitiveCollectionMap.keys())
                               .filter(tileId => !newVisibleTileIds.has(tileId));

  console.log("Tiles to remove:", tileIdsToRemove);

  // Remove each old Primitive collection that is no longer visible
  tileIdsToRemove.forEach(tileId => {
      const primitivesArray = primitiveCollectionMap.get(tileId);
      if (primitivesArray) {
          // Remove each primitive from the viewer's scene
          primitivesArray.forEach(primitive => {
              viewer.scene.primitives.remove(primitive);
          });
          // Delete the array from the map after removal
          primitiveCollectionMap.delete(tileId);
      }
  });
}


export function intersectingTiles(tiles,cullingVolume,viewer,zoomLevel){
  const intersectingTiles = tiles.filter(tile => {
    if (tile._level < zoomLevel) {
        return false; // Skip tiles below level 18
    }

    const boundingSphere = Cesium.BoundingSphere.fromRectangle3D(tile._rectangle, viewer.scene.globe.ellipsoid);
    const intersection = cullingVolume.computeVisibility(boundingSphere);
    return intersection === Cesium.Intersect.INSIDE || intersection === Cesium.Intersect.INTERSECTING;
});
const sortedIntersectingTiles = intersectingTiles.sort((a, b) => {
  if (a._level !== b._level) {
      return b._level - a._level; // Sort by level in descending order
  } else {
      const distanceA = Cesium.Cartesian3.distance(viewer.camera.position, Cesium.Rectangle.center(a._rectangle));
      const distanceB = Cesium.Cartesian3.distance(viewer.camera.position, Cesium.Rectangle.center(b._rectangle));
      return distanceA - distanceB; // Sort by distance for tiles of the same level
  }
});
return sortedIntersectingTiles;
}
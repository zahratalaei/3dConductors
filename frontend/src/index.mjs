import * as Cesium from "cesium/Cesium";
import {
  fetchDataForTile,
  addSplineForPoints,
  pointsDataMap,
  createPoles,
} from "./addPrimitives/addCatenariesToTiles.mjs";
import {
  removePrimitiveForInvisibleTiles,
  intersectingTiles,getOrCreatePrimitiveArrayForTile
} from "./addPrimitives/helpers.mjs";
import pLimit from "p-limit";
const limit = pLimit(10); // Adjust the limit as needed
const zoomLevel = 18;
// Map to hold arrays of primitives for each tile
const primitiveMap = new Map();
const primitiveCollectionMap = new Map();
const conductorToTileMap = new Map();

// Initialize the Cesium viewer
const viewer = new Cesium.Viewer("cesiumContainer", {
  terrain: Cesium.Terrain.fromWorldTerrain({
    // requestWaterMask: true
  }),
  camera: {
    destination: Cesium.Cartesian3.fromDegrees(147.3272, -42.8819, 10000), // longitude, latitude, height
  },
  infoBox: true, // Ensure this is true
  selectionIndicator: true,
  allowDataURIs: true,
});
// viewer.extend(Cesium.viewerCesiumInspectorMixin);
// viewer.scene.screenSpaceCameraController.enableCollisionDetection = true;
viewer.infoBox.viewModel.showInfo = true;
viewer.camera.flyTo({
  destination: Cesium.Cartesian3.fromDegrees(
    147.293701171875,
    -42.857666015625,
    10000
  ),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45), // looking down
    roll: 0.0,
  },
});

viewer.infoBox.frame.setAttribute(
  "sandbox",
  "allow-same-origin allow-popups allow-forms allow-scripts"
);
viewer.infoBox.frame.src = "about:blank";
// Show the checkbox after the viewer is set up
// document.getElementById('checkboxContainer').style.display = 'block';
function getTilesToRender(viewer) {
  const tiles = viewer.scene.globe._surface._tilesToRender;
  return tiles;
}
function getCullingVolume(viewer) {
  // Store the original camera position
  const originalPosition = Cesium.Cartesian3.clone(viewer.camera.position);

  // Move the camera slightly backward along its view direction
  const offset = Cesium.Cartesian3.multiplyByScalar(
    viewer.camera.direction,
    -10000.0,
    new Cesium.Cartesian3()
  );
  Cesium.Cartesian3.add(originalPosition, offset, viewer.camera.position);

  // Compute the culling volume with the adjusted camera position
  const cullingVolume = viewer.camera.frustum.computeCullingVolume(
    viewer.camera.position,
    viewer.camera.direction,
    viewer.camera.up
  );

  // Restore the original camera position
  viewer.camera.position = originalPosition;
  return cullingVolume;
}
// viewer.camera.changed.addEventListener(function() {
function onCameraChanged(viewer) {
  const newVisibleTileIds = new Set();
  const tiles = getTilesToRender(viewer);
  if (!tiles || tiles.length === 0) {
    console.log("No tiles to render.");
    return;
  }
  const cullingVolume = getCullingVolume(viewer);

  const sortedIntersectingTiles = intersectingTiles(
    tiles,
    cullingVolume,
    viewer,
    zoomLevel,
    viewer
  );

  // Take only the top 30 tiles (or any other number you prefer)
  const topTiles = sortedIntersectingTiles.slice(0, 30);

  // Compute corresponding tiles at zoomLevel for the top tiles
  const tilesAtZoomLevel = topTiles.map((tile) => {
    return computeTileAtZoomLevel(tile);
  });
  // If the camera is zoomed out to a level below 18, don't add any polylines
  const currentCameraLevel = tilesAtZoomLevel[0]?._level;
  if (currentCameraLevel < zoomLevel) {
    return;
  }

  const fetchDataPromises = [];

  tilesAtZoomLevel.forEach((tile) => {
    const tileId = `${tile._x}-${tile._y}-${tile._level}`;
    newVisibleTileIds.add(tileId);

    // Check if this tile's data is already fetched
    if (!primitiveCollectionMap.has(tileId)) {
      // Fetch data for new visible tile
      const fetchDataPromise = limit(() =>
        fetchDataForTile(tile, zoomLevel, "cartesian")
          .then((tileData) => {
            if (tileData && tileData.length > 0) {
              // Group conductors by BayId
              const bayGroups = tileData.reduce((acc, conductor) => {
                const { BayId } = conductor; // Adjust this line if the property name in your data is different
                acc[BayId] = acc[BayId] || [];
                acc[BayId].push(conductor);
                return acc;
              }, {});

              // Process each group of conductors by BayId
              Object.entries(bayGroups).forEach(([bayId, conductors]) => {
                // Draw individual splines for each conductor
                conductors.forEach((conductor) => {
                  const { conductorId, cartesian, color } = conductor;
                  addSplineForPoints(
                    tileId,
                    conductorId,
                    cartesian,
                    color,
                    primitiveMap,
                    primitiveCollectionMap,
                    viewer
                  );
                });
                createPoles(
                  zoomLevel,
                  tile,
                  viewer,
                  primitiveCollectionMap,
                  primitiveMap
                );
                // If multiple conductors exist in the bay, draw a line connecting their first points
                if (conductors.length > 1) {
                  const firstPoints = conductors.map(
                    (conductor) => conductor.cartesian[0]
                  );
                  const endPoints = conductors.map(
                    (conductor) => conductor.cartesian[10]
                  );

                  addCrossarms(
                    tileId,
                    firstPoints,
                    viewer,
                    primitiveCollectionMap,
                    primitiveMap
                  );
                  addCrossarms(
                    tileId,
                    endPoints,
                    viewer,
                    primitiveCollectionMap,
                    primitiveMap
                  );
                }
              });
            }
          })
          .catch((error) => {
            console.error(
              "Error fetching tile data for tile " + tileId + ":",
              error
            );
          })
      );

      fetchDataPromises.push(fetchDataPromise);
    }
  });
  // Handle all fetch data promises concurrently
  Promise.all(fetchDataPromises).catch((error) => {
    console.error("Error fetching tile data:", error);
  });

  // Remove entities for tiles that are no longer visible
  removePrimitiveForInvisibleTiles(
    newVisibleTileIds,
    primitiveCollectionMap,
    viewer
  );
}

// function addCrossarms(tileId, points, viewer, primitiveCollectionMap, primitiveMap, heightTolerance = 0.2) {
//   // Convert Cartesian coordinates to Cartographic to get heights
//   const cartographicPoints = points.map(point =>
//     Cesium.Cartographic.fromCartesian(new Cesium.Cartesian3(point.x, point.y, point.z))
//   );

//   // Group points based on height similarity
//   let groupedPoints = [];
//   cartographicPoints.forEach(point => {
//     let addedToGroup = false;
//     for (let group of groupedPoints) {
//       if (Math.abs(group[0].height - point.height) <= heightTolerance) {
//         group.push(point);
//         addedToGroup = true;
//         break;
//       }
//     }
//     if (!addedToGroup) {
//       groupedPoints.push([point]);
//     }
//   });

//   // Function to order points within each group using the Nearest Neighbor heuristic
//   function orderPoints(points) {
//     if (points.length <= 1) {
//       // If there is only one point or none, no further action is needed.
//       return points;
//     }
  
//     // Sort points by the x-coordinate.
//     const sortedPoints = points.sort((a, b) => a.x - b.x);
  
//     // Return the first and last points in the sorted array as the endpoints
//     const endpoints = [sortedPoints[0], sortedPoints[sortedPoints.length - 1]];
//     return endpoints;
//   }

//   // Convert Cartographic back to Cartesian3 for each group and draw lines
//   groupedPoints.forEach((group, index) => {
//     if (group.length > 1) {
//       // Order the points in the group
//       const orderedGroup = orderPoints(group);

//       // Ensure group has at least two points to draw a line
//       const crossarmId = `crossarm-${index}`;
//       // Check if a primitive for this index already exists and remove it
//       const existingPrimitive = primitiveMap.get(crossarmId);
//       if (existingPrimitive) {
//         viewer.scene.primitives.remove(existingPrimitive);
//       }
      
//       // Convert ordered cartographic points back to Cartesian3
//       const positions = orderedGroup.map(cartographicPoint =>
//         Cesium.Cartesian3.fromRadians(cartographicPoint.longitude, cartographicPoint.latitude, cartographicPoint.height)
//       );
//       console.log("🚀 ~ groupedPoints.forEach ~ positions:", positions)

//       // Create a polyline geometry for the group
//       const polylineGeometry = new Cesium.PolylineGeometry({
//         positions: positions,
//         width: 7, // Adjust width as needed
//         vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
//       });

//       const geometryInstance = new Cesium.GeometryInstance({
//         geometry: polylineGeometry,
//         attributes: {
//           color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.ORANGE), // Customize the color if needed
//         },
//       });

//       // Create the primitive for the polyline and add it to the scene
//       const polylinePrimitive = new Cesium.Primitive({
//         geometryInstances: [geometryInstance],
//         appearance: new Cesium.PolylineColorAppearance({
//           translucent: false,
//         }),
//       });

//       // Add the new primitive to the array and update the map
//       const crossarmPrimitiveArray = getOrCreatePrimitiveArrayForTile(tileId, primitiveMap);
//       crossarmPrimitiveArray.push(polylinePrimitive);
//       primitiveCollectionMap.set(tileId, crossarmPrimitiveArray);

//       viewer.scene.primitives.add(polylinePrimitive);
//     }
//   });
// }

function addCrossarms(
  tileId,
  points,
  viewer,
  primitiveCollectionMap,
  primitiveMap,heightTolerance = 0.2
) {
  // Convert Cartesian coordinates to Cartographic to get heights
  const cartographicPoints = points.map((point) =>
    Cesium.Cartographic.fromCartesian(
      new Cesium.Cartesian3(point.x, point.y, point.z)
    )
  );

  // Group points based on height similarity
  let groupedPoints = [];
  cartographicPoints.forEach((point) => {
    let addedToGroup = false;
    for (let group of groupedPoints) {
      if (Math.abs(group[0].height - point.height) <= heightTolerance) {
        group.push(point);
        addedToGroup = true;
        break;
      }
    }
    if (!addedToGroup) {
      groupedPoints.push([point]);
    }
  });

  // Convert Cartographic back to Cartesian3 for each group and draw lines
  groupedPoints.forEach((group, index) => {
    // Use an index as the identifier
    if (group.length > 1) {
      // Ensure group has at least two points to draw a line
      const crossarmId = `crossarm-${index}`;
      // Check if a primitive for this index already exists and remove it
      const existingPrimitive = primitiveMap.get(crossarmId);
      if (existingPrimitive) {
        viewer.scene.primitives.remove(existingPrimitive);
      }
      const positions = group.map((cartographicPoint) =>
        Cesium.Cartesian3.fromRadians(
          cartographicPoint.longitude,
          cartographicPoint.latitude,
          cartographicPoint.height
        )
      );

      // Create a polyline geometry for the group
      const polylineGeometry = new Cesium.PolylineGeometry({
        positions: positions,
        width: 6, // Adjust width as needed
        vertexFormat: Cesium.PolylineColorAppearance.VERTEX_FORMAT,
      });

      const geometryInstance = new Cesium.GeometryInstance({
        geometry: polylineGeometry,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            Cesium.Color.ORANGE
          ), // Customize the color if needed
        },
      });

      // Create the primitive for the polyline and add it to the scene
      const polylinePrimitive = new Cesium.Primitive({
        geometryInstances: [geometryInstance],
        appearance: new Cesium.PolylineColorAppearance({
          translucent: false,
        }),
      });
      // Get or create the primitive array for this tile
      const crossarmPrimitiveArray = getOrCreatePrimitiveArrayForTile(
        tileId,
        primitiveMap
      );
      crossarmPrimitiveArray.push(polylinePrimitive); // Add the new primitive to the array
      primitiveCollectionMap.set(tileId, crossarmPrimitiveArray); // Make sure this line exists

      viewer.scene.primitives.add(polylinePrimitive);
    }
  });
}


function computeTileAtZoomLevel(tile) {
  if (!tile) return null;
  if (tile._level === zoomLevel) return tile; // If the tile is already at zoomLevel, return it

  let levelsToTraverse = tile._level - zoomLevel;
  while (tile && levelsToTraverse > 0) {
    tile = tile._parent;
    levelsToTraverse--;
  }

  return tile;
}

viewer.camera.changed.addEventListener(() => onCameraChanged(viewer));

let lastPickedPrimitive = null;
let lastPickedPrimitiveOriginalColor = null;

function resetLastPickedPrimitiveColor() {
  if (lastPickedPrimitive && lastPickedPrimitiveOriginalColor) {
    lastPickedPrimitive.appearance.material.uniforms.color =
      lastPickedPrimitiveOriginalColor;
  }
}

async function fetchConductorInfo(tileId, conductorId, zoomLevel) {
  try {
    const url = `http://localhost:3000/getConductorAttributes/${zoomLevel}/${tileId.x}/${tileId.y}/${conductorId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const attributes = await response.json();
    return attributes;
  } catch (error) {
    console.error("Failed to fetch conductor attributes:", error);
    return null;
  }
}
function createDescriptionHtml(conductorInfo) {
  // Modify this function to use conductorInfo data
  return `
  <table class="cesium-infoBox-defaultTable"><tbody>
  <tr><th>Conductor:</th><td>${conductorInfo.ConductorId}</td></tr>
  <tr><th>Conductor Length:</th><td>${conductorInfo.Conductor_Length}</td></tr>
  <tr><th>Bay ID:</th><td>${conductorInfo.Bay_Id}</td></tr>
  <tr><th>Voltage:</th><td>${conductorInfo.Voltage}</td></tr>
  </tbody></table>
  
 `;
}
{
  /* <div id="tabs">2023-12-11 13:03:25
    <dl>
      <dt><strong>Conductor:</strong></dt>
      <dd><strong>Conductor Id:</strong> ${conductorInfo.ConductorId}</dd>
      <dd><strong>Conductor Length:</strong> ${conductorInfo.Conductor_Length}</dd>
      <dt><strong>Bay:</strong></dt>
      <dd><strong>Bay ID:</strong> ${conductorInfo.Bay_Id}</dd>
      <dd><strong>Voltage:</strong> ${conductorInfo.Voltage}</dd>
    </dl>
  </div> */
}
function removeConductorPoints(conductorId) {
  const pointsToRemove = viewer.entities.values.filter((entity) =>
    entity.id.startsWith(`point_${conductorId}_`)
  );
  pointsToRemove.forEach((point) => viewer.entities.remove(point));
}

// Example: Close modal when clicking outside of it
window.addEventListener("click", function (event) {
  const modal = document.getElementById("conductorModal");
  if (event.target == modal) {
    modal.style.display = "none";
  }
});

function togglePointsVisibility(conductorId, isVisible) {
  let pointsEntities = viewer.entities.values.filter((entity) =>
    entity.id.startsWith(`point_${conductorId}_`)
  );

  if (pointsEntities.length === 0 && isVisible) {
    const pointsData = pointsDataMap.get(conductorId);
    // Create point entities from the points data
    pointsData.forEach((point, index) => {
      createPointEntity(conductorId, index, point);
    });
  } else {
    // Toggle visibility of existing points
    pointsEntities.forEach((entity) => (entity.show = isVisible));
  }
}
function createPointEntity(conductorId, index, point) {
  const pointId = `point_${conductorId}_${index}`;
  const position = new Cesium.Cartesian3(point.x, point.y, point.z);
  viewer.entities.add({
    position: position,
    point: {
      color: Cesium.Color.BLUE,
      pixelSize: 10,
      show: true, // Set to visible when created
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    id: pointId,
  });
}
function highlightConductor(primitive) {
  resetLastPickedPrimitiveColor();
  lastPickedPrimitive = primitive;
  lastPickedPrimitiveOriginalColor =
    primitive.appearance.material.uniforms.color.clone();
  primitive.appearance.material.uniforms.color = Cesium.Color.YELLOW; // Highlight color
}
/**Highlight selected pole */
function highlightPole(primitive) {
  resetLastPickedPrimitiveColor();
  lastPickedPrimitive = primitive;
  lastPickedPrimitiveOriginalColor =
    primitive.appearance.material.uniforms.color.clone();
  primitive.appearance.material.uniforms.color = Cesium.Color.YELLOW; // Highlight color for poles
}

// function resetLastPickedPrimitiveColor() {
//   if (lastPickedPrimitive && lastPickedPrimitiveOriginalColor) {
//       lastPickedPrimitive.appearance.material.uniforms.color = lastPickedPrimitiveOriginalColor;
//       lastPickedPrimitive = null;
//       lastPickedPrimitiveOriginalColor = null;
//   }
// }
let currentConductorId = null;
viewer.screenSpaceEventHandler.setInputAction(async function onLeftClick(
  movement
) {
  const pickedObject = viewer.scene.pick(movement.position);

  if (
    Cesium.defined(pickedObject) &&
    pickedObject.primitive &&
    pickedObject.id
  ) {
    const combinedId = JSON.parse(pickedObject.id); // Parse the JSON string to get the object

    if (
      typeof pickedObject.id._id === "string" &&
      pickedObject.id._id.startsWith("point_")
    ) {
      highlightPoint(pickedObject.id._id);
    } else if (combinedId.hasOwnProperty("poleId")) {
      // Handle pole selection here
      const poleId = combinedId.poleId;
      // Add your code to handle pole selection
      highlightPole(pickedObject.primitive);
      // Split tileId string into x and y components
      const tileIdParts = combinedId.tileId.split("-");
      const newTileId = {
        x: tileIdParts[0],
        y: tileIdParts[1],
      };

      // Extract zoom level from tileId
      const zoomLevel = tileIdParts[2];
      const poleInfo = await fetchPoleInfo(newTileId, poleId, zoomLevel);
      if (poleInfo) {
        // Display information about the selected pole in the info box
        viewer.selectedEntity = new Cesium.Entity({
          name: `Pole Details`,
          description: createPoleDescriptionHtml(poleInfo),
          id: pickedObject.id,
        });
      }
    } else {
      try {
        if (currentConductorId) {
          removeConductorPoints(currentConductorId);
        }
        const primitive = pickedObject.primitive;
        const combinedId = JSON.parse(pickedObject.id); // Parse the JSON string to get the object
        currentConductorId = combinedId.conductorId;
        // Check if points should be shown
        if (document.getElementById("togglePointsCheckbox").checked) {
          togglePointsVisibility(currentConductorId, true);
        }
        const tileId = combinedId.tileId;
        const [x, y, zoom] = tileId.split("-").map(Number);
        const conductorId = combinedId.conductorId;
        const conductorInfo = await fetchConductorInfo(
          { x, y },
          conductorId,
          zoom
        );
        if (conductorInfo) {
          viewer.selectedEntity = new Cesium.Entity({
            name: `Conductor Details`,
            description: createDescriptionHtml(conductorInfo),
            id: pickedObject.id,
          });

          if (lastPickedPrimitive === primitive) {
            resetLastPickedPrimitiveColor();
            lastPickedPrimitive = null;
            lastPickedPrimitiveOriginalColor = null;
          } else {
            highlightConductor(primitive);
            // resetLastPickedPrimitiveColor();
            // lastPickedPrimitive = primitive;
            // lastPickedPrimitiveOriginalColor =
            //   primitive.appearance.material.uniforms.color.clone();
            // primitive.appearance.material.uniforms.color = Cesium.Color.YELLOW; // Highlight color
          }
        }

        // Show the modal
        const modal = document.getElementById("conductorModal");
        modal.style.display = "block";
      } catch (e) {
        console.log("Error parsing pickedObject.id:", e);
      }
    }
  }
},
Cesium.ScreenSpaceEventType.LEFT_CLICK);
document
  .getElementById("togglePointsCheckbox")
  .addEventListener("change", function (event) {
    if (currentConductorId) {
      togglePointsVisibility(currentConductorId, event.target.checked);
    }
  });
let currentlySelectedPointId = null;

function highlightPoint(clickedPointId) {
  // Check if the clicked point is the currently selected point
  if (currentlySelectedPointId === clickedPointId) {
    // Deselect the currently selected point
    var currentPointEntity = viewer.entities.getById(currentlySelectedPointId);
    if (currentPointEntity) {
      currentPointEntity.point.outlineColor = Cesium.Color.BLUE; // Or the original color
      currentPointEntity.point.outlineWidth = 1;
    }
    currentlySelectedPointId = null; // Reset the currently selected point ID
  } else {
    // Deselect the previously selected point, if any
    if (currentlySelectedPointId) {
      var previousPointEntity = viewer.entities.getById(
        currentlySelectedPointId
      );
      if (previousPointEntity) {
        previousPointEntity.point.outlineColor = Cesium.Color.BLUE; // Or the original color
        previousPointEntity.point.outlineWidth = 1;
      }
    }

    // Select the new point
    var newPointEntity = viewer.entities.getById(clickedPointId);
    if (newPointEntity) {
      newPointEntity.point.outlineColor = Cesium.Color.WHITE;
      newPointEntity.point.outlineWidth = 2;
      currentlySelectedPointId = clickedPointId; // Update the currently selected point ID
    }

    // Update the currently selected point index
    // Extract the index from the point ID (assuming the format `point_{conductorId}_{index}`)
    let parts = clickedPointId.split("_");
    if (parts.length >= 3) {
      currentlySelectedPointIndex = parseInt(parts[2]);
    } else {
      console.error("Invalid point ID format:", clickedPointId);
      currentlySelectedPointIndex = -1;
    }
  }
}

// Right-click event handler to deselect and close InfoBox
viewer.screenSpaceEventHandler.setInputAction(function onRightClick(movement) {
  // Hide the modal on right-click
  const modal = document.getElementById("conductorModal");
  if (modal) {
    modal.style.display = "none";
  }

  // Reset the appearance of the last picked entity
  if (lastPickedPrimitive && lastPickedPrimitiveOriginalColor) {
    lastPickedPrimitive.appearance.material.uniforms.color =
      lastPickedPrimitiveOriginalColor;
    lastPickedPrimitive = undefined;
    lastPickedPrimitiveOriginalColor = undefined;
  }
  // Remove point entities for the current conductor
  if (currentConductorId) {
    removeConductorPoints(currentConductorId);
    currentConductorId = null; // Reset the currentConductorId
  }
  // Deselect the current entity
  viewer.selectedEntity = undefined;

  // Optionally hide the InfoBox
  if (viewer.infoBox) {
    viewer.infoBox.viewModel.showInfo = false;
  }
}, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

// Define a step size for moving the point
const stepSize = 0.01; // Adjust this value as needed

let currentlySelectedPointIndex = -1; // Index of the currently selected point

// Function to update point position
function updatePointPosition(direction) {
  if (currentlySelectedPointId) {
    let pointEntity = viewer.entities.getById(currentlySelectedPointId);
    if (pointEntity) {
      let currentPosition = Cesium.Cartesian3.clone(
        pointEntity.position.getValue(Cesium.JulianDate.now())
      );
      let newPosition;

      switch (direction) {
        case "up":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(0, stepSize, 0),
            new Cesium.Cartesian3()
          );
          break;
        case "down":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(0, -stepSize, 0),
            new Cesium.Cartesian3()
          );
          break;
        case "left":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(-stepSize, 0, 0),
            new Cesium.Cartesian3()
          );
          break;
        case "right":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(stepSize, 0, 0),
            new Cesium.Cartesian3()
          );
          break;
        case "increaseZ":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(0, 0, stepSize),
            new Cesium.Cartesian3()
          );
          break;
        case "decreaseZ":
          newPosition = Cesium.Cartesian3.add(
            currentPosition,
            new Cesium.Cartesian3(0, 0, -stepSize),
            new Cesium.Cartesian3()
          );
          break;
        default:
          return;
      }

      pointEntity.position = new Cesium.ConstantPositionProperty(newPosition);
      // Assuming you have a way to get the tileId from the currentConductorId
      const currentTileId = getTileIdFromConductorId(currentConductorId);

      if (!currentTileId) {
        console.error("Unable to find tileId for the current conductor");
        return;
      }
      // Update the spline
      // Check if the current conductor's spline is highlighted
      const wasHighlighted =
        lastPickedPrimitive === primitiveMap.get(currentConductorId);

      // Update the spline
      const pointsSet = pointsDataMap.get(currentConductorId);
      if (pointsSet && currentlySelectedPointIndex >= 0) {
        pointsSet[currentlySelectedPointIndex] = newPosition;

        addSplineForPoints(
          currentTileId,
          currentConductorId,
          pointsSet,
          primitiveMap,
          primitiveCollectionMap,
          viewer
        );

        // Re-apply the highlight if it was highlighted before
        if (wasHighlighted) {
          const updatedPrimitive = primitiveMap.get(currentConductorId);
          if (updatedPrimitive) {
            highlightConductor(updatedPrimitive);
            lastPickedPrimitive = updatedPrimitive;
          }
        }
      }
      // }
    }
  }
}

// Add keydown event listener to the document
document.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "ArrowUp":
      updatePointPosition("up");
      break;
    case "ArrowDown":
      updatePointPosition("down");
      break;
    case "ArrowLeft":
      updatePointPosition("left");
      break;
    case "ArrowRight":
      updatePointPosition("right");
      break;
    case "PageUp":
      updatePointPosition("increaseZ");
      break;
    case "PageDown":
      updatePointPosition("decreaseZ");
      break;
  }
});
function getTileIdFromConductorId(conductorId) {
  return conductorToTileMap.get(conductorId);
}

// Function to fetch pole information
async function fetchPoleInfo(tileId, poleId, zoomLevel) {
  try {
    const url = `http://localhost:3000/getPoleById/${zoomLevel}/${tileId.x}/${tileId.y}/${poleId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const poleInfo = await response.json();
    return poleInfo;
  } catch (error) {
    console.error("Failed to fetch pole information:", error);
    return null;
  }
}

// Function to create HTML content for displaying pole information
function createPoleDescriptionHtml(poleInfo) {
  // Modify this function to use poleInfo data
  return `
    <table class="cesium-infoBox-defaultTable">
      <tbody>
        <tr><th>Pole ID:</th><td>${poleInfo.Pole_Id}</td></tr>
        <tr><th>Pole Height:</th><td>${poleInfo.Pole_Height}</td></tr>
        <tr><th>Site Label:</th><td>${poleInfo.Site_Label}</td></tr>
        <tr><th>Max_Voltage:</th><td>${poleInfo.Max_Voltage}</td></tr>
        <tr><th>Pole_Height</th><td>${poleInfo.Pole_Height}</td></tr>
        <tr><th>Pole_Lean:</th><td>${poleInfo.Pole_Lean}</td></tr>
        <tr><th>Captured_Date:</th><td>${poleInfo.Captured_Date}</td></tr>
        <tr><th>Captured_Time:</th><td>${poleInfo.Captured_Time}</td></tr>
        <tr><th>Maintenance Area:</th><td>${poleInfo.MaintenanceArea}</td></tr>
        <tr><th>Depot:</th><td>${poleInfo.Depot}</td></tr>
        <!-- Add more pole attributes here -->
      </tbody>
    </table>
  `;
}

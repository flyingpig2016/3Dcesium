const viewer = new Cesium.Viewer("cesiumContainer", {
    shouldAnimate: true,
  });
  
  const statusDisplay = document.createElement("div");
  const fuelDisplay = document.createElement("div");
  const czmlPath = "../SampleData/";
  let vehicleEntity;
  
  // Add a blank CzmlDataSource to hold our multi-part entity/entities.
  const dataSource = new Cesium.CzmlDataSource();
  
  viewer.dataSources.add(dataSource);
  
  // This demo shows how a single path can be broken up into several CZML streams.
  const partsToLoad = [
    {
      url: "MultipartVehicle_part1.czml",
      range: [0, 1500],
      requested: false,
      loaded: false,
    },
    {
      url: "MultipartVehicle_part2.czml",
      range: [1500, 3000],
      requested: false,
      loaded: false,
    },
    {
      url: "MultipartVehicle_part3.czml",
      range: [3000, 4500],
      requested: false,
      loaded: false,
    },
  ];
  
  function updateStatusDisplay() {
    let msg = "";
    partsToLoad.forEach(function (part) {
      msg += `${part.url} - `;
      if (part.loaded) {
        msg += "Loaded.<br/>";
      } else if (part.requested) {
        msg += "Loading now...<br/>";
      } else {
        msg += "Not needed yet.<br/>";
      }
    });
    statusDisplay.innerHTML = msg;
  }
  
  // Helper function to mark a part as requested, and process it into the dataSource.
  function processPart(part) {
    part.requested = true;
    updateStatusDisplay();
    dataSource.process(czmlPath + part.url).then(function () {
      part.loaded = true;
      updateStatusDisplay();
  
      // Follow the vehicle with the camera.
      if (!viewer.trackedEntity) {
        viewer.trackedEntity = vehicleEntity =
          dataSource.entities.getById("Vehicle");
      }
    });
  }
  
  // Load the first part up front.
  processPart(partsToLoad[0]);
  
  // Load a new section before the clock naturally gets there.
  // Note this can't predict when a user may fast-forward to it.
  const preloadTimeInSeconds = 100;
  
  viewer.clock.onTick.addEventListener(function (clock) {
    // This example uses time offsets from the start to identify which parts need loading.
    const timeOffset = Cesium.JulianDate.secondsDifference(
      clock.currentTime,
      clock.startTime,
    );
  
    // Filter the list of parts to just the ones that need loading right now.
    // Then, process each part that needs loading.
    partsToLoad
      .filter(function (part) {
        return (
          !part.requested &&
          timeOffset >= part.range[0] - preloadTimeInSeconds &&
          timeOffset <= part.range[1]
        );
      })
      .forEach(function (part) {
        processPart(part);
      });
  
    if (vehicleEntity) {
      const fuel = vehicleEntity.properties.fuel_remaining.getValue(
        clock.currentTime,
      );
      if (Cesium.defined(fuel)) {
        fuelDisplay.textContent = `Fuel: ${fuel.toFixed(2)} gal`;
      }
    }
  });
  
  // Add a reset button, for convenience.
  Sandcastle.addToolbarButton("Reset demo", function () {
    // Put things back to the starting position.
    viewer.clock.currentTime = viewer.clock.startTime;
    viewer.clock.shouldAnimate = true;
  
    partsToLoad.forEach(function (part) {
      part.requested = false;
      part.loaded = false;
    });
  
    dataSource.entities.removeAll();
    processPart(partsToLoad[0]);
  });
  
  // Show the status display below the reset button.
  statusDisplay.style.background = "rgba(42, 42, 42, 0.7)";
  statusDisplay.style.padding = "5px 10px";
  document.getElementById("toolbar").appendChild(statusDisplay);
  
  // Show a multi-part custom property being read from CZML.
  fuelDisplay.style.background = "rgba(42, 42, 42, 0.7)";
  fuelDisplay.style.padding = "5px 10px";
  fuelDisplay.style.marginTop = "5px";
  document.getElementById("toolbar").appendChild(fuelDisplay);
  
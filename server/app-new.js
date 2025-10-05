// Main Application Initialization
(function() {
  'use strict';

  // Application State
  const AppState = {
    viewer: null,
    lastPropagation: null,
    leoEntity: null,
    allSatelliteEntities: [],
    debrisEntities: [],
    collisionEntities: [],
    
    // Clear all state
    clear() {
      this.debrisEntities = [];
      this.collisionEntities = [];
      this.allSatelliteEntities = [];
      this.lastPropagation = null;
      this.leoEntity = null;
    },
    
    // Update specific state
    update(type, data) {
      switch(type) {
        case 'propagation':
          this.lastPropagation = data;
          break;
        case 'debris':
          this.debrisEntities = data;
          break;
        case 'satellites':
          this.allSatelliteEntities = data;
          break;
        case 'leo':
          this.leoEntity = data;
          break;
      }
    }
  };

  // Make AppState globally available
  window.AppState = AppState;
  window.lastPropagation = null; // For backward compatibility

  // Initialize Cesium Viewer
  function initializeCesium() {
    try {
      if (window.CESIUM_ION_TOKEN) {
        Cesium.Ion.defaultAccessToken = window.CESIUM_ION_TOKEN;
      }

      let terrainProvider;
      try {
        terrainProvider = Cesium.createWorldTerrain();
      } catch (terrainError) {
        terrainProvider = new Cesium.EllipsoidTerrainProvider();
        ErrorManager.showWarning('Falling back to basic ellipsoid terrain');
        ErrorManager.log(`Terrain fallback activated: ${terrainError.message}`);
      }

      const viewer = new Cesium.Viewer('cesiumContainer', {
        timeline: true,
        animation: true,
        baseLayerPicker: true,
        geocoder: false,
        terrain: terrainProvider
      });

      AppState.viewer = viewer;
      window.viewer = viewer; // For backward compatibility

      ErrorManager.showSuccess('Cesium 3D viewer initialized');
      ErrorManager.log('🌍 Cesium viewer ready');

      return viewer;
    } catch (error) {
      ErrorManager.handleJsError(error, 'Cesium initialization');
      throw error;
    }
  }

  // Simple Cesium Manager (placeholder for full implementation)
  const CesiumManager = {
    viewer: null,
    
    init(viewer) {
      this.viewer = viewer;
    },

    addOrbitEntity(propagation) {
      if (!this.viewer || !propagation) return;

      try {
        // Create position property using orbital calculator
        const property = OrbitalCalc.generateCesiumPositionProperty(
          propagation, 
          CONFIG.TRAIL_TIME_SECONDS
        );

        const entity = this.viewer.entities.add({
          id: `satellite_${propagation.norad_id}`,
          name: `${propagation.norad_id} ${propagation.name}`,
          position: property,
          point: { 
            pixelSize: CONFIG.DEFAULT_PIXEL_SIZE, 
            color: Cesium.Color.CYAN 
          },
          path: {
            material: Cesium.Color.YELLOW.withAlpha(0.7),
            width: CONFIG.PATH_WIDTH,
            leadTime: CONFIG.LEAD_TIME_SECONDS,
            trailTime: CONFIG.TRAIL_TIME_SECONDS
          },
          label: {
            text: `${propagation.norad_id} ${propagation.name}`,
            font: '12px sans-serif',
            fillColor: Cesium.Color.WHITE,
            showBackground: true,
            backgroundColor: Cesium.Color.BLACK.withAlpha(0.4),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, CONFIG.LABEL_PIXEL_OFFSET_Y)
          }
        });

        // Set up time controls
        const start = Cesium.JulianDate.now();
        const stop = Cesium.JulianDate.addSeconds(start, CONFIG.TRAIL_TIME_SECONDS, new Cesium.JulianDate());
        
        this.viewer.clock.startTime = start.clone();
        this.viewer.clock.currentTime = start.clone();
        this.viewer.clock.stopTime = stop.clone();
        this.viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
        this.viewer.clock.multiplier = CONFIG.ANIMATION_SPEED_MULTIPLIER;
        this.viewer.trackedEntity = entity;

        AppState.update('propagation', propagation);
        window.lastPropagation = propagation; // Backward compatibility

        ErrorManager.log(`🛰️ Object added to scene: ${propagation.norad_id} ${propagation.name}`);
        return entity;
      } catch (error) {
        ErrorManager.handleJsError(error, 'Adding orbit entity');
      }
    },

    visualizeDebris(debrisObjects) {
      if (!this.viewer || !debrisObjects) return;

      try {
        this.clearDebris();
        
        debrisObjects.forEach((debris, index) => {
          const color = UTILS.getDebrisColor(debris.rcs_size);
          const size = UTILS.getDebrisSize(debris.rcs_size);
          
          // Use orbital calculator for positions
          const positions = OrbitalCalc.preCalculateOrbitPositions(debris, CONFIG.TRAIL_TIME_SECONDS * 1000);
          const property = new Cesium.SampledPositionProperty();
          
          const startTime = Cesium.JulianDate.now();
          positions.forEach((pos, i) => {
            const time = Cesium.JulianDate.addSeconds(startTime, i * 60, new Cesium.JulianDate());
            const cartesian = Cesium.Cartesian3.fromDegrees(
              pos.position.longitude,
              pos.position.latitude, 
              pos.position.altitude * 1000
            );
            property.addSample(time, cartesian);
          });

          const entity = this.viewer.entities.add({
            id: `debris_${debris.norad_id}`,
            name: `🗑️ ${debris.name}`,
            position: property,
            point: {
              pixelSize: size,
              color: Cesium.Color.fromCssColorString(color),
              outlineColor: Cesium.Color.WHITE,
              outlineWidth: 1
            },
            path: {
              material: Cesium.Color.fromCssColorString(CONFIG.COLORS.DEBRIS_TRAJECTORY),
              width: 1,
              trailTime: 1800
            }
          });

          AppState.debrisEntities.push(entity);
        });

        ErrorManager.showSuccess(`Visualized ${debrisObjects.length} debris objects`);
      } catch (error) {
        ErrorManager.handleJsError(error, 'Visualizing debris');
      }
    },

    clearDebris() {
      if (!this.viewer) return;
      
      AppState.debrisEntities.forEach(entity => {
        this.viewer.entities.remove(entity);
      });
      AppState.debrisEntities = [];
    },

    clearAll() {
      if (!this.viewer) return;
      
      this.viewer.entities.removeAll();
      AppState.clear();
    },

    showNASARiskZones() {
      // Implementation would go here
      ErrorManager.showInfo('NASA Risk Zones feature coming soon');
    },

    showAllSatellites() {
      ErrorManager.showInfo('Show all satellites feature coming soon');
    },

    showLEOSatellites() {
      ErrorManager.showInfo('LEO satellites visualization coming soon');
    },

    showNonLEOSatellites() {
      ErrorManager.showInfo('Non-LEO satellites visualization coming soon');
    },

    toggleLEOVisualization() {
      ErrorManager.showInfo('LEO boundary toggle coming soon');
    }
  };

  // Make CesiumManager globally available
  window.CesiumManager = CesiumManager;

  // Application initialization
  function initializeApp() {
    try {
      ErrorManager.log('🚀 Initializing Space Debris NASA Demo...');

      // Initialize DOM cache
      DOM.init();
      ErrorManager.init(DOM.get('log'));

      // Initialize Cesium
      const viewer = initializeCesium();
      CesiumManager.init(viewer);

      // Initialize event management
      Events.init();

      // Hide welcome overlay after a delay
      setTimeout(() => {
        const welcome = document.getElementById('welcome');
        if (welcome) {
          welcome.classList.add('hide-welcome');
        }
      }, 3000);

      ErrorManager.showSuccess('Application initialized successfully');
      ErrorManager.log('✅ All systems ready');

    } catch (error) {
      ErrorManager.handleJsError(error, 'Application initialization');
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }

  // Global error handling
  window.addEventListener('error', (event) => {
    ErrorManager.handleJsError(event.error, 'Global window error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    ErrorManager.handleJsError(event.reason, 'Unhandled promise rejection');
  });

})();
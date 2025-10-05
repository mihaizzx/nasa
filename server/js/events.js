// Centralized Event Delegation System
class EventManager {
  constructor(domCache, apiManager, errorHandler) {
    this.dom = domCache || DOM;
    this.api = apiManager || API;
    this.errorHandler = errorHandler || ErrorManager;
    this.handlers = new Map();
    this.initialized = false;
  }

  // Initialize event delegation
  init() {
    if (this.initialized) return;

    // Setup main event delegation listener
    document.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('change', this.handleChange.bind(this));
    document.addEventListener('submit', this.handleSubmit.bind(this));

    // Register all handlers
    this.registerHandlers();
    this.initialized = true;
  }

  // Main click handler with delegation
  handleClick(event) {
    const target = event.target;
    const action = target.dataset.action;
    const buttonId = target.id;

    // Handle data-action attributes
    if (action && this.handlers.has(action)) {
      event.preventDefault();
      this.executeHandler(action, target, event);
      return;
    }

    // Handle specific button IDs
    if (buttonId && this.handlers.has(buttonId)) {
      event.preventDefault();
      this.executeHandler(buttonId, target, event);
      return;
    }

    // Handle parent elements with actions (for complex buttons with nested elements)
    const actionParent = target.closest('[data-action]');
    if (actionParent && actionParent.dataset.action) {
      event.preventDefault();
      this.executeHandler(actionParent.dataset.action, actionParent, event);
      return;
    }
  }

  // Handle change events
  handleChange(event) {
    const target = event.target;
    const action = target.dataset.changeAction;

    if (action && this.handlers.has(action)) {
      this.executeHandler(action, target, event);
    }
  }

  // Handle form submissions
  handleSubmit(event) {
    const target = event.target;
    const action = target.dataset.submitAction;

    if (action && this.handlers.has(action)) {
      event.preventDefault();
      this.executeHandler(action, target, event);
    }
  }

  // Execute handler with error handling
  async executeHandler(action, element, event) {
    try {
      const handler = this.handlers.get(action);
      if (typeof handler === 'function') {
        await handler(element, event, this);
      }
    } catch (error) {
      this.errorHandler.handleJsError(error, `Event handler: ${action}`);
    }
  }

  // Register a handler
  registerHandler(action, handler) {
    this.handlers.set(action, handler);
  }

  // Register all application handlers
  registerHandlers() {
    // Sidebar toggle
    this.registerHandler('toggleSidebar', () => {
      this.dom.toggleSidebar();
    });

    // TLE Loading handlers
    this.registerHandler('loadCelestrak', async (element) => {
      await this.api.loadTLEWithUI('active', 'Active Satellites', '🛰️', 'btnLoadCelestrak');
    });

    this.registerHandler('loadActiveData', async (element) => {
      await this.api.loadTLEWithUI('active', 'Active Satellites', '🛰️', 'btnLoadActiveData');
    });

    this.registerHandler('loadWeatherData', async (element) => {
      await this.api.loadTLEWithUI('weather', 'Weather Satellites', '🌦️', 'btnLoadWeatherData');
    });

    this.registerHandler('loadScienceData', async (element) => {
      await this.api.loadTLEWithUI('science', 'Science Satellites', '🔬', 'btnLoadScienceData');
    });

    this.registerHandler('loadCommunicationData', async (element) => {
      await this.api.loadTLEWithUI('communications', 'Communication Satellites', '📡', 'btnLoadCommunicationData');
    });

    this.registerHandler('loadNavigationData', async (element) => {
      await this.api.loadTLEWithUI('gps-ops', 'GPS Satellites', '🧭', 'btnLoadNavigationData');
    });

    // Refresh objects
    this.registerHandler('refreshObjects', async (element) => {
      this.dom.setLoadingState('btnRefresh', true);
      try {
        await this.api.refreshObjectsList();
        this.errorHandler.showSuccess('Objects list refreshed');
      } finally {
        this.dom.setLoadingState('btnRefresh', false);
      }
    });

    // Add to scene
    this.registerHandler('addToScene', async (element) => {
      const objectSelect = this.dom.get('objectSelect');
      const minutesEl = this.dom.get('minutesEl');
      const stepEl = this.dom.get('stepEl');

      if (!objectSelect.value) {
        this.errorHandler.showWarning(CONFIG.ERRORS.NO_OBJECT_SELECTED);
        return;
      }

      this.dom.setLoadingState('btnAddToScene', true);
      try {
        const propagation = await this.api.propagateOrbitWithUI(
          parseInt(objectSelect.value),
          parseFloat(minutesEl.value) || 90,
          parseFloat(stepEl.value) || 1
        );

        // Add to Cesium scene (this would need CesiumManager)
        if (window.CesiumManager) {
          window.CesiumManager.addOrbitEntity(propagation);
        }
      } finally {
        this.dom.setLoadingState('btnAddToScene', false);
      }
    });

    // NASA DONKI
    this.registerHandler('fetchDonki', async (element) => {
      this.dom.setLoadingState('btnDonki', true);
      try {
        this.dom.showResult('donkiResult', 'Querying NASA DONKI...');
        const data = await this.api.getNASADonki();
        
        const latest = data.latest_kp;
        if (latest) {
          this.dom.showResult('donkiResult', `Latest Kp: ${latest.kpIndex} at ${latest.observedTime}`);
        } else {
          this.dom.showResult('donkiResult', 'No Kp values in range.');
        }
      } catch (error) {
        this.dom.showResult('donkiResult', 'DONKI Error.');
      } finally {
        this.dom.setLoadingState('btnDonki', false);
      }
    });

    // Risk Analysis
    this.registerHandler('calculateRisk', async (element) => {
      const objectSelect = this.dom.get('objectSelect');
      
      if (!objectSelect.value) {
        this.errorHandler.showWarning(CONFIG.ERRORS.NO_OBJECT_SELECTED);
        return;
      }

      if (!window.lastPropagation || !window.lastPropagation.samples || window.lastPropagation.samples.length === 0) {
        this.errorHandler.showWarning(CONFIG.ERRORS.NO_PROPAGATION_DATA);
        return;
      }

      const formValues = this.dom.getFormValues(['areaEl', 'daysEl', 'sizeMinEl', 'sizeMaxEl']);
      
      const meanAlt = window.lastPropagation.samples.reduce((acc, s) => acc + s.alt_km, 0) / window.lastPropagation.samples.length;

      const params = {
        norad_id: objectSelect.value,
        alt_km: String(meanAlt),
        area_m2: formValues.areaEl || '1.0',
        size_min_cm: formValues.sizeMinEl || '1.0',
        size_max_cm: formValues.sizeMaxEl || '10.0',
        duration_days: formValues.daysEl || '30'
      };

      this.dom.setLoadingState('btnRisk', true);
      try {
        this.dom.showResult('riskResult', 'Calculating risk...');
        const riskData = await this.api.calculateRiskWithUI(params);
        
        // Format and display results
        const riskPercent = (riskData.collision_probability * 100).toFixed(4);
        const resultText = this.formatRiskResult(riskData, riskPercent);
        this.dom.showResult('riskResult', resultText);
      } finally {
        this.dom.setLoadingState('btnRisk', false);
      }
    });

    // Debris simulation
    this.registerHandler('simulateDebris', async (element) => {
      const objectSelect = this.dom.get('objectSelect');
      
      if (!objectSelect.value) {
        this.errorHandler.showWarning(CONFIG.ERRORS.NO_OBJECT_SELECTED);
        return;
      }

      this.dom.setLoadingState('btnSimulateDebris', true);
      try {
        const debrisData = await this.api.loadDebrisWithUI(parseInt(objectSelect.value), 'btnSimulateDebris');
        
        // Visualize debris (this would need CesiumManager)
        if (window.CesiumManager) {
          window.CesiumManager.visualizeDebris(debrisData.debris_objects);
        }

        this.dom.showResult('debrisResult', `🗑️ ${debrisData.debris_objects.length} debris objects loaded and visualized`);
      } finally {
        this.dom.setLoadingState('btnSimulateDebris', false);
      }
    });

    // Clear operations
    this.registerHandler('clearDebris', () => {
      if (window.CesiumManager) {
        window.CesiumManager.clearDebris();
      }
      this.errorHandler.showInfo('Debris cleared from scene');
    });

    this.registerHandler('clearAllDebris', () => {
      if (window.CesiumManager) {
        window.CesiumManager.clearAll();
      }
      this.errorHandler.showInfo('All objects cleared from scene');
    });

    // Satellite visualization
    this.registerHandler('showAllSatellites', async (element) => {
      if (window.CesiumManager) {
        window.CesiumManager.showAllSatellites();
      }
    });

    this.registerHandler('showLEOSatellites', async (element) => {
      if (window.CesiumManager) {
        window.CesiumManager.showLEOSatellites();
      }
    });

    this.registerHandler('showNonLEOSatellites', async (element) => {
      if (window.CesiumManager) {
        window.CesiumManager.showNonLEOSatellites();
      }
    });

    this.registerHandler('toggleLEO', () => {
      if (window.CesiumManager) {
        window.CesiumManager.toggleLEOVisualization();
      }
    });

    // NASA Risk Zones
    this.registerHandler('showNASARiskZones', async (element) => {
      this.dom.setLoadingState('btnShowNASARiskZones', true);
      try {
        if (window.CesiumManager) {
          window.CesiumManager.showNASARiskZones();
        }
        this.errorHandler.showSuccess('NASA risk zones displayed');
      } finally {
        this.dom.setLoadingState('btnShowNASARiskZones', false);
      }
    });

    // Impact prediction
    this.registerHandler('predictImpact', async (element) => {
      const objectSelect = this.dom.get('objectSelect');
      
      if (!objectSelect.value) {
        this.errorHandler.showWarning(CONFIG.ERRORS.NO_OBJECT_SELECTED);
        return;
      }

      this.dom.setLoadingState('btnPredictImpact', true);
      try {
        const noradId = objectSelect.value;
        
        // Get current orbital data
        const propagation = await this.api.propagateOrbit(noradId, 180, 10);
        if (propagation) {
          // Calculate risk metrics
          const riskParams = {
            norad_id: noradId,
            time_window: 24,
            proximity_threshold: 5  // 5km threshold
          };
          
          const riskData = await this.api.calculateRisk(riskParams);
          if (riskData) {
            this.errorHandler.showSuccess(`Impact prediction calculated: Risk level ${riskData.risk_level || 'LOW'}`);
            
            // Display risk details
            const riskDetails = document.getElementById('riskResults');
            if (riskDetails) {
              riskDetails.innerHTML = `
                <h4>Impact Prediction Results</h4>
                <p><strong>Object:</strong> ${noradId}</p>
                <p><strong>Risk Level:</strong> ${riskData.risk_level || 'LOW'}</p>
                <p><strong>Proximity Events:</strong> ${riskData.close_approaches || 0}</p>
                <p><strong>Next Close Approach:</strong> ${riskData.next_approach_time || 'None detected'}</p>
              `;
            }
          }
        }
      } catch (error) {
        this.errorHandler.handleError(error, 'Impact prediction calculation');
      } finally {
        this.dom.setLoadingState('btnPredictImpact', false);
      }
    });

    // Object selection change
    this.registerHandler('objectSelectionChanged', async (element) => {
      const noradId = element.value;
      if (noradId) {
        try {
          await this.api.getSatelliteDetails(parseInt(noradId));
        } catch (error) {
          // Error already handled by API manager
        }
      }
    });

    // Image classification
    this.registerHandler('classifyImage', async (element) => {
      const imageInput = this.dom.get('imageInput');
      
      if (!imageInput.files || imageInput.files.length === 0) {
        this.errorHandler.showWarning('Please select an image file');
        return;
      }

      this.dom.setLoadingState('btnDetect', true);
      try {
        this.dom.showResult('detectResult', 'Classifying image...');
        
        const formData = new FormData();
        formData.append('file', imageInput.files[0]);
        
        const result = await this.api.classifyImage(formData);
        this.dom.showResult('detectResult', `Classification: ${result.class} (${(result.confidence * 100).toFixed(1)}%)`);
      } finally {
        this.dom.setLoadingState('btnDetect', false);
      }
    });
  }

  // Helper method to format risk results
  formatRiskResult(data, riskPercent) {
    return `🛰️ ${data.name} (NORAD ${data.norad_id})\n` +
           `📍 Altitude: ${Number(data.altitude_km).toFixed(1)} km, Inclination: ${Number(data.inclination_deg).toFixed(1)}°\n\n` +
           `📊 RISK ANALYSIS:\n` +
           `🎯 Risk Level: ${data.risk_level}\n` +
           `📈 Collision Probability: ${riskPercent}%\n` +
           `⏱️ Analysis Period: ${data.duration_days} days\n` +
           `📐 Cross Section: ${data.cross_section_m2} m²\n\n` +
           `🌌 SPACE DEBRIS FLUX:\n` +
           `${data.flux_explanation}\n\n` +
           `💡 EXPLANATION:\n` +
           `${data.risk_explanation}\n\n` +
           `🔧 RECOMMENDATIONS:\n` +
           `• ${data.recommendations.monitoring}\n` +
           `• ${data.recommendations.maneuver}\n` +
           `• ${data.recommendations.shielding}`;
  }

  // Add custom handler
  addHandler(action, handler) {
    this.registerHandler(action, handler);
  }

  // Remove handler
  removeHandler(action) {
    this.handlers.delete(action);
  }

  // Cleanup
  destroy() {
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('change', this.handleChange);
    document.removeEventListener('submit', this.handleSubmit);
    this.handlers.clear();
    this.initialized = false;
  }
}

// Create global event manager instance
const Events = new EventManager(DOM, API, ErrorManager);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventManager;
}
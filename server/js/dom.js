// DOM Cache and Management System
class DOMCache {
  constructor() {
    this.elements = {};
    this.initialized = false;
  }

  // Initialize all DOM element references
  init() {
    if (this.initialized) return;

    // Cache all elements in one go
    this.elements = {
      // Main containers
      sidebar: document.getElementById('sidebar'),
      toggleSidebar: document.getElementById('toggleSidebar'),
      cesiumContainer: document.getElementById('cesiumContainer'),
      log: document.getElementById('log'),

      // Object selection
      objectSelect: document.getElementById('objectSelect'),

      // TLE Loading buttons
      btnLoadCelestrak: document.getElementById('btnLoadCelestrak'),
      btnLoadActiveData: document.getElementById('btnLoadActiveData'),
      btnLoadWeatherData: document.getElementById('btnLoadWeatherData'),
      btnLoadScienceData: document.getElementById('btnLoadScienceData'),
      btnLoadCommunicationData: document.getElementById('btnLoadCommunicationData'),
      btnLoadNavigationData: document.getElementById('btnLoadNavigationData'),
      btnRefresh: document.getElementById('btnRefresh'),
      btnAddToScene: document.getElementById('btnAddToScene'),

      // Simulation controls
      minutesEl: document.getElementById('minutes'),
      stepEl: document.getElementById('step'),

      // NASA DONKI
      btnDonki: document.getElementById('btnDonki'),
      donkiResult: document.getElementById('donkiResult'),

      // Risk Analysis
      btnRisk: document.getElementById('btnRisk'),
      areaEl: document.getElementById('area'),
      daysEl: document.getElementById('days'),
      sizeMinEl: document.getElementById('sizeMin'),
      sizeMaxEl: document.getElementById('sizeMax'),
      riskResult: document.getElementById('riskResult'),

      // Image Detection
      btnDetect: document.getElementById('btnDetect'),
      imageInput: document.getElementById('imageInput'),
      detectResult: document.getElementById('detectResult'),

      // Debris simulation
      btnSimulateDebris: document.getElementById('btnSimulateDebris'),
      btnClearDebris: document.getElementById('btnClearDebris'),
      btnPredictImpact: document.getElementById('btnPredictImpact'),
      btnClearAllDebris: document.getElementById('btnClearAllDebris'),
      btnShowNASARiskZones: document.getElementById('btnShowNASARiskZones'),
      debrisResult: document.getElementById('debrisResult'),

      // Satellite visualization
      btnShowAllSatellites: document.getElementById('btnShowAllSatellites'),
      btnShowLEOSatellites: document.getElementById('btnShowLEOSatellites'),
      btnShowNonLEOSatellites: document.getElementById('btnShowNonLEOSatellites'),
      btnToggleLEO: document.getElementById('btnToggleLEO'),
      btnClearAllSatellites: document.getElementById('btnClearAllSatellites'),
      satellitesResult: document.getElementById('satellitesResult'),
      leoResult: document.getElementById('leoResult')
    };

    // Validate that all elements exist
    this.validateElements();
    this.initialized = true;
  }

  // Validate that critical elements exist
  validateElements() {
    const missingElements = [];
    for (const [key, element] of Object.entries(this.elements)) {
      if (!element) {
        missingElements.push(key);
      }
    }
    
    if (missingElements.length > 0) {
      console.warn('Missing DOM elements:', missingElements);
    }
  }

  // Get element by key
  get(key) {
    if (!this.initialized) {
      this.init();
    }
    return this.elements[key];
  }

  // Check if element exists
  has(key) {
    return !!this.get(key);
  }

  // Get multiple elements
  getMultiple(...keys) {
    return keys.map(key => this.get(key));
  }

  // Add event listener with error handling
  addEventListener(elementKey, event, handler, options = {}) {
    const element = this.get(elementKey);
    if (element) {
      element.addEventListener(event, handler, options);
    } else {
      console.warn(`Cannot add event listener: element '${elementKey}' not found`);
    }
  }

  // Remove event listener
  removeEventListener(elementKey, event, handler) {
    const element = this.get(elementKey);
    if (element) {
      element.removeEventListener(event, handler);
    }
  }

  // Batch operations for performance
  batchOperation(operations) {
    // Use requestAnimationFrame for DOM updates
    requestAnimationFrame(() => {
      operations.forEach(op => {
        const element = this.get(op.element);
        if (element && op.action) {
          op.action(element);
        }
      });
    });
  }

  // Set loading state for buttons
  setLoadingState(buttonKey, isLoading, originalText = '') {
    const button = this.get(buttonKey);
    if (!button) return;

    if (isLoading) {
      button.classList.add('loading');
      button.disabled = true;
      const icon = button.querySelector('.btn-icon');
      if (icon) {
        icon.style.animation = 'floatingIcon 0.5s ease-in-out infinite';
      }
      if (originalText) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<span class="btn-icon">⏳</span> Loading...`;
      }
    } else {
      button.classList.remove('loading');
      button.disabled = false;
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      } else if (originalText) {
        button.innerHTML = originalText;
      }
    }
  }

  // Show/hide result elements
  showResult(elementKey, content, className = '') {
    const element = this.get(elementKey);
    if (element) {
      element.innerText = content;
      element.style.display = 'block';
      if (className) {
        element.className = className;
      }
    }
  }

  hideResult(elementKey) {
    const element = this.get(elementKey);
    if (element) {
      element.style.display = 'none';
    }
  }

  // Get form values safely
  getFormValues(elementKeys) {
    const values = {};
    elementKeys.forEach(key => {
      const element = this.get(key);
      if (element) {
        values[key] = element.value;
      }
    });
    return values;
  }

  // Set form values safely
  setFormValues(valueMap) {
    Object.entries(valueMap).forEach(([key, value]) => {
      const element = this.get(key);
      if (element) {
        element.value = value;
      }
    });
  }

  // Clear all form inputs
  clearForm(elementKeys) {
    elementKeys.forEach(key => {
      const element = this.get(key);
      if (element && (element.type === 'text' || element.type === 'number' || element.tagName === 'SELECT')) {
        element.value = '';
      }
    });
  }

  // Toggle sidebar state
  toggleSidebar() {
    const sidebar = this.get('sidebar');
    const toggleBtn = this.get('toggleSidebar');
    
    if (sidebar && toggleBtn) {
      sidebar.classList.toggle('collapsed');
      toggleBtn.innerHTML = sidebar.classList.contains('collapsed') ? '→' : '☰';
    }
  }
}

// Create global DOM cache instance
const DOM = new DOMCache();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMCache;
}
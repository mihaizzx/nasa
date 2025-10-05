// Centralized API Module with Error Handling and Loading States
class APIManager {
  constructor(baseUrl, errorHandler, domCache) {
    this.baseUrl = baseUrl || CONFIG.API_BASE_URL;
    this.errorHandler = errorHandler || ErrorManager;
    this.dom = domCache || DOM;
    this.cache = new Map(); // Simple response caching
    this.requestQueue = new Map(); // Prevent duplicate requests
  }

  // Generic API request method
  async request(endpoint, options = {}, context = '', buttonKey = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const requestKey = `${options.method || 'GET'}_${url}_${JSON.stringify(options.body || {})}`;
    
    // Prevent duplicate requests
    if (this.requestQueue.has(requestKey)) {
      return this.requestQueue.get(requestKey);
    }

    // Set loading state if button provided
    if (buttonKey) {
      this.dom.setLoadingState(buttonKey, true);
    }

    const requestPromise = this._makeRequest(url, options, context);
    this.requestQueue.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up
      this.requestQueue.delete(requestKey);
      if (buttonKey) {
        this.dom.setLoadingState(buttonKey, false);
      }
    }
  }

  // Internal request method
  async _makeRequest(url, options, context) {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await this.errorHandler.fetchWithErrorHandling(url, defaultOptions, context);
      const data = await response.json();
      
      // Cache successful GET requests
      if (!options.method || options.method === 'GET') {
        this.cache.set(url, { data, timestamp: Date.now() });
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get cached response if available and not expired
  getCached(url, maxAgeMs = 300000) { // 5 minutes default
    const cached = this.cache.get(url);
    if (cached && (Date.now() - cached.timestamp) < maxAgeMs) {
      return cached.data;
    }
    return null;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
  }

  // TLE Operations
  async loadTLE(source = 'celestrak', group = 'active', buttonKey = null) {
    return this.request('/api/tle/load', {
      method: 'POST',
      body: JSON.stringify({ source, group })
    }, `Loading TLE data (${group})`, buttonKey);
  }

  async getTLEObjects() {
    return this.request('/api/objects', {}, 'Fetching TLE objects');
  }

  async propagateOrbit(noradId, minutes, step) {
    const params = new URLSearchParams({
      norad_id: parseInt(noradId),
      minutes: parseFloat(minutes),
      step_s: parseFloat(step)
    });
    return this.request(`/api/propagate?${params.toString()}`, {}, `Propagating orbit for ${noradId}`);
  }

  // Satellite Operations
  async getSatelliteDetails(noradId) {
    return this.request(`/api/satellite/details?norad_id=${noradId}`, {}, `Getting satellite details for ${noradId}`);
  }

  // Risk Analysis
  async calculateRisk(params) {
    const queryParams = new URLSearchParams(params);
    return this.request(`/api/risk/ordem?${queryParams.toString()}`, {}, 'Calculating collision risk');
  }

  // NASA Operations
  async getNASADonki() {
    return this.request('/api/spaceweather/donki', {}, 'Fetching NASA DONKI data');
  }

  async getNASADebris(noradId, limit = 200, proximityKm = 1000) {
    const params = new URLSearchParams({
      norad_id: String(noradId),
      limit: String(limit),
      proximity_km: String(proximityKm)
    });
    return this.request(`/api/debris/nasa?${params.toString()}`, {}, `Loading NASA debris data for ${noradId}`);
  }

  // Image Classification
  async classifyImage(formData) {
    return this.request('/api/detect', {
      method: 'POST',
      body: formData,
      headers: {} // Let browser set content-type for FormData
    }, 'Classifying image');
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health', {}, 'Health check');
  }

  // Batch operations
  async batchRequests(requests) {
    const promises = requests.map(req => 
      this.request(req.endpoint, req.options, req.context, req.buttonKey)
        .catch(error => ({ error, request: req }))
    );
    
    return Promise.allSettled(promises);
  }

  // Helper methods for common patterns
  async loadTLEWithUI(group, displayName, icon, buttonKey) {
    try {
      this.errorHandler.log(`🌐 Loading ${displayName}...`);
      
      const data = await this.loadTLE('celestrak', group, buttonKey);
      
      this.errorHandler.showSuccess(`${icon} ${displayName} loaded: ${data.loaded} objects`);
      this.errorHandler.log(`✅ ${displayName} loaded successfully: ${data.loaded} objects`);
      
      // Refresh object list
      await this.refreshObjectsList();
      
      return data;
    } catch (error) {
      this.errorHandler.showError(`Failed to load ${displayName}: ${error.message}`);
      throw error;
    }
  }

  async refreshObjectsList() {
    try {
      const data = await this.getTLEObjects();
      
      const objectSelect = this.dom.get('objectSelect');
      if (objectSelect) {
        objectSelect.innerHTML = '<option value="">Select satellite...</option>';
        
        data.objects.forEach(obj => {
          const option = document.createElement('option');
          option.value = obj.norad_id;
          option.textContent = `${obj.norad_id} - ${obj.name}`;
          objectSelect.appendChild(option);
        });
      }
      
      this.errorHandler.log(`📡 Updated object list: ${data.objects.length} satellites`);
      return data;
    } catch (error) {
      this.errorHandler.showError(`Failed to refresh objects: ${error.message}`);
      throw error;
    }
  }

  async propagateOrbitWithUI(noradId, minutes, step, buttonKey = null) {
    try {
      if (!noradId) {
        throw new Error(CONFIG.ERRORS.NO_OBJECT_SELECTED);
      }

      this.errorHandler.log(`🛰️ Propagating orbit for ${noradId}...`);
      
      const propagation = await this.propagateOrbit(noradId, minutes, step);
      
      this.errorHandler.showSuccess(`Orbit propagated: ${propagation.samples.length} samples`);
      this.errorHandler.log(`✅ Propagation complete: ${propagation.samples.length} samples over ${minutes} minutes`);
      
      return propagation;
    } catch (error) {
      this.errorHandler.showError(`Orbit propagation failed: ${error.message}`);
      throw error;
    }
  }

  async calculateRiskWithUI(params, buttonKey = null) {
    try {
      this.errorHandler.log('📊 Calculating collision risk...');
      
      const riskData = await this.calculateRisk(params);
      
      const riskPercent = (riskData.collision_probability * 100).toFixed(4);
      this.errorHandler.showInfo(`Risk Level: ${riskData.risk_level} (${riskPercent}%)`);
      this.errorHandler.log(`📊 Risk analysis complete: ${riskData.risk_level} (${riskPercent}%)`);
      
      return riskData;
    } catch (error) {
      this.errorHandler.showError(`Risk calculation failed: ${error.message}`);
      throw error;
    }
  }

  async loadDebrisWithUI(noradId, buttonKey = null) {
    try {
      if (!noradId) {
        throw new Error(CONFIG.ERRORS.NO_OBJECT_SELECTED);
      }

      this.errorHandler.log(`🗑️ Loading NASA debris data for ${noradId}...`);
      
      const debrisData = await this.getNASADebris(noradId);
      
      this.errorHandler.showSuccess(`Loaded ${debrisData.debris_objects.length} debris objects`);
      this.errorHandler.log(`✅ Debris data loaded: ${debrisData.debris_objects.length} objects`);
      
      return debrisData;
    } catch (error) {
      this.errorHandler.showError(`Failed to load debris data: ${error.message}`);
      throw error;
    }
  }

  // Validation helpers
  validateFormInputs(requiredFields) {
    const values = this.dom.getFormValues(requiredFields);
    return this.errorHandler.validateRequired(values, requiredFields);
  }
}

// Create global API manager instance
const API = new APIManager(CONFIG.API_BASE_URL, ErrorManager, DOM);

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIManager;
}
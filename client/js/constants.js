// Application Constants and Configuration
const CONFIG = {
  // API Configuration
  API_BASE_URL: (() => {
    const { protocol, hostname, port } = window.location;

    // If served from backend (same origin), reuse it directly
    if (port && port !== '3000') {
      return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
    }

    // If running the static frontend on a separate dev server (e.g. 3000), hit backend on 8001
    if (port === '3000') {
      return `${protocol}//${hostname || 'localhost'}:8001`;
    }

    // Fallback for file:// or unknown hosts
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8001';
    }

    return `${protocol}//${hostname}`;
  })(),
  
  // Earth and Space Constants
  EARTH_RADIUS_KM: 6371,
  GRAVITATIONAL_PARAMETER: 398600, // km³/s²
  
  // Orbital Parameters
  LEO_ALTITUDE_MIN: 160,
  LEO_ALTITUDE_MAX: 2000,
  GEO_ALTITUDE: 35786,
  
  // Animation and Performance
  ANIMATION_SPEED_MULTIPLIER: 60,
  ORBIT_SAMPLE_POINTS: 60,
  MAX_DEBRIS_COUNT: 200,
  TRAIL_TIME_SECONDS: 3600,
  LEAD_TIME_SECONDS: 0,
  
  // Risk Analysis
  DEFAULT_PROXIMITY_KM: 1000,
  MAX_RELATIVE_VELOCITY: 10, // km/s for normalization
  RISK_DISTANCE_WEIGHT: 0.7,
  RISK_VELOCITY_WEIGHT: 0.3,
  
  // UI Animation Timings
  LOADING_ANIMATION_DURATION: 1000,
  BUTTON_ANIMATION_DURATION: 800,
  RESULT_DISPLAY_DURATION: 5000,
  SIDEBAR_TRANSITION_DURATION: 400,
  
  // Cesium Visualization
  DEFAULT_PIXEL_SIZE: 6,
  PATH_WIDTH: 2,
  LABEL_PIXEL_OFFSET_Y: -12,
  DEBRIS_SIZE_SMALL: 4,
  DEBRIS_SIZE_MEDIUM: 6,
  DEBRIS_SIZE_LARGE: 10,
  
  // NASA Risk Zones
  RISK_ZONE_OPACITY: {
    EXTREME: 0.8,
    HIGH: 0.6,
    MEDIUM: 0.4,
    LOW: 0.2
  },
  
  // Colors
  COLORS: {
    SATELLITE: '#00FFFF', // Cyan
    DEBRIS_LOW: '#00FF00', // Green
    DEBRIS_MEDIUM: '#FFFF00', // Yellow  
    DEBRIS_HIGH: '#FF6600', // Orange
    DEBRIS_EXTREME: '#FF0000', // Red
    TRAJECTORY: '#FFFF00', // Yellow
    DEBRIS_TRAJECTORY: '#FF0000', // Red
    LEO_ZONE: '#00FF0040', // Semi-transparent green
    RISK_ZONE_EXTREME: '#FF000080', // Semi-transparent red
    RISK_ZONE_HIGH: '#FF660080', // Semi-transparent orange
    RISK_ZONE_MEDIUM: '#FFFF0080', // Semi-transparent yellow
    RISK_ZONE_LOW: '#00FF0080' // Semi-transparent green
  },
  
  // TLE Data Sources
  TLE_SOURCES: {
    ACTIVE: 'active',
    WEATHER: 'weather', 
    SCIENCE: 'science',
    COMMUNICATIONS: 'communications',
    GPS: 'gps-ops',
    CELESTRAK: 'celestrak'
  },
  
  // Error Messages
  ERRORS: {
    NO_OBJECT_SELECTED: 'Please select an object from the list.',
    NO_PROPAGATION_DATA: 'Propagate orbit first to estimate average altitude.',
    TLE_LOAD_FAILED: 'TLE loading error. Check console for details.',
    API_CONNECTION_FAILED: 'Failed to connect to API server.',
    INVALID_PARAMETERS: 'Invalid parameters provided.',
    DEBRIS_LOAD_FAILED: 'Failed to load debris data.',
    RISK_CALCULATION_FAILED: 'Risk calculation failed.'
  },
  
  // Success Messages
  SUCCESS: {
    TLE_LOADED: 'TLE data loaded successfully',
    DEBRIS_LOADED: 'Debris data loaded and visualized',
    RISK_CALCULATED: 'Risk analysis completed',
    ORBIT_PROPAGATED: 'Orbit propagation successful'
  }
};

// Utility Functions for Constants
const UTILS = {
  // Convert degrees to radians
  degToRad: (degrees) => degrees * Math.PI / 180,
  
  // Convert radians to degrees  
  radToDeg: (radians) => radians * 180 / Math.PI,
  
  // Get orbital velocity at given radius
  getOrbitalVelocity: (radiusKm) => Math.sqrt(CONFIG.GRAVITATIONAL_PARAMETER / radiusKm),
  
  // Calculate distance between two 3D points
  calculateDistance3D: (x1, y1, z1, x2, y2, z2) => 
    Math.sqrt((x1 - x2)**2 + (y1 - y2)**2 + (z1 - z2)**2),
  
  // Convert spherical to cartesian coordinates
  sphericalToCartesian: (lat, lon, alt) => {
    const r = CONFIG.EARTH_RADIUS_KM + alt;
    const latRad = UTILS.degToRad(lat);
    const lonRad = UTILS.degToRad(lon);
    
    return {
      x: r * Math.cos(latRad) * Math.cos(lonRad),
      y: r * Math.cos(latRad) * Math.sin(lonRad), 
      z: r * Math.sin(latRad)
    };
  },
  
  // Get debris color based on threat level
  getDebrisColor: (rcsSize) => {
    switch(rcsSize?.toUpperCase()) {
      case 'SMALL': return CONFIG.COLORS.DEBRIS_LOW;
      case 'MEDIUM': return CONFIG.COLORS.DEBRIS_MEDIUM; 
      case 'LARGE': return CONFIG.COLORS.DEBRIS_HIGH;
      default: return CONFIG.COLORS.DEBRIS_MEDIUM;
    }
  },
  
  // Get debris size based on RCS
  getDebrisSize: (rcsSize) => {
    switch(rcsSize?.toUpperCase()) {
      case 'SMALL': return CONFIG.DEBRIS_SIZE_SMALL;
      case 'MEDIUM': return CONFIG.DEBRIS_SIZE_MEDIUM;
      case 'LARGE': return CONFIG.DEBRIS_SIZE_LARGE;
      default: return CONFIG.DEBRIS_SIZE_MEDIUM;
    }
  },
  
  // Format time for logging
  formatTime: () => new Date().toISOString().replace('T', ' ').replace('Z', ''),
  
  // Clamp value between min and max
  clamp: (value, min, max) => Math.min(Math.max(value, min), max)
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG, UTILS };
}
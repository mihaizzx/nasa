// Unified Error Handling and Notification System
class ErrorHandler {
  constructor() {
    this.logElement = null;
    this.notificationContainer = null;
    this.setupNotificationContainer();
  }

  // Initialize with DOM elements
  init(logElement) {
    this.logElement = logElement;
  }

  // Setup notification container for toast messages
  setupNotificationContainer() {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'notification-container';
      container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    this.notificationContainer = container;
  }

  // Log message to console and UI
  log(message, level = 'info') {
    const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '');
    const logMessage = `[${timestamp}] ${message}`;
    
    // Console logging with appropriate level
    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    // UI logging
    if (this.logElement) {
      this.logElement.innerText = `${logMessage}\n` + this.logElement.innerText;
    }
  }

  // Handle API errors consistently
  async handleApiError(response, context = '') {
    let errorMessage = '';
    
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || `API Error: ${response.status}`;
      } else {
        errorMessage = await response.text() || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (parseError) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    const fullMessage = context ? `${context}: ${errorMessage}` : errorMessage;
    this.showError(fullMessage);
    this.log(fullMessage, 'error');
    
    return new Error(fullMessage);
  }

  // Handle JavaScript errors
  handleJsError(error, context = '') {
    const message = context ? `${context}: ${error.message}` : error.message;
    this.showError(message);
    this.log(`${message}\nStack: ${error.stack}`, 'error');
    console.error('JS Error:', error);
  }

  // Handle validation errors
  handleValidationError(field, message) {
    const errorMsg = `Validation Error - ${field}: ${message}`;
    this.showWarning(errorMsg);
    this.log(errorMsg, 'warn');
  }

  // Show success notification
  showSuccess(message, duration = 3000) {
    this.showNotification(message, 'success', duration);
    this.log(message, 'info');
  }

  // Show info notification
  showInfo(message, duration = 3000) {
    this.showNotification(message, 'info', duration);
    this.log(message, 'info');
  }

  // Show warning notification
  showWarning(message, duration = 4000) {
    this.showNotification(message, 'warning', duration);
    this.log(message, 'warn');
  }

  // Show error notification
  showError(message, duration = 5000) {
    this.showNotification(message, 'error', duration);
    this.log(message, 'error');
  }

  // Generic notification system
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      margin-bottom: 10px;
      padding: 12px 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      color: white;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      max-width: 100%;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      pointer-events: auto;
      cursor: pointer;
      position: relative;
      overflow: hidden;
    `;

    // Set background color based on type
    const colors = {
      success: 'linear-gradient(135deg, #4CAF50, #45a049)',
      info: 'linear-gradient(135deg, #2196F3, #1976D2)',
      warning: 'linear-gradient(135deg, #FF9800, #F57C00)',
      error: 'linear-gradient(135deg, #F44336, #D32F2F)'
    };
    notification.style.background = colors[type] || colors.info;

    // Add icon based on type
    const icons = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌'
    };
    
    notification.innerHTML = `
      <span style="margin-right: 8px; font-size: 16px;">${icons[type] || icons.info}</span>
      <span>${message}</span>
    `;

    // Add click to dismiss
    notification.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Add to container
    this.notificationContainer.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    // Auto remove after duration
    setTimeout(() => {
      this.removeNotification(notification);
    }, duration);

    return notification;
  }

  // Remove notification with animation
  removeNotification(notification) {
    if (notification && notification.parentNode) {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  // Try-catch wrapper for async functions
  async tryAsync(asyncFn, context = '', fallbackValue = null) {
    try {
      return await asyncFn();
    } catch (error) {
      this.handleJsError(error, context);
      return fallbackValue;
    }
  }

  // Try-catch wrapper for sync functions
  try(fn, context = '', fallbackValue = null) {
    try {
      return fn();
    } catch (error) {
      this.handleJsError(error, context);
      return fallbackValue;
    }
  }

  // Fetch wrapper with error handling
  async fetchWithErrorHandling(url, options = {}, context = '') {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw await this.handleApiError(response, context);
      }
      
      return response;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        const networkError = `Network error: Unable to connect to ${url}`;
        this.showError(networkError);
        this.log(networkError, 'error');
        throw new Error(networkError);
      }
      throw error;
    }
  }

  // Validate required fields
  validateRequired(values, requiredFields) {
    const missing = [];
    requiredFields.forEach(field => {
      if (!values[field] || values[field].toString().trim() === '') {
        missing.push(field);
      }
    });

    if (missing.length > 0) {
      const message = `Required fields missing: ${missing.join(', ')}`;
      this.handleValidationError('Form', message);
      return false;
    }
    return true;
  }

  // Clear all notifications
  clearNotifications() {
    if (this.notificationContainer) {
      this.notificationContainer.innerHTML = '';
    }
  }

  // Setup global error handlers
  setupGlobalHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleJsError(event.reason, 'Unhandled Promise Rejection');
      event.preventDefault();
    });

    // Handle general JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleJsError(event.error || new Error(event.message), 'Global Error');
    });
  }
}

// Create global error handler instance
const ErrorManager = new ErrorHandler();

// Setup global error handlers when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ErrorManager.setupGlobalHandlers();
  });
} else {
  ErrorManager.setupGlobalHandlers();
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorHandler;
}
/**
 * Utility to highlight auto-filled form fields with a light yellow background
 * Will find all form elements related to the specified field names
 */
export const highlightAutoFilledInputs = (fields: Record<string, any>) => {
  // Give the DOM a moment to ensure all fields are rendered
  setTimeout(() => {
    // Create an array of field names to highlight
    const fieldNames = Object.keys(fields).filter(key => fields[key] !== undefined && fields[key] !== null);
    
    // Find all inputs with names matching our fields
    fieldNames.forEach(field => {
      const elements = document.querySelectorAll(`[name="${field}"]`);
      elements.forEach(el => {
        // Add custom styling for highlighted fields
        if (el instanceof HTMLElement) {
          el.style.backgroundColor = '#fffbcc'; // Light yellow background
          
          // Add an event listener to clear highlight on user interaction
          const clearHighlight = () => {
            el.style.backgroundColor = '';
            // Remove the event listeners after first interaction
            el.removeEventListener('input', clearHighlight);
            el.removeEventListener('change', clearHighlight);
          };
          
          el.addEventListener('input', clearHighlight);
          el.addEventListener('change', clearHighlight);
        }
      });
    });
  }, 100);
};

/**
 * Reset highlights on all form fields (useful when navigating away)
 */
export const resetFormHighlights = () => {
  const highlightedElements = document.querySelectorAll('input[style*="background-color: rgb(255, 251, 204)"], select[style*="background-color: rgb(255, 251, 204)"], textarea[style*="background-color: rgb(255, 251, 204)"]');
  
  highlightedElements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.backgroundColor = '';
    }
  });
};

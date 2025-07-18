
/**
 * Utility to highlight auto-filled form fields with a light yellow background
 * Will find all form elements related to the specified field names
 */
export const highlightAutoFilledInputs = (fields: Record<string, any>) => {
  // Give the DOM a moment to ensure all fields are rendered
  setTimeout(() => {
    // Create an array of field names to highlight (only non-empty values)
    const fieldNames = Object.keys(fields).filter(key => {
      const value = fields[key];
      return value !== undefined && value !== null && value !== '';
    });

    console.log('Highlighting fields:', fieldNames);

    // Find all inputs with names matching our fields
    fieldNames.forEach(field => {
      const elements = document.querySelectorAll(`[name="${field}"]`);
      console.log(`Found ${elements.length} elements for field: ${field}`);

      elements.forEach(el => {
        // Add custom styling for highlighted fields
        if (el instanceof HTMLElement) {
          el.style.backgroundColor = '#fffbcc'; // Light yellow background
          el.style.transition = 'background-color 0.3s ease';

          // Add an event listener to clear highlight on user interaction
          const clearHighlight = () => {
            el.style.backgroundColor = '';
            // Remove the event listeners after first interaction
            el.removeEventListener('input', clearHighlight);
            el.removeEventListener('change', clearHighlight);
            el.removeEventListener('focus', clearHighlight);
          };

          el.addEventListener('input', clearHighlight);
          el.addEventListener('change', clearHighlight);
          el.addEventListener('focus', clearHighlight);
        }
      });
    });
  }, 200); // Increased timeout to ensure DOM is ready
};

/**
 * Reset highlights on all form fields (useful when navigating away)
 */
export const resetFormHighlights = () => {
  const highlightedElements = document.querySelectorAll('input[style*="background-color"], select[style*="background-color"], textarea[style*="background-color"]');

  highlightedElements.forEach(el => {
    if (el instanceof HTMLElement && el.style.backgroundColor === 'rgb(255, 251, 204)') {
      el.style.backgroundColor = '';
    }
  });
};

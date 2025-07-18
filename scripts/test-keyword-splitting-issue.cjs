// Test the current keyword splitting issue
const { v4: uuidv4 } = require('uuid');

// Current broken splitting function
function currentSplitKeywords(text, category) {
  if (!text || !text.trim()) return [];
  
  const normalizedText = text.trim();
  let items = [];
  
  // This is the PROBLEM - using else if means only one delimiter type is checked
  if (normalizedText.includes(',')) {
    items = normalizedText.split(',');
  } else if (normalizedText.includes(';')) {
    items = normalizedText.split(';');
  } else if (normalizedText.includes('|')) {
    items = normalizedText.split('|');
  } else if (normalizedText.includes('/') && !normalizedText.includes('http')) {
    items = normalizedText.split('/');
  } else if (normalizedText.includes(' and ')) {
    items = normalizedText.split(' and ');
  } else if (normalizedText.includes(' & ')) {
    items = normalizedText.split(' & ');
  } else {
    items = [normalizedText];
  }
  
  return items
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .map(item => ({
      id: uuidv4(),
      name: item.charAt(0).toUpperCase() + item.slice(1),
      type: category
    }));
}

// Fixed splitting function
function fixedSplitKeywords(text, category) {
  if (!text || !text.trim()) return [];
  
  let normalizedText = text.trim();
  
  // Apply ALL delimiters in sequence, not just one
  normalizedText = normalizedText
    .replace(/\s*[,;|]\s*/g, '|||') // Replace commas, semicolons, pipes with temporary delimiter
    .replace(/\s+and\s+/gi, '|||')  // Replace " and " with temporary delimiter
    .replace(/\s*&\s*/g, '|||')     // Replace " & " with temporary delimiter
    .replace(/\s*\/\s*/g, '|||');   // Replace " / " with temporary delimiter (but not URLs)
  
  // Split on our temporary delimiter
  const items = normalizedText
    .split('|||')
    .map(item => item.trim())
    .filter(item => item.length > 0)
    .filter(item => !item.includes('http')); // Remove any URLs that got split
  
  return items.map(item => ({
    id: uuidv4(),
    name: item.charAt(0).toUpperCase() + item.slice(1),
    type: category
  }));
}

// Test cases that demonstrate the problem
const testCases = [
  "JavaScript, React, Node.js",
  "Python; Django; Flask",
  "Java | Spring | Hibernate", 
  "HTML and CSS and JavaScript",
  "React & Redux & Node.js",
  "Frontend / Backend / Full Stack",
  "JavaScript, React; Node.js | Express and MongoDB",  // Mixed delimiters - this is the key test!
  "Project Management, Team Leadership; Quality Assurance | Process Improvement and Agile Methodology"
];

console.log('=== Testing Keyword Splitting Issue ===\n');

testCases.forEach((testCase, index) => {
  console.log(`--- Test Case ${index + 1}: "${testCase}" ---`);
  
  const currentResult = currentSplitKeywords(testCase, 'skill');
  const fixedResult = fixedSplitKeywords(testCase, 'skill');
  
  console.log(`Current (broken): ${currentResult.length} keywords`);
  currentResult.forEach((k, i) => console.log(`  ${i + 1}. "${k.name}"`));
  
  console.log(`Fixed: ${fixedResult.length} keywords`);
  fixedResult.forEach((k, i) => console.log(`  ${i + 1}. "${k.name}"`));
  
  console.log('');
});
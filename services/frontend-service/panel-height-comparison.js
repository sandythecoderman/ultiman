// Panel Height Comparison Script
// Run this in browser console on both Knowledge Base and Workflow pages

console.log('🔍 Panel Height Comparison Tool');
console.log('================================');

// Function to get panel dimensions
function getPanelDimensions() {
  const container = document.querySelector('.kb-container, .wf-container');
  const leftPanel = document.querySelector('.kb-left-panel, .wf-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel, .wf-right-panel');
  
  const pageType = document.querySelector('.kb-container') ? 'Knowledge Base' : 'Workflow';
  
  console.log(`\n📊 ${pageType} Page Analysis:`);
  
  if (container) {
    const rect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    console.log(`✅ Container:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - Display: ${style.display}`);
    console.log(`   - Position: ${style.position}`);
    console.log(`   - Height: ${style.height}`);
  }
  
  if (leftPanel) {
    const rect = leftPanel.getBoundingClientRect();
    const style = getComputedStyle(leftPanel);
    console.log(`✅ Left Panel:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Bottom: ${style.bottom}`);
  }
  
  if (rightPanel) {
    const rect = rightPanel.getBoundingClientRect();
    const style = getComputedStyle(rightPanel);
    console.log(`✅ Right Panel:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Bottom: ${style.bottom}`);
  }
  
  return {
    pageType,
    container: container ? container.getBoundingClientRect() : null,
    leftPanel: leftPanel ? leftPanel.getBoundingClientRect() : null,
    rightPanel: rightPanel ? rightPanel.getBoundingClientRect() : null
  };
}

// Function to compare with stored results
function compareWithStored() {
  const current = getPanelDimensions();
  
  if (window.panelComparisonResults) {
    const stored = window.panelComparisonResults;
    const otherPage = stored.pageType === 'Knowledge Base' ? 'Workflow' : 'Knowledge Base';
    
    console.log(`\n📊 Comparison with ${otherPage} Page:`);
    
    if (current.leftPanel && stored.leftPanel) {
      const heightDiff = Math.abs(current.leftPanel.height - stored.leftPanel.height);
      console.log(`Left Panel Height Difference: ${heightDiff}px`);
      console.log(`  - ${current.pageType}: ${current.leftPanel.height}px`);
      console.log(`  - ${stored.pageType}: ${stored.leftPanel.height}px`);
      console.log(`  - Match: ${heightDiff < 5 ? '✅' : '❌'}`);
    }
    
    if (current.rightPanel && stored.rightPanel) {
      const heightDiff = Math.abs(current.rightPanel.height - stored.rightPanel.height);
      console.log(`Right Panel Height Difference: ${heightDiff}px`);
      console.log(`  - ${current.pageType}: ${current.rightPanel.height}px`);
      console.log(`  - ${stored.pageType}: ${stored.rightPanel.height}px`);
      console.log(`  - Match: ${heightDiff < 5 ? '✅' : '❌'}`);
    }
    
    if (current.container && stored.container) {
      const heightDiff = Math.abs(current.container.height - stored.container.height);
      console.log(`Container Height Difference: ${heightDiff}px`);
      console.log(`  - ${current.pageType}: ${current.container.height}px`);
      console.log(`  - ${stored.pageType}: ${stored.container.height}px`);
      console.log(`  - Match: ${heightDiff < 5 ? '✅' : '❌'}`);
    }
  } else {
    console.log('\n💡 No stored results found. Run this script on the other page to compare.');
  }
}

// Function to store current results
function storeResults() {
  window.panelComparisonResults = getPanelDimensions();
  console.log('\n💾 Results stored for comparison');
  console.log('💡 Navigate to the other page and run panelComparison.compareWithStored()');
}

// Function to clear stored results
function clearStored() {
  delete window.panelComparisonResults;
  console.log('\n🗑️ Stored results cleared');
}

// Function to highlight panels
function highlightPanels() {
  const leftPanel = document.querySelector('.kb-left-panel, .wf-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel, .wf-right-panel');
  const container = document.querySelector('.kb-container, .wf-container');
  
  if (leftPanel) {
    leftPanel.style.outline = '3px solid red';
    leftPanel.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  }
  
  if (rightPanel) {
    rightPanel.style.outline = '3px solid blue';
    rightPanel.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
  }
  
  if (container) {
    container.style.outline = '3px solid green';
    container.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
  }
  
  console.log('🎨 Panels highlighted:');
  console.log('   - Red: Left panel');
  console.log('   - Blue: Right panel');
  console.log('   - Green: Container');
}

// Function to remove highlights
function removeHighlights() {
  const panels = document.querySelectorAll('.kb-left-panel, .kb-right-panel, .kb-container, .wf-left-panel, .wf-right-panel, .wf-container');
  panels.forEach(panel => {
    panel.style.outline = '';
    panel.style.backgroundColor = '';
  });
  console.log('🎨 Highlights removed');
}

// Auto-run analysis
const currentResults = getPanelDimensions();

// Export functions for manual use
window.panelComparison = {
  getPanelDimensions,
  compareWithStored,
  storeResults,
  clearStored,
  highlightPanels,
  removeHighlights,
  currentResults
};

console.log('\n💡 Available commands:');
console.log('   panelComparison.getPanelDimensions() - Get current page dimensions');
console.log('   panelComparison.storeResults() - Store current results for comparison');
console.log('   panelComparison.compareWithStored() - Compare with stored results');
console.log('   panelComparison.clearStored() - Clear stored results');
console.log('   panelComparison.highlightPanels() - Highlight panels with colors');
console.log('   panelComparison.removeHighlights() - Remove highlights');

console.log('\n📋 Instructions:');
console.log('1. Run this script on Knowledge Base page');
console.log('2. Run panelComparison.storeResults()');
console.log('3. Navigate to Workflow page');
console.log('4. Run this script again');
console.log('5. Run panelComparison.compareWithStored()');

console.log('\n✅ Panel comparison tool ready!'); 
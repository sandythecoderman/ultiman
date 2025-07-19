// Panel Debug Script - Run this in browser console on Knowledge Base page
console.log('🔍 Knowledge Base Panel Debug Script');
console.log('=====================================');

// Function to inspect panels
function inspectPanels() {
  const container = document.querySelector('.kb-container');
  const leftPanel = document.querySelector('.kb-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel');
  const mainArea = document.querySelector('.kb-main-area');
  const toolbar = document.querySelector('.kb-toolbar');
  
  console.log('\n📊 Container Analysis:');
  if (container) {
    const rect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    console.log(`✅ Container found:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - Display: ${style.display}`);
    console.log(`   - Position: ${style.position}`);
    console.log(`   - Height: ${style.height}`);
  } else {
    console.log('❌ Container not found');
  }
  
  console.log('\n📊 Left Panel Analysis:');
  if (leftPanel) {
    const rect = leftPanel.getBoundingClientRect();
    const style = getComputedStyle(leftPanel);
    console.log(`✅ Left panel found:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Width: ${style.width}`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Left: ${style.left}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  } else {
    console.log('❌ Left panel not found');
  }
  
  console.log('\n📊 Right Panel Analysis:');
  if (rightPanel) {
    const rect = rightPanel.getBoundingClientRect();
    const style = getComputedStyle(rightPanel);
    console.log(`✅ Right panel found:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Width: ${style.width}`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Right: ${style.right}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  } else {
    console.log('❌ Right panel not found');
  }
  
  console.log('\n📊 Main Area Analysis:');
  if (mainArea) {
    const rect = mainArea.getBoundingClientRect();
    const style = getComputedStyle(mainArea);
    console.log(`✅ Main area found:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  } else {
    console.log('❌ Main area not found');
  }
  
  console.log('\n📊 Toolbar Analysis:');
  if (toolbar) {
    const rect = toolbar.getBoundingClientRect();
    const style = getComputedStyle(toolbar);
    console.log(`✅ Toolbar found:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  } else {
    console.log('❌ Toolbar not found');
  }
  
  console.log('\n📱 Viewport Analysis:');
  console.log(`   - Viewport: ${window.innerWidth}px × ${window.innerHeight}px`);
  console.log(`   - Document: ${document.documentElement.clientWidth}px × ${document.documentElement.clientHeight}px`);
  
  console.log('\n🔍 Layout Issues Check:');
  const issues = [];
  
  if (leftPanel && rightPanel) {
    const leftRect = leftPanel.getBoundingClientRect();
    const rightRect = rightPanel.getBoundingClientRect();
    
    // Check if panels extend beyond viewport
    if (leftRect.left < 0) issues.push('Left panel extends beyond left edge');
    if (rightRect.right > window.innerWidth) issues.push('Right panel extends beyond right edge');
    if (leftRect.top < 0) issues.push('Left panel extends beyond top edge');
    if (rightRect.top < 0) issues.push('Right panel extends beyond top edge');
    
    // Check if panels overlap
    if (leftRect.right > rightRect.left) issues.push('Panels overlap horizontally');
    
    // Check if panels are too small
    if (leftRect.width < 200) issues.push('Left panel seems too narrow');
    if (rightRect.width < 200) issues.push('Right panel seems too narrow');
  }
  
  if (issues.length > 0) {
    console.log('⚠️ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  } else {
    console.log('✅ No obvious layout issues detected');
  }
  
  console.log('\n🎨 Visual Debug:');
  console.log('   - Left panel should be visible on the left side');
  console.log('   - Right panel should be visible on the right side');
  console.log('   - Main area should be in the center');
  console.log('   - Toolbar should be floating at the top center');
  
  return {
    container: container ? container.getBoundingClientRect() : null,
    leftPanel: leftPanel ? leftPanel.getBoundingClientRect() : null,
    rightPanel: rightPanel ? rightPanel.getBoundingClientRect() : null,
    mainArea: mainArea ? mainArea.getBoundingClientRect() : null,
    toolbar: toolbar ? toolbar.getBoundingClientRect() : null,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    issues: issues
  };
}

// Function to highlight panels for visual debugging
function highlightPanels() {
  const leftPanel = document.querySelector('.kb-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel');
  const mainArea = document.querySelector('.kb-main-area');
  
  if (leftPanel) {
    leftPanel.style.outline = '3px solid red';
    leftPanel.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  }
  
  if (rightPanel) {
    rightPanel.style.outline = '3px solid blue';
    rightPanel.style.backgroundColor = 'rgba(0, 0, 255, 0.1)';
  }
  
  if (mainArea) {
    mainArea.style.outline = '3px solid green';
    mainArea.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
  }
  
  console.log('🎨 Panels highlighted:');
  console.log('   - Red outline: Left panel');
  console.log('   - Blue outline: Right panel');
  console.log('   - Green outline: Main area');
}

// Function to remove highlights
function removeHighlights() {
  const panels = document.querySelectorAll('.kb-left-panel, .kb-right-panel, .kb-main-area');
  panels.forEach(panel => {
    panel.style.outline = '';
    panel.style.backgroundColor = '';
  });
  console.log('🎨 Highlights removed');
}

// Auto-run inspection
const results = inspectPanels();

// Export functions for manual use
window.panelDebug = {
  inspectPanels,
  highlightPanels,
  removeHighlights,
  results
};

console.log('\n💡 Manual commands available:');
console.log('   panelDebug.inspectPanels() - Run inspection again');
console.log('   panelDebug.highlightPanels() - Highlight panels with colors');
console.log('   panelDebug.removeHighlights() - Remove highlights');
console.log('   panelDebug.results - View inspection results');

console.log('\n✅ Panel debug script completed!'); 
// Panel Comparison Script - Compare Knowledge Base vs Workflow panels
console.log('🔍 Panel Comparison: Knowledge Base vs Workflow');
console.log('================================================');

// Function to get panel dimensions
function getPanelDimensions() {
  const container = document.querySelector('.kb-container, .wf-container');
  const leftPanel = document.querySelector('.kb-left-panel, .wf-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel, .wf-right-panel');
  const mainArea = document.querySelector('.kb-main-area, .wf-main-area');
  
  const isKnowledgeBase = document.querySelector('.kb-container') !== null;
  const pageType = isKnowledgeBase ? 'Knowledge Base' : 'Workflow';
  
  console.log(`\n📊 ${pageType} Page Analysis:`);
  console.log('================================');
  
  if (container) {
    const rect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    console.log(`✅ Container:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - Display: ${style.display}`);
    console.log(`   - Position: ${style.position}`);
    console.log(`   - Height: ${style.height}`);
    console.log(`   - Width: ${style.width}`);
  }
  
  if (leftPanel) {
    const rect = leftPanel.getBoundingClientRect();
    const style = getComputedStyle(leftPanel);
    console.log(`\n✅ Left Panel:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Width: ${style.width}`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Left: ${style.left}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  }
  
  if (rightPanel) {
    const rect = rightPanel.getBoundingClientRect();
    const style = getComputedStyle(rightPanel);
    console.log(`\n✅ Right Panel:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Width: ${style.width}`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - CSS Top: ${style.top}`);
    console.log(`   - CSS Right: ${style.right}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  }
  
  if (mainArea) {
    const rect = mainArea.getBoundingClientRect();
    const style = getComputedStyle(mainArea);
    console.log(`\n✅ Main Area:`);
    console.log(`   - Size: ${rect.width}px × ${rect.height}px`);
    console.log(`   - Position: (${rect.x}, ${rect.y})`);
    console.log(`   - CSS Position: ${style.position}`);
    console.log(`   - CSS Width: ${style.width}`);
    console.log(`   - CSS Height: ${style.height}`);
    console.log(`   - Z-Index: ${style.zIndex}`);
  }
  
  console.log(`\n📱 Viewport: ${window.innerWidth}px × ${window.innerHeight}px`);
  
  return {
    pageType,
    container: container ? container.getBoundingClientRect() : null,
    leftPanel: leftPanel ? leftPanel.getBoundingClientRect() : null,
    rightPanel: rightPanel ? rightPanel.getBoundingClientRect() : null,
    mainArea: mainArea ? mainArea.getBoundingClientRect() : null,
    viewport: { width: window.innerWidth, height: window.innerHeight }
  };
}

// Function to highlight panels
function highlightPanels() {
  const leftPanel = document.querySelector('.kb-left-panel, .wf-left-panel');
  const rightPanel = document.querySelector('.kb-right-panel, .wf-right-panel');
  const mainArea = document.querySelector('.kb-main-area, .wf-main-area');
  
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
  const panels = document.querySelectorAll('.kb-left-panel, .kb-right-panel, .kb-main-area, .wf-left-panel, .wf-right-panel, .wf-main-area');
  panels.forEach(panel => {
    panel.style.outline = '';
    panel.style.backgroundColor = '';
  });
  console.log('🎨 Highlights removed');
}

// Function to adjust Knowledge Base panels to match Workflow
function adjustKnowledgeBasePanels() {
  console.log('\n🔧 Adjusting Knowledge Base panels to match Workflow...');
  
  const kbContainer = document.querySelector('.kb-container');
  const kbLeftPanel = document.querySelector('.kb-left-panel');
  const kbRightPanel = document.querySelector('.kb-right-panel');
  const kbMainArea = document.querySelector('.kb-main-area');
  
  if (!kbContainer || !kbLeftPanel || !kbRightPanel || !kbMainArea) {
    console.log('❌ Required Knowledge Base elements not found');
    return;
  }
  
  // Get current dimensions
  const containerRect = kbContainer.getBoundingClientRect();
  const leftRect = kbLeftPanel.getBoundingClientRect();
  const rightRect = kbRightPanel.getBoundingClientRect();
  const mainRect = kbMainArea.getBoundingClientRect();
  
  console.log('Current Knowledge Base dimensions:');
  console.log(`  - Container: ${containerRect.width}px × ${containerRect.height}px`);
  console.log(`  - Left Panel: ${leftRect.width}px × ${leftRect.height}px`);
  console.log(`  - Right Panel: ${rightRect.width}px × ${rightRect.height}px`);
  console.log(`  - Main Area: ${mainRect.width}px × ${mainRect.height}px`);
  
  // Calculate the target height (same as container height)
  const targetHeight = containerRect.height;
  
  // Apply the height to panels
  kbLeftPanel.style.height = `${targetHeight}px`;
  kbRightPanel.style.height = `${targetHeight}px`;
  
  console.log(`✅ Applied height: ${targetHeight}px to both panels`);
  
  // Force a reflow to see the changes
  kbLeftPanel.offsetHeight;
  kbRightPanel.offsetHeight;
  
  // Get updated dimensions
  const newLeftRect = kbLeftPanel.getBoundingClientRect();
  const newRightRect = kbRightPanel.getBoundingClientRect();
  
  console.log('Updated Knowledge Base dimensions:');
  console.log(`  - Left Panel: ${newLeftRect.width}px × ${newLeftRect.height}px`);
  console.log(`  - Right Panel: ${newRightRect.width}px × ${newRightRect.height}px`);
  
  return {
    originalHeight: leftRect.height,
    newHeight: newLeftRect.height,
    containerHeight: targetHeight
  };
}

// Function to apply Workflow-style layout to Knowledge Base
function applyWorkflowLayout() {
  console.log('\n🔧 Applying Workflow-style layout to Knowledge Base...');
  
  const kbContainer = document.querySelector('.kb-container');
  const kbLeftPanel = document.querySelector('.kb-left-panel');
  const kbRightPanel = document.querySelector('.kb-right-panel');
  const kbMainArea = document.querySelector('.kb-main-area');
  
  if (!kbContainer || !kbLeftPanel || !kbRightPanel || !kbMainArea) {
    console.log('❌ Required Knowledge Base elements not found');
    return;
  }
  
  // Apply Workflow-style container layout
  kbContainer.style.display = 'flex';
  kbContainer.style.gap = '1rem';
  kbContainer.style.padding = '1rem';
  kbContainer.style.height = 'calc(100vh - 70px)';
  kbContainer.style.alignItems = 'stretch';
  kbContainer.style.justifyContent = 'flex-start';
  
  // Apply Workflow-style panel layout
  kbLeftPanel.style.position = 'static';
  kbLeftPanel.style.top = 'auto';
  kbLeftPanel.style.left = 'auto';
  kbLeftPanel.style.bottom = 'auto';
  kbLeftPanel.style.width = '320px';
  kbLeftPanel.style.height = '100%';
  kbLeftPanel.style.flexShrink = '0';
  
  kbRightPanel.style.position = 'static';
  kbRightPanel.style.top = 'auto';
  kbRightPanel.style.right = 'auto';
  kbRightPanel.style.bottom = 'auto';
  kbRightPanel.style.width = '280px';
  kbRightPanel.style.height = '100%';
  kbRightPanel.style.flexShrink = '0';
  
  // Apply Workflow-style main area layout
  kbMainArea.style.position = 'static';
  kbMainArea.style.top = 'auto';
  kbMainArea.style.left = 'auto';
  kbMainArea.style.right = 'auto';
  kbMainArea.style.bottom = 'auto';
  kbMainArea.style.flex = '1';
  kbMainArea.style.minWidth = '0';
  kbMainArea.style.border = '1px solid var(--border-color)';
  kbMainArea.style.borderRadius = '12px';
  kbMainArea.style.boxShadow = '0 4px 6px -1px var(--shadow-color), 0 2px 4px -1px var(--shadow-color)';
  kbMainArea.style.overflow = 'hidden';
  
  console.log('✅ Applied Workflow-style layout');
  
  // Force reflow
  kbContainer.offsetHeight;
  
  return {
    containerStyle: getComputedStyle(kbContainer),
    leftPanelStyle: getComputedStyle(kbLeftPanel),
    rightPanelStyle: getComputedStyle(kbRightPanel),
    mainAreaStyle: getComputedStyle(kbMainArea)
  };
}

// Auto-run analysis
const currentPage = getPanelDimensions();

// Export functions
window.panelComparison = {
  getPanelDimensions,
  highlightPanels,
  removeHighlights,
  adjustKnowledgeBasePanels,
  applyWorkflowLayout,
  currentPage
};

console.log('\n💡 Available commands:');
console.log('   panelComparison.getPanelDimensions() - Analyze current page');
console.log('   panelComparison.highlightPanels() - Highlight panels with colors');
console.log('   panelComparison.removeHighlights() - Remove highlights');
console.log('   panelComparison.adjustKnowledgeBasePanels() - Adjust KB panel heights');
console.log('   panelComparison.applyWorkflowLayout() - Apply Workflow layout to KB');
console.log('   panelComparison.currentPage - View current page analysis');

console.log('\n📋 Instructions:');
console.log('1. Run this script on Knowledge Base page first');
console.log('2. Note the panel dimensions');
console.log('3. Navigate to Workflow page and run again');
console.log('4. Compare the dimensions');
console.log('5. Go back to Knowledge Base and run adjustKnowledgeBasePanels()');
console.log('6. Or run applyWorkflowLayout() for full Workflow-style layout');

console.log('\n✅ Panel comparison script ready!'); 
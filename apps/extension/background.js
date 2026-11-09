// Click the toolbar button: inject the detector, the rule names and the overlay into the current tab. activeTab
// grants access to that tab for this click only, so the extension asks for no host permissions.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['detect.js', 'rules.js', 'overlay.js'] });
});

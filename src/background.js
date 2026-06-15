chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: tab.id },
      files: ["src/styles.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["src/parser.js", "src/insights.js", "src/content.js"]
    });
    await chrome.tabs.sendMessage(tab.id, { type: "NOON_OPS_TOGGLE" });
  } catch (error) {
    console.warn("Noon Sales Ops Copilot could not open on this page.", error);
  }
});

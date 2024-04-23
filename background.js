chrome.runtime.onInstalled.addListener(() => {
    console.log('uwu')
    chrome.action.setBadgeText({
        text: "OFF",
    });
});

const extensions = 'https://developer.chrome.com/docs/extensions'
const webstore = 'https://developer.chrome.com/docs/webstore'

chrome.action.onClicked.addListener(async (tab) => {
    console.log('aga')
    await chrome.action.setBadgeText({
        text: 'ON',
    });
});
/*
 * @Author: xiawang1024
 * @Date: 2025-03-08 11:13:26
 * @LastEditTime: 2025-03-08 11:14:11
 * @LastEditors: xiawang1024
 * @Description: 
 * @FilePath: /demo/background.js
 * 工作，生活，健康
 */
// 后台脚本，主要用于处理扩展生命周期事件和消息传递
chrome.runtime.onInstalled.addListener(() => {
    // 初始化存储
    chrome.storage.sync.get(['tokens', 'buttonPosition', 'switchTimes'], function (result) {
        if (!result.tokens) {
            chrome.storage.sync.set({ tokens: [] });
        }

        if (!result.buttonPosition) {
            chrome.storage.sync.set({
                buttonPosition: {
                    left: 10,
                    bottom: 10
                }
            });
        }

        if (!result.switchTimes) {
            chrome.storage.sync.set({ switchTimes: {} });
        }
    });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "autoLogin") {
        // 处理自动登录请求
        const token = message.token;
        const url = message.url;

        // 更新使用时间
        chrome.storage.sync.get(['switchTimes'], function (result) {
            const switchTimes = result.switchTimes || {};
            switchTimes[message.name] = new Date().toLocaleString('zh-CN');
            chrome.storage.sync.set({ switchTimes: switchTimes });
        });

        // 如果消息来自内容脚本，我们可能需要重定向当前标签页
        if (sender.tab) {
            chrome.tabs.update(sender.tab.id, { url: url });
        }

        sendResponse({ success: true });
        return true;
    }
});
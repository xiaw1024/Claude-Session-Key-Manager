document.addEventListener('DOMContentLoaded', function () {
    const tokenList = document.getElementById('tokenList');
    const addTokenButton = document.getElementById('addTokenButton');
    const optionsLink = document.getElementById('optionsLink');

    // 加载令牌列表
    function loadTokens() {
        chrome.storage.sync.get(['tokens', 'switchTimes'], function (result) {
            const tokens = result.tokens || [];
            const switchTimes = result.switchTimes || {};

            if (tokens.length === 0) {
                tokenList.innerHTML = `
            <div class="empty-state">
              没有保存的令牌<br>
              点击下方按钮添加
            </div>
          `;
                return;
            }

            tokenList.innerHTML = '';

            tokens.forEach(token => {
                const lastSwitchTime = switchTimes[token.name] || '未使用';

                // 计算时间差
                let timeClass = '';
                if (lastSwitchTime !== '未使用') {
                    const fiveHoursInMs = 5 * 60 * 60 * 1000; // 5小时转换为毫秒
                    const switchTimestamp = new Date(lastSwitchTime).getTime();
                    const currentTime = new Date().getTime();

                    // 如果时间差大于5小时显示绿色,否则显示红色
                    timeClass = currentTime - switchTimestamp > fiveHoursInMs ? 'time-green' : 'time-red';
                }

                const tokenItem = document.createElement('div');
                tokenItem.className = 'token-item';
                tokenItem.innerHTML = `
            <div class="token-info">
              <div class="token-name">${token.name}</div>
              <div class="token-time">上次切换: <span class="${timeClass}">${lastSwitchTime}</span></div>
            </div>
            <button class="use-button">使用</button>
          `;

                // 添加使用按钮的点击事件
                const useButton = tokenItem.querySelector('.use-button');
                useButton.addEventListener('click', function () {
                    useToken(token.name, token.key);
                });

                tokenList.appendChild(tokenItem);
            });
        });
    }

    // 使用令牌
    function useToken(name, key) {
        if (!key) {
            console.error('No token key provided');
            return;
        }

        // 更新切换时间
        chrome.storage.sync.get(['switchTimes'], function (result) {
            const switchTimes = result.switchTimes || {};
            switchTimes[name] = new Date().toLocaleString('zh-CN');
            chrome.storage.sync.set({ switchTimes: switchTimes });

            // 获取当前活动标签页
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (!tabs || tabs.length === 0) {
                    console.error('No active tab found');
                    return;
                }

                const currentURL = tabs[0].url;
                let loginUrl;

                if (currentURL.startsWith('https://ccc.008778.xyz/')) {
                    loginUrl = `https://ccc.008778.xyz/login_token?session_key=${key}`;
                } else if (currentURL.startsWith('https://ccc.008778.xyz/')) {
                    loginUrl = `https://ccc.008778.xyz/login_token?session_key=${key}`;
                } else {
                    loginUrl = `https://ccc.008778.xyz/login_token?session_key=${key}`;
                }

                // 在当前标签页打开登录URL
                chrome.tabs.update(tabs[0].id, { url: loginUrl });

                // 关闭弹出窗口
                window.close();
            });
        });
    }

    // 添加新令牌按钮点击事件
    addTokenButton.addEventListener('click', function () {
        chrome.runtime.openOptionsPage();
    });

    // 设置链接点击事件
    optionsLink.addEventListener('click', function (e) {
        e.preventDefault();
        chrome.runtime.openOptionsPage();
    });

    // 初始加载令牌
    loadTokens();
});
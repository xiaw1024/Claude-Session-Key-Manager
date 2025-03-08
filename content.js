// 内容脚本 - 在匹配的页面上运行

// 创建元素的辅助函数
const createElem = (tag, styles) => {
    const elem = document.createElement(tag);
    Object.assign(elem.style, styles);
    return elem;
};

// 获取保存的位置
let buttonPosition = { left: 10, bottom: 10 };
chrome.storage.sync.get(['buttonPosition'], function (result) {
    if (result.buttonPosition) {
        buttonPosition = result.buttonPosition;
        initializeUI();
    } else {
        initializeUI();
    }
});

function initializeUI() {
    // 创建悬浮按钮
    const toggleButton = createElem('button', {
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        backgroundColor: '#faf9f5',
        color: '#007bff',
        cursor: 'move',
        position: 'fixed',
        bottom: `${buttonPosition.bottom}px`,
        left: `${buttonPosition.left}px`,
        zIndex: '10000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
        transition: 'background-color 0.3s ease',
        outline: 'none',
        padding: '0',
        userSelect: 'none',
        touchAction: 'none',
        border: '1px solid #ddd'
    });

    toggleButton.innerHTML = '🔑';

    // 创建下拉菜单容器
    const dropdownContainer = createElem('div', {
        position: 'fixed',
        backgroundColor: '#faf9f5',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'none',
        flexDirection: 'column',
        gap: '15px',
        width: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: '9999',
        border: '1px solid #e0e0e0',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)'
    });

    // 添加标题
    const titleContainer = createElem('div', {
        marginBottom: '15px',
        textAlign: 'center',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px'
    });
    titleContainer.innerHTML = '<h2 style="margin:0;color:#333;font-size:18px;">Claude Session Key Manager</h2>';
    dropdownContainer.appendChild(titleContainer);

    // 创建令牌网格容器
    const gridContainer = createElem('div', {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '10px',
        margin: '10px 0'
    });

    // 添加令牌卡片
    function updateTokenCards() {
        // 清空现有的卡片
        gridContainer.innerHTML = '';

        chrome.storage.sync.get(['tokens', 'switchTimes'], function (result) {
            const tokens = result.tokens || [];
            const switchTimes = result.switchTimes || {};

            tokens.forEach(token => {
                const tokenCard = createElem('div', {
                    padding: '15px',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                });

                const lastSwitchTime = switchTimes[token.name] || '未使用';

                // 计算时间差
                let color = '#666'; // 默认颜色
                if (lastSwitchTime !== '未使用') {
                    const fiveHoursInMs = 5 * 60 * 60 * 1000; // 5小时转换为毫秒
                    const switchTimestamp = new Date(lastSwitchTime).getTime();
                    const currentTime = new Date().getTime();

                    // 如果时间差大于5小时显示绿色,否则显示红色
                    color = currentTime - switchTimestamp > fiveHoursInMs ? 'green' : 'red';
                }

                tokenCard.innerHTML = `
            <div style="font-weight:bold;color:#333;margin-bottom:5px">${token.name}</div>
            <div style="font-size:12px;">上次切换: <span style="color:${color}">${lastSwitchTime}</span></div>
          `;

                tokenCard.addEventListener('mouseover', () => {
                    tokenCard.style.backgroundColor = '#f0f7ff';
                    tokenCard.style.borderColor = '#007bff';
                });

                tokenCard.addEventListener('mouseout', () => {
                    tokenCard.style.backgroundColor = '#fff';
                    tokenCard.style.borderColor = '#ddd';
                });

                tokenCard.addEventListener('click', () => {
                    // 更新切换时间
                    const now = new Date().toLocaleString('zh-CN');
                    switchTimes[token.name] = now;
                    chrome.storage.sync.set({ switchTimes: switchTimes });

                    // 存储选择并触发登录
                    handleTokenSelection(token.name, token.key);
                    dropdownContainer.style.display = 'none';
                });

                gridContainer.appendChild(tokenCard);
            });

            // 添加"添加新令牌"卡片
            const addTokenCard = createElem('div', {
                padding: '15px',
                borderRadius: '8px',
                backgroundColor: '#f0f7ff',
                border: '1px solid #ddd',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });

            addTokenCard.innerHTML = `
          <div style="font-weight:bold;color:#007bff;">+ 添加新令牌</div>
        `;

            addTokenCard.addEventListener('mouseover', () => {
                addTokenCard.style.backgroundColor = '#e0f0ff';
                addTokenCard.style.borderColor = '#007bff';
            });

            addTokenCard.addEventListener('mouseout', () => {
                addTokenCard.style.backgroundColor = '#f0f7ff';
                addTokenCard.style.borderColor = '#ddd';
            });

            addTokenCard.addEventListener('click', () => {
                // 打开扩展的选项页
                chrome.runtime.sendMessage({ action: "openOptions" });
                // 也可以直接打开
                window.open(chrome.runtime.getURL("options.html"), "_blank");
                dropdownContainer.style.display = 'none';
            });

            gridContainer.appendChild(addTokenCard);
        });
    }

    dropdownContainer.appendChild(gridContainer);

    // 添加信息部分
    const infoSection = createElem('div', {
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666'
    });
    infoSection.innerHTML = '双击按钮展开/收起面板 • 拖拽按钮调整位置 • 点击右键打开设置';
    dropdownContainer.appendChild(infoSection);

    let isDragging = false;
    let startX, startY;
    let buttonLeft = buttonPosition.left;
    let buttonBottom = buttonPosition.bottom;

    function onMouseDown(e) {
        if (e.button === 0 && e.target === toggleButton) { // 只响应左键
            isDragging = true;
            const buttonRect = toggleButton.getBoundingClientRect();
            startX = e.clientX - buttonRect.left;
            startY = e.clientY - buttonRect.top;
            toggleButton.style.cursor = 'grabbing';
            e.preventDefault(); // 防止文本选择
        }
    }

    function onMouseMove(e) {
        if (!isDragging) return;

        e.preventDefault();

        const newLeft = e.clientX - startX;
        const newTop = e.clientY - startY;

        // 从顶部计算底部位置
        const bottom = window.innerHeight - newTop - toggleButton.offsetHeight;

        // 确保按钮在窗口边界内
        const maxLeft = window.innerWidth - toggleButton.offsetWidth;
        const maxBottom = window.innerHeight - toggleButton.offsetHeight;

        buttonLeft = Math.min(Math.max(newLeft, 0), maxLeft);
        buttonBottom = Math.min(Math.max(bottom, 0), maxBottom);

        // 更新按钮位置
        toggleButton.style.left = `${buttonLeft}px`;
        toggleButton.style.bottom = `${buttonBottom}px`;
        toggleButton.style.top = 'auto';
    }

    function onMouseUp() {
        if (isDragging) {
            isDragging = false;
            toggleButton.style.cursor = 'move';

            // 保存位置到存储
            chrome.storage.sync.set({
                buttonPosition: {
                    left: buttonLeft,
                    bottom: buttonBottom
                }
            });
        }
    }

    // 双击检测
    let lastClickTime = 0;
    toggleButton.addEventListener('click', (e) => {
        const clickTime = new Date().getTime();
        const timeDiff = clickTime - lastClickTime;

        if (timeDiff < 300) { // 双击阈值
            if (dropdownContainer.style.display === 'none') {
                dropdownContainer.style.display = 'flex';
                updateTokenCards(); // 更新令牌卡片
            } else {
                dropdownContainer.style.display = 'none';
            }
            e.stopPropagation();
        }

        lastClickTime = clickTime;
    });

    // 右键点击打开选项页
    toggleButton.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.open(chrome.runtime.getURL("options.html"), "_blank");
    });

    // 添加拖动事件
    toggleButton.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // 点击外部时关闭下拉菜单
    document.addEventListener('click', (e) => {
        if (!dropdownContainer.contains(e.target) && e.target !== toggleButton) {
            dropdownContainer.style.display = 'none';
        }
    });

    // 初始化UI
    document.body.appendChild(dropdownContainer);
    document.body.appendChild(toggleButton);
}

function handleTokenSelection(name, token) {
    if (token === '') {
        console.log('Empty token selected. No action taken.');
    } else {
        autoLogin(name, token);
    }
}

function autoLogin(name, token) {
    const currentURL = window.location.href;
    let loginUrl;

    if (currentURL.startsWith('https://ccc.410183.xyz/')) {
        loginUrl = `https://ccc.410183.xyz/login_token?session_key=${token}`;
    } else if (currentURL.startsWith('https://ccc.410183.xyz/')) {
        loginUrl = `https://ccc.410183.xyz/login_token?session_key=${token}`;
    } else {
        loginUrl = `https://ccc.410183.xyz/login_token?session_key=${token}`;
    }

    // 发送消息到后台脚本进行处理
    chrome.runtime.sendMessage({
        action: "autoLogin",
        token: token,
        name: name,
        url: loginUrl
    });
}

// 监听存储变化，更新UI
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && (changes.tokens || changes.switchTimes)) {
        // 如果下拉菜单可见，更新令牌卡片
        const dropdownContainer = document.querySelector('div[style*="position: fixed"][style*="background-color: #faf9f5"]');
        if (dropdownContainer && dropdownContainer.style.display !== 'none') {
            const gridContainer = dropdownContainer.querySelector('div[style*="display: grid"]');
            if (gridContainer) {
                // 重新加载令牌卡片
                // 这里可以调用一个函数来更新卡片，类似于上面的updateTokenCards
            }
        }
    }
});
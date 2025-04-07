// 内容脚本 - 在匹配的页面上运行

// 创建元素的辅助函数
const createElem = (tag, styles) => {
    const elem = document.createElement(tag);
    Object.assign(elem.style, styles);
    return elem;
};

// 获取保存的位置
let buttonPosition = { left: 10, bottom: 10 };

// 检查当前域名是否在允许列表中
chrome.storage.sync.get(['domains', 'buttonPosition'], function(result) {
    const domains = result.domains || [];
    const currentDomain = window.location.hostname;
    
    // 只有当当前域名在允许列表中时才初始化UI
    if (domains.some(domain => currentDomain === domain)) {
        if (result.buttonPosition) {
            buttonPosition = result.buttonPosition;
        } else {
            // 设置默认位置为右下角，距离边缘30px
            buttonPosition = {
                left: window.innerWidth - 74, // 44px按钮宽度 + 30px边距
                bottom: 30
            };
        }
        initializeUI();
    }
});

function initializeUI() {
    // 创建悬浮按钮
    const toggleButton = createElem('button', {
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        backgroundColor: '#faf9f5',
        color: '#007bff',
        cursor: 'move',
        position: 'fixed',
        bottom: '30px',
        right: '10px',
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
        border: '1px solid #ddd',
        fontSize: '30px',
        background: 'url(data:image/png;base64,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) center center no-repeat',
        backgroundSize: 'cover'
    });

    // toggleButton.innerHTML = '🔑';

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
                chrome.runtime.sendMessage({
                    action: "openOptions"
                });
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
    infoSection.innerHTML = '双击按钮展开/收起面板 • 拖拽按钮调整位置 • Win+C 快捷键切换';
    dropdownContainer.appendChild(infoSection);

    // 添加切换面板的函数
    function togglePanel() {
        if (dropdownContainer.style.display === 'none') {
            dropdownContainer.style.display = 'flex';
            updateTokenCards(); // 更新令牌卡片
        } else {
            dropdownContainer.style.display = 'none';
        }
    }

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

        const newTop = e.clientY - startY;
        const bottom = window.innerHeight - newTop - toggleButton.offsetHeight;

        // 确保按钮在窗口边界内，保持10px的边距
        const maxBottom = window.innerHeight - toggleButton.offsetHeight - 10;
        buttonBottom = Math.min(Math.max(bottom, 10), maxBottom);

        // 更新按钮位置，只更新垂直位置
        toggleButton.style.bottom = `${buttonBottom}px`;
        toggleButton.style.right = '10px';
        toggleButton.style.left = 'auto';
    }

    function onMouseUp() {
        if (isDragging) {
            isDragging = false;
            toggleButton.style.cursor = 'move';

            // 保存位置到存储
            chrome.storage.sync.set({
                buttonPosition: {
                    right: 10,
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
            togglePanel();
            e.stopPropagation();
        }

        lastClickTime = clickTime;
    });

    // 添加键盘快捷键监听
    document.addEventListener('keydown', (e) => {
        // 检查是否按下 Win+C
        if (e.key.toLowerCase() === 'c' && (e.metaKey || e.ctrlKey)) {
            togglePanel();
            e.preventDefault(); // 阻止默认行为
        }
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

    // 添加窗口大小变化的监听器
    window.addEventListener('resize', () => {
        // 确保按钮始终在右侧
        toggleButton.style.right = '10px';
        toggleButton.style.left = 'auto';
        
        // 更新保存的位置
        buttonPosition = {
            right: 10,
            bottom: buttonBottom
        };
        
        // 保存新的位置到存储
        chrome.storage.sync.set({
            buttonPosition: buttonPosition
        });
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

    // 获取域名列表
    chrome.storage.sync.get(['domains'], function(result) {
        const domains = result.domains || []; // 移除默认域名
        const currentDomain = new URL(currentURL).hostname;
        
        // 检查当前域名是否在允许列表中
        if (domains.some(domain => currentDomain === domain)) {
            loginUrl = `${currentURL.split('/').slice(0, 3).join('/')}/login_token?session_key=${token}`;
            
            // 发送消息到后台脚本进行处理
            chrome.runtime.sendMessage({
                action: "autoLogin",
                token: token,
                name: name,
                url: loginUrl
            });
        } else {
            console.log('Current domain is not in the allowed list');
        }
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
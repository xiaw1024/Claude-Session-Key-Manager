document.addEventListener('DOMContentLoaded', function () {
    const tokenNameInput = document.getElementById('tokenName');
    const tokenKeyInput = document.getElementById('tokenKey');
    const addTokenButton = document.getElementById('addTokenButton');
    const tokenList = document.getElementById('tokenList');
    const saveSuccess = document.getElementById('saveSuccess');

    let editingIndex = -1; // 当前编辑的令牌索引，-1表示添加新令牌

    // 显示保存成功提示
    function showSaveSuccess() {
        saveSuccess.style.display = 'block';
        setTimeout(() => {
            saveSuccess.style.display = 'none';
        }, 3000);
    }

    // 加载令牌列表
    function loadTokens() {
        chrome.storage.sync.get(['tokens'], function (result) {
            const tokens = result.tokens || [];

            if (tokens.length === 0) {
                tokenList.innerHTML = `
            <div class="empty-state">
              没有保存的令牌<br>
              使用上方表单添加
            </div>
          `;
                return;
            }

            tokenList.innerHTML = '';

            tokens.forEach((token, index) => {
                const tokenItem = document.createElement('div');
                tokenItem.className = 'token-item';

                // 创建令牌显示
                tokenItem.innerHTML = `
            <div class="token-name">${token.name}</div>
            <div class="token-key">${maskToken(token.key)}</div>
            <div class="token-actions">
              <button class="edit-button">编辑</button>
              <button class="delete-button">删除</button>
            </div>
          `;

                // 添加编辑按钮事件
                const editButton = tokenItem.querySelector('.edit-button');
                editButton.addEventListener('click', function () {
                    editToken(index, token);
                });

                // 添加删除按钮事件
                const deleteButton = tokenItem.querySelector('.delete-button');
                deleteButton.addEventListener('click', function () {
                    deleteToken(index);
                });

                tokenList.appendChild(tokenItem);
            });
        });
    }

    // 掩码显示令牌
    function maskToken(token) {
        if (!token) return '';
        // 只显示前5个和后5个字符
        if (token.length <= 10) return token;
        return token.substring(0, 5) + '...' + token.substring(token.length - 5);
    }

    // 添加新令牌
    function addToken() {
        const name = tokenNameInput.value.trim();
        const key = tokenKeyInput.value.trim();

        if (!name || !key) {
            alert('名称和密钥不能为空');
            return;
        }

        chrome.storage.sync.get(['tokens'], function (result) {
            const tokens = result.tokens || [];

            // 检查是否已存在同名令牌
            const existingIndex = tokens.findIndex(t => t.name === name);
            if (existingIndex !== -1 && existingIndex !== editingIndex) {
                alert(`令牌名称 "${name}" 已存在`);
                return;
            }

            if (editingIndex === -1) {
                // 添加新令牌
                tokens.push({ name, key });
            } else {
                // 更新现有令牌
                tokens[editingIndex] = { name, key };
                editingIndex = -1; // 重置编辑状态
            }

            chrome.storage.sync.set({ tokens }, function () {
                // 重置表单
                tokenNameInput.value = '';
                tokenKeyInput.value = '';
                addTokenButton.textContent = '添加令牌';

                // 重新加载令牌列表
                loadTokens();

                // 显示保存成功
                showSaveSuccess();
            });
        });
    }

    // 编辑令牌
    function editToken(index, token) {
        tokenNameInput.value = token.name;
        tokenKeyInput.value = token.key;
        addTokenButton.textContent = '保存修改';
        editingIndex = index;

        // 滚动到表单
        tokenNameInput.scrollIntoView({ behavior: 'smooth' });
        tokenNameInput.focus();
    }

    // 删除令牌
    function deleteToken(index) {
        if (!confirm('确定要删除此令牌吗？')) {
            return;
        }

        chrome.storage.sync.get(['tokens', 'switchTimes'], function (result) {
            const tokens = result.tokens || [];
            const switchTimes = result.switchTimes || {};

            // 删除切换时间记录
            if (tokens[index] && switchTimes[tokens[index].name]) {
                delete switchTimes[tokens[index].name];
            }

            // 删除令牌
            tokens.splice(index, 1);

            chrome.storage.sync.set({ tokens, switchTimes }, function () {
                // 如果正在编辑被删除的令牌，重置表单
                if (editingIndex === index) {
                    tokenNameInput.value = '';
                    tokenKeyInput.value = '';
                    addTokenButton.textContent = '添加令牌';
                    editingIndex = -1;
                }

                // 重新加载令牌列表
                loadTokens();

                // 显示保存成功
                showSaveSuccess();
            });
        });
    }

    // 添加/保存按钮点击事件
    addTokenButton.addEventListener('click', addToken);

    // 表单回车提交
    tokenKeyInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addToken();
        }
    });

    // 初始加载令牌
    loadTokens();
});
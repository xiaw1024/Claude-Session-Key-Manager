import { setEncryptionKey, syncToDrive, restoreFromDrive } from './sync.js';

document.addEventListener('DOMContentLoaded', function () {
    const tokenNameInput = document.getElementById('tokenName');
    const tokenKeyInput = document.getElementById('tokenKey');
    const addTokenButton = document.getElementById('addTokenButton');
    const tokenList = document.getElementById('tokenList');
    const saveSuccess = document.getElementById('saveSuccess');
    const reauthorizeButton = document.getElementById('reauthorizeButton');

    // 同步相关元素
    const encryptionKeyInput = document.getElementById('encryptionKey');
    const setEncryptionKeyButton = document.getElementById('setEncryptionKey');
    const syncToDriveButton = document.getElementById('syncToDrive');
    const restoreFromDriveButton = document.getElementById('restoreFromDrive');
    const syncStatus = document.getElementById('syncStatus');

    // 添加取消按钮
    const cancelButton = document.createElement('button');
    cancelButton.id = 'cancelButton';
    cancelButton.textContent = '取消修改';
    cancelButton.style.display = 'none';
    addTokenButton.parentNode.insertBefore(cancelButton, addTokenButton.nextSibling);

    let editingIndex = -1; // 当前编辑的令牌索引，-1表示添加新令牌

    // 添加域名相关元素
    const domainInput = document.getElementById('domainInput');
    const addDomainButton = document.getElementById('addDomainButton');
    const domainList = document.getElementById('domainList');
    let editingDomainIndex = -1;

    // 显示保存成功提示
    function showSaveSuccess() {
        saveSuccess.style.display = 'block';
        setTimeout(() => {
            saveSuccess.style.display = 'none';
        }, 3000);
    }

    // 显示同步状态
    function showSyncStatus(message, type = 'info') {
        syncStatus.textContent = message;
        syncStatus.className = 'sync-status sync-' + type;
        syncStatus.style.display = 'block';
        
        // 清除之前的定时器
        if (syncStatus.timeout) {
            clearTimeout(syncStatus.timeout);
        }
        
        // 设置新的定时器
        syncStatus.timeout = setTimeout(() => {
            syncStatus.style.display = 'none';
        }, 5000);
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

    // 加载域名列表
    function loadDomains() {
        chrome.storage.sync.get(['domains'], function (result) {
            const domains = result.domains || [];

            if (domains.length === 0) {
                domainList.innerHTML = `
                    <div class="empty-state">
                        没有配置的域名<br>
                        使用上方表单添加
                    </div>
                `;
                return;
            }

            domainList.innerHTML = '';

            domains.forEach((domain, index) => {
                const domainItem = document.createElement('div');
                domainItem.className = 'token-item';

                domainItem.innerHTML = `
                    <div class="token-name">${domain}</div>
                    <div class="token-key"></div>
                    <div class="token-actions">
                        <button class="edit-button">编辑</button>
                        <button class="delete-button">删除</button>
                    </div>
                `;

                // 添加编辑按钮事件
                const editButton = domainItem.querySelector('.edit-button');
                editButton.addEventListener('click', function () {
                    editDomain(index, domain);
                });

                // 添加删除按钮事件
                const deleteButton = domainItem.querySelector('.delete-button');
                deleteButton.addEventListener('click', function () {
                    deleteDomain(index);
                });

                domainList.appendChild(domainItem);
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
        cancelButton.style.display = 'inline-block';

        // 滚动到表单
        tokenNameInput.scrollIntoView({ behavior: 'smooth' });
        tokenNameInput.focus();
    }

    // 取消编辑
    function cancelEdit() {
        tokenNameInput.value = '';
        tokenKeyInput.value = '';
        addTokenButton.textContent = '添加令牌';
        editingIndex = -1;
        cancelButton.style.display = 'none';
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

    // 设置加密密钥
    setEncryptionKeyButton.addEventListener('click', async function() {
        const key = encryptionKeyInput.value.trim();
        if (!key) {
            showSyncStatus('请输入加密密钥', 'error');
            return;
        }
        
        try {
            await setEncryptionKey(key);
            showSyncStatus('加密密钥设置成功', 'success');
            encryptionKeyInput.value = '';
        } catch (error) {
            showSyncStatus('设置加密密钥失败: ' + error.message, 'error');
        }
    });

    // 同步到Google Drive
    syncToDriveButton.addEventListener('click', async function() {
        try {
            showSyncStatus('正在同步到Google Drive...', 'info');
            const success = await syncToDrive();
            if (success) {
                showSyncStatus('同步到Google Drive成功！数据已安全备份', 'success');
            } else {
                showSyncStatus('同步到Google Drive失败，请重试', 'error');
            }
        } catch (error) {
            console.error('同步失败:', error);
            showSyncStatus('同步失败: ' + error.message, 'error');
        }
    });

    // 从Google Drive恢复
    restoreFromDriveButton.addEventListener('click', async function() {
        try {
            showSyncStatus('正在从Google Drive恢复数据...', 'info');
            const success = await restoreFromDrive();
            if (success) {
                showSyncStatus('从Google Drive恢复成功！数据已更新', 'success');
                // 延迟一下再重新加载令牌列表，确保数据已经写入
                setTimeout(() => {
                    loadTokens();
                }, 1000);
            } else {
                showSyncStatus('从Google Drive恢复失败，请重试', 'error');
            }
        } catch (error) {
            console.error('恢复失败:', error);
            showSyncStatus('恢复失败: ' + error.message, 'error');
        }
    });

    // 添加/保存按钮点击事件
    addTokenButton.addEventListener('click', addToken);

    // 取消按钮点击事件
    cancelButton.addEventListener('click', cancelEdit);

    // 表单回车提交
    tokenKeyInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addToken();
        }
    });

    // 添加新域名
    function addDomain() {
        const domain = domainInput.value.trim();

        if (!domain) {
            alert('域名不能为空');
            return;
        }

        // 简单的域名格式验证
        if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](\.[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9])*\.[a-zA-Z]{2,}$/.test(domain)) {
            alert('请输入有效的域名格式');
            return;
        }

        chrome.storage.sync.get(['domains'], function (result) {
            const domains = result.domains || [];

            // 检查是否已存在相同域名
            if (domains.includes(domain)) {
                alert(`域名 "${domain}" 已存在`);
                return;
            }

            if (editingDomainIndex === -1) {
                // 添加新域名
                domains.push(domain);
            } else {
                // 更新现有域名
                domains[editingDomainIndex] = domain;
                editingDomainIndex = -1;
            }

            chrome.storage.sync.set({ domains }, function () {
                // 重置表单
                domainInput.value = '';
                addDomainButton.textContent = '添加域名';

                // 重新加载域名列表
                loadDomains();

                // 显示保存成功
                showSaveSuccess();
            });
        });
    }

    // 编辑域名
    function editDomain(index, domain) {
        domainInput.value = domain;
        addDomainButton.textContent = '保存修改';
        editingDomainIndex = index;

        // 滚动到输入框
        domainInput.scrollIntoView({ behavior: 'smooth' });
        domainInput.focus();
    }

    // 删除域名
    function deleteDomain(index) {
        if (!confirm('确定要删除此域名吗？')) {
            return;
        }

        chrome.storage.sync.get(['domains'], function (result) {
            const domains = result.domains || [];
            domains.splice(index, 1);

            chrome.storage.sync.set({ domains }, function () {
                // 如果正在编辑被删除的域名，重置表单
                if (editingDomainIndex === index) {
                    domainInput.value = '';
                    addDomainButton.textContent = '添加域名';
                    editingDomainIndex = -1;
                }

                // 重新加载域名列表
                loadDomains();

                // 显示保存成功
                showSaveSuccess();
            });
        });
    }

    // 添加域名按钮点击事件
    addDomainButton.addEventListener('click', addDomain);

    // 域名输入框回车事件
    domainInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addDomain();
        }
    });

    // 重新授权按钮点击事件
    reauthorizeButton.addEventListener('click', function() {
        if (confirm('确定要重新授权扩展吗？这将清除所有保存的令牌和设置，需要重新进行授权和配置。')) {
            // 清除授权相关的存储
            chrome.storage.sync.remove(['authorized'], function() {
                // 通知background script重新进行授权
                chrome.runtime.sendMessage({ action: 'reauthorize' }, function(response) {
                    if (response && response.success) {
                        showSyncStatus('已触发重新授权流程，请刷新页面完成授权', 'info');
                        // 3秒后刷新页面
                        setTimeout(() => {
                            window.location.reload();
                        }, 3000);
                    } else {
                        showSyncStatus('重新授权失败，请重试', 'error');
                    }
                });
            });
        }
    });

    // 初始加载令牌
    loadTokens();
    // 初始加载域名列表
    loadDomains();
});

// 建议在 background.js 中添加
function logSecurityEvent(event) {
    const log = {
        timestamp: Date.now(),
        event: event,
        user: chrome.identity.getProfileUserInfo()
    };
    // 存储安全日志
    chrome.storage.local.set({ securityLog: log });
}
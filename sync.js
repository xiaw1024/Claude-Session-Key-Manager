// 加密密钥，建议用户设置自己的密钥
let encryptionKey = '';

// 设置加密密钥
export function setEncryptionKey(key) {
    encryptionKey = key;
}

// 加密数据
async function encryptData(data) {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(encryptionKey),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        encoder.encode(JSON.stringify(data))
    );

    return {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encryptedContent))
    };
}

// 解密数据
async function decryptData(encryptedData) {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(encryptionKey),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    const key = await window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(encryptedData.salt),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );

    const decryptedContent = await window.crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: new Uint8Array(encryptedData.iv)
        },
        key,
        new Uint8Array(encryptedData.data)
    );

    return JSON.parse(decoder.decode(decryptedContent));
}

// 配置文件名称
const CONFIG_FILE_NAME = 'claude_session_keys_backup.json';

// 查找或创建配置文件
async function findOrCreateConfigFile(token) {
    const headers = new Headers({
        'Authorization': `Bearer ${token}`
    });

    // 1. 尝试查找文件
    const query = encodeURIComponent(`name='${CONFIG_FILE_NAME}'`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;

    try {
        const response = await fetch(listUrl, { method: 'GET', headers: headers });
        if (!response.ok) {
            throw new Error(`API list call failed: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.files && data.files.length > 0) {
            console.log("Config file found:", data.files[0].id);
            return data.files[0].id; // 返回文件 ID
        } else {
            // 2. 文件未找到，创建文件
            console.log("Config file not found, creating...");
            const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            const metadata = {
                name: CONFIG_FILE_NAME,
                parents: ['appDataFolder'] // 指定在 App Data Folder 中创建
            };
            const initialConfig = {}; // 空配置

            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
            form.append('file', new Blob([JSON.stringify(initialConfig, null, 2)], { type: 'application/json' }));

            const createResponse = await fetch(createUrl, {
                method: 'POST',
                headers: headers, // 注意：Content-Type 由 FormData 自动设置
                body: form
            });

            if (!createResponse.ok) {
                throw new Error(`API create call failed: ${createResponse.statusText}`);
            }
            const newFile = await createResponse.json();
            console.log("Config file created:", newFile.id);
            return newFile.id;
        }
    } catch (error) {
        console.error("Error finding or creating config file:", error);
        throw error;
    }
}

// 读取配置
async function readConfig(token, fileId) {
    const headers = new Headers({
        'Authorization': `Bearer ${token}`
    });
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    try {
        const response = await fetch(downloadUrl, { method: 'GET', headers: headers });
        if (!response.ok) {
            if (response.status === 404) return null; // 文件可能已被删除
            throw new Error(`API download call failed: ${response.statusText}`);
        }
        const encryptedData = await response.json();
        console.log("Config read successfully.");
        
        // 解密数据
        if (encryptedData && encryptedData.salt && encryptedData.iv && encryptedData.data) {
            return await decryptData(encryptedData);
        }
        return encryptedData; // 如果没有加密，直接返回
    } catch (error) {
        console.error("Error reading config file:", error);
        throw error;
    }
}

// 写入/更新配置
async function writeConfig(token, fileId, configData) {
    // 加密数据
    const encryptedData = await encryptData(configData);
    
    const headers = new Headers({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    });
    // 使用 media upload 来更新文件内容
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;

    try {
        const response = await fetch(updateUrl, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify(encryptedData, null, 2)
        });

        if (!response.ok) {
            throw new Error(`API update call failed: ${response.statusText}`);
        }
        const updatedFile = await response.json();
        console.log("Config updated successfully:", updatedFile.id);
        return updatedFile.id;
    } catch (error) {
        console.error("Error writing config file:", error);
        throw error;
    }
}

// 同步数据到Google Drive
export async function syncToDrive() {
    try {
        // 获取当前存储的数据
        return new Promise((resolve, reject) => {
            chrome.storage.sync.get(null, async (data) => {
                if (chrome.runtime.lastError) {
                    console.error('获取存储数据失败:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                console.log('获取到本地数据:', data);
                
                try {
                    // 获取认证令牌
                    const token = await getAuthToken();
                    
                    // 查找或创建配置文件
                    const fileId = await findOrCreateConfigFile(token);
                    
                    // 写入配置
                    await writeConfig(token, fileId, data);
                    
                    console.log('同步到Google Drive成功');
                    resolve(true);
                } catch (error) {
                    console.error('同步失败:', error);
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('同步失败:', error);
        return false;
    }
}

// 从Google Drive恢复数据
export async function restoreFromDrive() {
    try {
        console.log('开始从Google Drive恢复数据...');
        
        // 检查加密密钥是否已设置
        if (!encryptionKey) {
            throw new Error('请先设置加密密钥');
        }
        
        // 获取认证令牌
        const token = await getAuthToken();
        
        // 查找配置文件
        const query = encodeURIComponent(`name='${CONFIG_FILE_NAME}'`);
        const listUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
        
        const response = await fetch(listUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('搜索文件失败详情:', errorData);
            throw new Error('搜索文件失败: ' + (errorData.error?.message || '未知错误'));
        }
        
        const files = await response.json();
        console.log('找到备份文件:', files);
        
        if (!files.files || files.files.length === 0) {
            throw new Error('未找到备份文件');
        }
        
        // 读取配置
        const fileId = files.files[0].id;
        const decryptedData = await readConfig(token, fileId);
        
        if (!decryptedData) {
            throw new Error('无法读取或解密备份文件');
        }
        
        console.log('解密后的数据:', decryptedData);
        
        // 恢复数据到存储
        return new Promise((resolve, reject) => {
            // 先清除现有数据
            chrome.storage.sync.clear(() => {
                if (chrome.runtime.lastError) {
                    console.error('清除存储失败:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                    return;
                }
                
                console.log('存储已清除，开始写入新数据...');
                // 设置新数据
                chrome.storage.sync.set(decryptedData, () => {
                    if (chrome.runtime.lastError) {
                        console.error('写入数据失败:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                    } else {
                        console.log('数据恢复成功');
                        resolve(true);
                    }
                });
            });
        });
    } catch (error) {
        console.error('恢复失败:', error);
        return false;
    }
}

// 获取Google OAuth令牌
async function getAuthToken() {
    return new Promise((resolve, reject) => {
        chrome.identity.getAuthToken({ interactive: true }, (token) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(token);
            }
        });
    });
} 
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
                
                // 加密数据
                const encryptedData = await encryptData(data);
                
                // 将加密后的数据转换为Blob
                const blob = new Blob([JSON.stringify(encryptedData)], { type: 'application/json' });
                
                // 创建文件元数据
                const metadata = {
                    name: 'claude_session_keys_backup.json',
                    mimeType: 'application/json'
                };
                
                // 上传到Google Drive
                const form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', blob);
                
                try {
                    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${await getAuthToken()}`
                        },
                        body: form
                    });
                    
                    if (!response.ok) {
                        throw new Error('上传到Google Drive失败');
                    }
                    
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
        
        // 获取文件列表
        const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name%3D%27claude_session_keys_backup.json%27', {
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });
        
        const files = await response.json();
        console.log('找到备份文件:', files);
        
        if (!files.files || files.files.length === 0) {
            throw new Error('未找到备份文件');
        }
        
        // 下载文件
        const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${files.files[0].id}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });
        
        const encryptedData = await fileResponse.json();
        console.log('获取到加密数据:', encryptedData);
        
        // 解密数据
        const decryptedData = await decryptData(encryptedData);
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
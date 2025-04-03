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
        const data = await chrome.storage.local.get(null);
        
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
        
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: form
        });
        
        if (!response.ok) {
            throw new Error('Failed to upload to Google Drive');
        }
        
        return true;
    } catch (error) {
        console.error('Sync failed:', error);
        return false;
    }
}

// 从Google Drive恢复数据
export async function restoreFromDrive() {
    try {
        // 获取文件列表
        const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name%3D%27claude_session_keys_backup.json%27', {
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });
        
        const files = await response.json();
        if (!files.files || files.files.length === 0) {
            throw new Error('No backup file found');
        }
        
        // 下载文件
        const fileResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${files.files[0].id}?alt=media`, {
            headers: {
                'Authorization': `Bearer ${await getAuthToken()}`
            }
        });
        
        const encryptedData = await fileResponse.json();
        
        // 解密数据
        const decryptedData = await decryptData(encryptedData);
        
        // 恢复数据到存储
        await chrome.storage.local.clear();
        await chrome.storage.local.set(decryptedData);
        
        return true;
    } catch (error) {
        console.error('Restore failed:', error);
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
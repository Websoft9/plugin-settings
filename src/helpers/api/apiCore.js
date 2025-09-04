import axios from 'axios';
import cockpit from 'cockpit';

// 配置缓存
const configCache = new Map();
const fetchPromise = new Map();

// 获取完整配置（一次性获取所有配置信息）
const getFullConfig = async () => {
    const cacheKey = 'fullConfig';

    // 检查缓存
    if (configCache.has(cacheKey)) {
        return configCache.get(cacheKey);
    }

    // 防止并发重复请求
    if (fetchPromise.has(cacheKey)) {
        return fetchPromise.get(cacheKey);
    }

    // 创建并缓存Promise
    const promise = (async () => {
        try {
            const script = "docker exec -i websoft9-apphub apphub getallconfig";
            const result = await cockpit.spawn(["/bin/bash", "-c", script], { superuser: "try" });
            const allConfig = JSON.parse(result.trim());

            // 验证必要的配置项
            const listenPort = allConfig.config?.nginx_proxy_manager?.listen_port;
            const apiKey = allConfig.config?.api_key?.key;

            if (!listenPort) {
                throw new Error("Nginx Listen Port Not Set");
            }

            if (!apiKey) {
                throw new Error("Api Key Not Set");
            }

            const processedConfig = {
                nginxPort: listenPort,
                apiKey: apiKey,
                rawConfig: allConfig // 保留原始配置以备后用
            };

            configCache.set(cacheKey, processedConfig);
            return processedConfig;

        } catch (error) {
            const errorText = [error.problem, error.reason, error.message]
                .filter(Boolean)
                .join(' ');

            if (errorText.includes("permission denied")) {
                throw new Error("Your user does not have Docker permissions. Grant Docker permissions to this user by command: sudo usermod -aG docker <username>");
            }
            throw new Error(errorText || "Get Configuration Error");
        } finally {
            fetchPromise.delete(cacheKey);
        }
    })();

    fetchPromise.set(cacheKey, promise);
    return promise;
};

// 获取Nginx端口（向后兼容）
const getNginxConfig = async () => {
    const config = await getFullConfig();
    return config.nginxPort;
};

// 获取API Key（向后兼容）
const getApiKey = async () => {
    const config = await getFullConfig();
    return config.apiKey;
};

// 清除配置缓存
const clearConfigCache = () => {
    configCache.clear();
    fetchPromise.clear();
};

// 检查是否为配置错误并清除相应缓存
const handleConfigError = (error) => {
    const status = error.response?.status;
    const details = error.response?.data?.details;

    // API Key 无效或连接错误
    if ((status === 400 && details === "Invalid API Key") ||
        [404, 502, 503].includes(status) ||
        ['ECONNREFUSED', 'ETIMEDOUT'].includes(error.code)) {
        console.warn('[Config Error] Configuration error detected, clearing cache');
        clearConfigCache();
        return true;
    }

    return false;
};

class APICore {
    constructor() {
        this.axiosInstance = null;
    }

    // 重置axios实例（配置错误时使用）
    resetAxiosInstance() {
        this.axiosInstance = null;
    }

    // 获取或创建配置好的axios实例
    async getAxiosInstance() {
        if (!this.axiosInstance) {
            await this.initializeAxiosInstance();
        }
        return this.axiosInstance;
    }

    // 初始化axios实例
    async initializeAxiosInstance() {
        try {
            const fullConfig = await getFullConfig();
            const baseURL = `${window.location.protocol}//${window.location.hostname}:${fullConfig.nginxPort}/api`;

            this.axiosInstance = axios.create({
                baseURL: baseURL,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'x-api-key': fullConfig.apiKey
                },
                timeout: 30000,
                // 添加 CORS 相关配置
                withCredentials: false,
                crossDomain: true
            });

            this.setupInterceptors();
        } catch (error) {
            console.error('[APICore] Failed to initialize axios instance:', error);
            throw error;
        }
    }

    // 设置拦截器
    setupInterceptors() {
        this.axiosInstance.interceptors.response.use(
            response => response.status === 200 ? response.data : response,
            error => {
                if (handleConfigError(error)) {
                    error.configError = true;
                }
                error.message = error.response?.data?.details || error.message || "Unknown Error";
                return Promise.reject(error);
            }
        );
    }

    // 重置实例
    resetInstance() {
        this.axiosInstance = null;
        clearConfigCache();
    }

    // 通用请求方法，支持重试
    async request(method, url, data = null, params = null) {
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                const instance = await this.getAxiosInstance();
                const config = { params };

                let result;
                switch (method.toLowerCase()) {
                    case 'get':
                        result = await instance.get(url, config);
                        break;
                    case 'post':
                        result = await instance.post(url, data, config);
                        break;
                    case 'put':
                        result = await instance.put(url, data, config);
                        break;
                    case 'delete':
                        result = await instance.delete(url, config);
                        break;
                    default:
                        throw new Error(`Unsupported method: ${method}`);
                }

                return result;
            } catch (error) {
                // 配置错误且是第一次尝试，重置并重试
                if (error.configError && attempt === 0) {
                    console.info(`[API Retry] Config error detected, resetting instance and retrying...`);
                    this.resetInstance();
                    await new Promise(resolve => setTimeout(resolve, 200));
                    continue;
                }
                throw error;
            }
        }
    }

    // HTTP方法的简化封装
    get = (url, params) => this.request('get', url, null, params);
    post = (url, data, params) => this.request('post', url, data, params);
    put = (url, data, params) => this.request('put', url, data, params);
    delete = (url, params) => this.request('delete', url, null, params);
}

export { APICore, getNginxConfig, getApiKey, getFullConfig };

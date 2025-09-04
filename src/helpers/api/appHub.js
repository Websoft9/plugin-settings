import { APICore } from "./apiCore";

const api = new APICore();

// 获取设置
function GetSettings(params) {
    const baseUrl = '/settings';
    return api.get(`${baseUrl}`, params);
}

// 更新设置
function SetSettings(section, params, body) {
    const baseUrl = `/settings/${section}`;
    return api.put(`${baseUrl}`, body, params);
}

// 获取SSL证书列表
function GetSslCertificates() {
    const baseUrl = '/proxys/ssl/certificates';
    return api.get(`${baseUrl}`);
}

export {
    GetSettings, SetSettings, GetSslCertificates
};



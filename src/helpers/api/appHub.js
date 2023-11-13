import { APICore } from "./apiCore";

const api = new APICore();

// 获取设置
function GetSettings(params: any): Promise<any> {
    const baseUrl = '/settings';
    return api.get(`${baseUrl}`, params);
}

// 更新设置
function SetSettings(section: String, params: any, body: any): Promise<any> {
    const baseUrl = `/settings/${section}`;
    return api.put(`${baseUrl}`, params, body);
}

export {
    GetSettings, SetSettings
};



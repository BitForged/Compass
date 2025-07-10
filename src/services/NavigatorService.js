import { request } from "@/services";

export function getAvailableModels() {
    return request({endpoint: "api/models"});
}

export function getAvailableSamplers() {
    return request({endpoint: "api/samplers?all=true"});
}

export function getAvailableSchedulers() {
    return request({endpoint: "api/schedulers"});
}

export function getAvailableUpscalers() {
    return request({endpoint: "api/upscalers"});
}

export function getAvailableModules() {
    return request({ endpoint: "api/modules" });
}

export function generateTxt2Img(jobData) {
    return request({method: "POST", endpoint: "api/queue/user/txt2img", data: jobData});
}

export function generateImg2Img(jobData) {
    return request({method: "POST", endpoint: "api/queue/user/img2img", data: jobData});
}

export function upscaleImageWithHR(jobId, jobData = undefined) {
    if(jobData) {
        return request({method: "POST", endpoint: `api/queue/user/txt2img/upscale-hrf/${jobId}`, data: jobData});
    }
    return request({method: "POST", endpoint: `api/queue/user/txt2img/upscale-hrf/${jobId}`});
}

export function getImageInfo(jobId) {
    return request({endpoint: `api/images/${jobId}/info`});
}

export function interruptJob(jobId) {
    return request({method: "POST", endpoint: `api/queue/interrupt/${jobId}`});
}

export function getMyCategories() {
    return request({endpoint: "api/user/categories"});
}

export function deleteCategory(categoryId) {
    return request({method: "DELETE", endpoint: `api/user/category/${categoryId}`});
}

export function addCategory(name) {
    return request({method: "POST", endpoint: "api/user/category", data: {name}});
}

export function editCategory(categoryId, name) {
    return request({method: "PATCH", endpoint: `api/user/category/${categoryId}`, data: {name}});
}

export function setCategory(imageId, categoryId) {
    return request({method: "PUT", endpoint: `api/user/image/${imageId}/category`, data: {categoryId}});
}

export function getMetadataForImage(imageId) {
    return request({endpoint: `api/user/image/${imageId}/meta`});
}

export function getAvailableLoras() {
    return request({endpoint: "api/models/loras"});
}

export function getLimits() {
    return request({endpoint: "api/config/limits"});
}

export function isDownloadAllowed() {
    return request({endpoint: "3papi/civitai/downloads_enabled"});
}

export function downloadModelById(modelVersionId) {
    return request({method: "GET", endpoint: `3papi/civitai/download/${modelVersionId}`});
}

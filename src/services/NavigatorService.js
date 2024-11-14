import { request } from "@/services";

export function getAvailableModels() {
    return request({endpoint: "api/models"});
}

export function getAvailableSamplers() {
    return request({endpoint: "api/samplers"});
}

export function generateTxt2Img(jobData) {
    return request({method: "POST", endpoint: "api/queue/user/txt2img", data: jobData});
}

export function upscaleImageWithHR(jobId) {
    return request({method: "POST", endpoint: `api/queue/user/txt2img/upscale-hrf/${jobId}`});
}

export function getImageInfo(jobId) {
    return request({endpoint: `api/images/${jobId}/info`});
}

export function interruptJob(jobId) {
    return request({method: "POST", endpoint: `api/queue/interrupt/${jobId}`});
}
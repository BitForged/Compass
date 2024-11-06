import { request } from "@/services";

export function getMyJobs() {
    return request({endpoint: "api/user/jobs"});
}

export function deleteImage(imageId) {
    return request({method: "DELETE", endpoint: `api/user/image/${imageId}`});
}
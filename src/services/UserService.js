import { request } from "@/services";

export function getMyJobs(page = 1, limit = 10, category_id = 0) {
    return request({endpoint: `api/user/jobs?page=${page}&limit=${limit}&category_id=${category_id}`});
}

export function deleteImage(imageId) {
    return request({method: "DELETE", endpoint: `api/user/image/${imageId}`});
}
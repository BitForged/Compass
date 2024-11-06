import { request } from "@/services";

export function getMyJobs() {
    return request({endpoint: "api/user/jobs"});
}
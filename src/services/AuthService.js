import { request } from "@/services";

export function requestLoginToken(code) {
    console.log("Requesting login token with code: ", code);
    return request({method: "POST", endpoint: "api/auth/login", data: {code: code}});
}

export function requestUser() {
    return request({endpoint: "api/user/me"});
}
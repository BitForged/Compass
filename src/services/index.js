import { useAuthStore } from "@/stores/auth";
import axios from "axios";
import { useRouter } from "vue-router";

export function request({method = "GET", endpoint, data = {}, headers = {}}) {
    const authStore = useAuthStore();
    const router = useRouter();

    if (authStore.isLoggedIn()) headers = {'Authorization': `Bearer ${authStore.token}`};

    return new Promise((resolve, reject) => {
        axios({
            method,
            url: `${import.meta.env.VITE_API_BASE}/${endpoint}`,
            headers,
            data
        }).then((res) => {
            resolve(res);
        }).catch((err) => {
            if (err.response === undefined || err.response === null) {
                console.log("We did not receive any error data from the server.");
                console.error(err);
                reject("No response from server!");
            }
            if (err.response.status === 401 && authStore.isLoggedIn) {
                console.error("Unauthorized, logging out!");
                authStore.logout(true);
            }
            reject(err);
        });
    });

}
import axios from "axios";
import {useAuthStore} from "@/stores/auth";


export const ModelTypes = {
    CHECKPOINT: { label: "Checkpoints", apiValue: "Checkpoint" },
    LORA: { label: "LoRAs", apiValue: "LORA" },
    EMBEDDING: { label: "Embeddings", apiValue: "TextualInversion" }
}

// https://stackoverflow.com/a/50288717
const encodeGetParams = p =>
    Object.entries(p).map(kv => kv.map(encodeURIComponent).join("=")).join("&");

export function apiForwardRequest({endpoint, query = {}}) {
    const authStore = useAuthStore()
    let url = "";
    if(query === undefined) {
        url = `${import.meta.env.VITE_API_BASE}/3papi/civitai/api-proxy/${endpoint}`
    } else {
        url = `${import.meta.env.VITE_API_BASE}/3papi/civitai/api-proxy/${endpoint}?${encodeGetParams(query)}`
    }
    console.log(`Using query parameters: ${encodeGetParams(query)}`)
    return new Promise((resolve, reject) => {
        axios({
            method: "GET",
            url: url,
            headers: {
                "Authorization": `Bearer ${authStore.token}`
            }
        }).then((res) => {
            resolve(res);
        }).catch((err) => {
            if (err.response === undefined || err.response === null) {
                console.log("We did not receive any error data from the external server.");
                console.error(err);
                reject("No response from server!");
            }
            reject(err);
        });
    });
}

export function apiForwardRequestRaw(endpointStr) {
    return apiForwardRequest({endpoint: endpointStr, query: undefined});
}

export function getModelsByQuery(query, typeId, nsfw = true, limit = 25, searchByTag = false) {
    console.log(`Searching for models with query: ${query}, type: ${typeId}, nsfw: ${nsfw}, limit: ${limit}, searchByTag: ${searchByTag}`)
    if (searchByTag) {
        if(typeId === "") {
            return apiForwardRequest({endpoint: 'models', query: {tag: query, nsfw: nsfw, limit}});
        } else {
            return apiForwardRequest({endpoint: 'models', query: {tag: query, types: typeId, nsfw: nsfw, limit}});
        }
    }
    if(typeId === "") {
        return apiForwardRequest({endpoint: 'models', query: {query: query, nsfw: nsfw, limit}});
    }
    return apiForwardRequest({endpoint: 'models', query: {query: query, types: typeId, nsfw: nsfw, limit}});
}
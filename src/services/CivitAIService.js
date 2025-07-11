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

// https://stackoverflow.com/a/32108184 - Quite dumb that this is needed!
function isEmpty(obj) {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

export function apiForwardRequest({endpoint, query = {}}) {
    const authStore = useAuthStore()
    let url = "";
    console.debug(`Query: ${JSON.stringify(query)}, Endpoint: ${endpoint}`)
    if(query === undefined || isEmpty(query)) {
        url = `${import.meta.env.VITE_API_BASE}/3papi/civitai/api-proxy/${endpoint}`
    } else {
        url = `${import.meta.env.VITE_API_BASE}/3papi/civitai/api-proxy/${endpoint}?${encodeGetParams(query)}`
    }
    console.debug(`Using query parameters: ${encodeGetParams(query)}`)
    console.debug(url)
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
    // HACK: Searching by name via the CivitAi API is a bit wonky right now. To get around this, allow searching by the model ID.
    // That is, if the query is *only* numbers, then do a hit to the /models/:modelId endpoint instead.
    // Deserves its own UI, and as such this should probably only be here temporarily - but we all know how "temporary" fixes go.
    if (!isNaN(query) && query.length !== 0) {
      console.warn("Query looks to be numeric - searching by Model ID instead.");
      return apiForwardRequest({ endpoint: `models/${query}` });
    }
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

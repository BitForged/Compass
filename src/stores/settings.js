import {defineStore} from "pinia";
import {ref, toRaw} from "vue";

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref({})
    settings.value = JSON.parse(localStorage.getItem("settings")) || {}

    console.debug(`Application settings initialized to:`, toRaw(settings.value))

    function setSetting(key, value) {
        console.debug(`Setting ${key} to ${JSON.stringify(value)}`)
        settings.value[key] = value
        saveSettings()
    }

    function getSetting(key) {
        return settings.value[key] || null
    }

    function saveSettings() {
        localStorage.setItem('settings', JSON.stringify(settings.value))
        console.debug("Settings saved:", toRaw(settings.value))
    }

    return {setSetting, getSetting}
})
import {defineStore} from "pinia";
import {ref} from "vue";

export const useAlertStore = defineStore('alerts', () => {
    const alerts = ref([])

    function addAlert(message, type = 'info') {
        let alert = {message, type}
        alerts.value.push(alert)
        console.log(alert)
        setTimeout(() => removeAlert(alert), 5000)
    }

    function removeAlert(alert) {
        delete alerts.value.shift()
        console.log("Removed alert")
    }

    function getFirstAlert() {
        if(alerts.value.length === 0) {
            return null
        }
        return alerts.value[0]
    }

    return {alerts, addAlert, removeAlert, getFirstAlert}
})
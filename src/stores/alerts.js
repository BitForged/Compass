import {defineStore} from "pinia";
import {ref} from "vue";

export const useAlertStore = defineStore('alerts', () => {
    const alerts = ref([])
    const activeAlert = ref(null)
    let timeoutId = null
    function addAlert(message, type = 'info') {
        let id = Math.random().toString(36).substring(2, 15)
        let alert = {message, type, id}
        console.log(alert)

        if(!activeAlert.value) {
            setActiveAlert(alert)
        } else {
            alerts.value.push(alert)
        }
    }

    function removeAlert() {
        if(activeAlert.value) {
            clearTimeout(timeoutId);
            activeAlert.value = null
            timeoutId = null;
            const nextAlert = alerts.value.shift()
            if(nextAlert) {
                setActiveAlert(nextAlert)
            }
        }
    }

    function setActiveAlert(alert) {
        activeAlert.value = alert
        timeoutId = setTimeout(() => {
            removeAlert()
        }, 2500)
    }

    function getFirstAlert() {
        return activeAlert.value
    }

    return {addAlert, getFirstAlert}
})
import {defineStore} from "pinia";
import {ref} from "vue";
import {requestLoginToken, requestUser} from "@/services/AuthService";
import {useAlertStore} from "@/stores/alerts";

export const useAuthStore = defineStore('auth', () => {
    const user = ref({})
    const token = ref("")

    user.value = JSON.parse(localStorage.getItem("user")) || {}
    token.value = localStorage.getItem("token") || ""

    async function login(code) {
        // Use the code to hit the authorization endpoint and get back a JWT
        let resp = await requestLoginToken(code)
        user.value = resp.data.user
        token.value = resp.data.token
        console.log(resp.data)
        localStorage.setItem("token", resp.data.token)
        localStorage.setItem("user", JSON.stringify(resp.data.user))
        useAlertStore().addAlert("Successfully logged in!", "success")
    }

    function logout(forced = false) {
        token.value = ""
        user.value = null
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        if(forced) {
            useAlertStore().addAlert("You have been logged out due to your session being invalid.", "warning")
        }
    }

    function isLoggedIn() {
        return token.value !== ""
    }

    function getAvatarUrl() {
        if(user.value === null) {
            return ""
        }
        return `https://cdn.discordapp.com/avatars/${user.value.id}/${user.value.avatar}.png`
    }

    return {user, token, isLoggedIn, login, logout, getAvatarUrl}
})
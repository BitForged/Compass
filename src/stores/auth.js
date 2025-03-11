import {defineStore} from "pinia";
import {ref} from "vue";
import {requestLoginToken, requestUser} from "@/services/AuthService";
import {useAlertStore} from "@/stores/alerts";

export const useAuthStore = defineStore('auth', () => {
    const user = ref({})
    const token = ref("")
    const role = ref(0)

    user.value = JSON.parse(localStorage.getItem("user")) || {}
    token.value = localStorage.getItem("token") || ""

    async function login(code) {
        // Use the code to hit the authorization endpoint and get back a JWT
        useAlertStore().addAlert("Logging in...", "info")
        let errored = false
        let resp = await requestLoginToken(code).catch((err) => {
            console.error(err)
            useAlertStore().addAlert("Failed to log in! Please try again later.", "error")
            errored = true
        });
        if(errored) {
            return
        }
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
        this.$router.push("/").then(() => {});
    }

    function verifyTokenIsStillValid() {
        if(!isLoggedIn()) {
            return
        }
        requestUser().then((res) => {
            role.value = res.data.user.role
        }).catch(() => {
            logout(true)
        })

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

    return {user, token, role, isLoggedIn, login, logout, getAvatarUrl, verifyTokenIsStillValid}
})
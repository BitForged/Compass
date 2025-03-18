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
        try {
            let resp = await requestLoginToken(code)
            user.value = resp.data.user
            token.value = resp.data.token
            role.value = resp.data.role
            console.log(resp.data)
            localStorage.setItem("token", resp.data.token)
            localStorage.setItem("user", JSON.stringify(resp.data.user))
            useAlertStore().addAlert("Successfully logged in!", "success")
        } catch (err) {
            console.error(err)
            if(err.response && err.response.data && err.response.data.error_code === "DEMO_USER_DISABLED") {
                useAlertStore().addAlert("The demo user is not available on this instance, please login with a Discord account.", "error")
            } else if(err.response && err.response.data && err.response.data.error_code === "USER_DISABLED") {
                useAlertStore().addAlert("Your account is disabled, please contact an administrator.", "error")
            } else {
                useAlertStore().addAlert("Failed to log in! Please try again later.", "error")
            }
        }
    }

    function logout(forced = false) {
        token.value = ""
        user.value = null
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        if(forced) {
            useAlertStore().addAlert("You have been logged out due to your session expiring.", "warning")
        }
        this.$router.push("/").then(() => {});
    }

    function verifyTokenIsStillValid() {
        if(!isLoggedIn()) {
            return
        }
        requestUser().then((res) => {
            role.value = res.data.user.role
        }).catch((err) => {
            console.log("Failed to verify token", err);
            if(err.response && (err.response.status === 401 || err.response.status === 403)) {
                logout(true)
            } else {
                useAlertStore().addAlert("Failed to verify your session - Navigator and generation functions are unavailable. Please try again later.", "warning")
                this.$router.push("/").then(() => {});
            }
        })

    }

    function isLoggedIn() {
        return token.value !== ""
    }

    function getAvatarUrl() {
        if(user.value === null || user.value.avatar === null) {
            return ""
        }
        return `https://cdn.discordapp.com/avatars/${user.value.id}/${user.value.avatar}.png`
    }

    return {user, token, role, isLoggedIn, login, logout, getAvatarUrl, verifyTokenIsStillValid}
})
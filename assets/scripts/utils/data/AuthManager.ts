import FileStorage from "./FileStorage";

function isTokenExpired(): boolean {
    const auth = JSON.parse(FileStorage.load('auth') || '{}');
    const now = Math.floor(Date.now() / 1000); // 当前时间戳（秒）
    return !auth.token || !auth.expiresAt || now >= auth.expiresAt;
}

export default class AuthManager {
    static login(data: any) {
        const authData = {
            token: data.token,
            user: data.user,
            expiresAt: Math.floor(Date.now() / 1000) + data.expiresIn
        };
        FileStorage.save('auth', JSON.stringify(authData));
    }

    static logout() {
        FileStorage.clear('auth');
    }

    static getUser() {
        const auth = JSON.parse(FileStorage.load('auth') || '{}');
        return auth.user;
    }

    static getToken() {
        const auth = JSON.parse(FileStorage.load('auth') || '{}');
        return auth.token;
    }

    static isLoggedIn(): boolean {
        return !isTokenExpired();
    }

}

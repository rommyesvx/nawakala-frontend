/**
 * PRESENSI API
 */
function handleUnauthorized(res, data) {
    if (res && res.status === 401) {
        console.warn("⚠️ Sesi berakhir (HTTP 401). Mengarahkan ke login.html...");
        localStorage.removeItem("activeUser");
        sessionStorage.clear();
        const msg = data?.message || "Sesi Anda telah berakhir. Silakan login kembali.";
        if (typeof showAppModal === "function") {
            showAppModal("Sesi Berakhir", msg, "error");
            setTimeout(() => { window.location.href = "login.html"; }, 2000);
        } else {
            alert(msg);
            window.location.href = "login.html";
        }
    }
}

function formatNetworkError(err) {
    if (!navigator.onLine || (err && (err.name === 'TypeError' || (typeof err === 'string' && err.includes('Failed to fetch'))))) {
        return {
            status: "error",
            message: "Gagal terhubung ke server. Periksa koneksi internet atau data seluler Anda."
        };
    }
    return err;
}

const PresensiAPI = {
    get baseUrl() {
        return window.API_BASE_URL || "https://caraka-biroumumpbj.kemendikdasmen.go.id/api/v2";
    },

    async clockIn(token, payload) {
        try {
            const res = await fetch(`${this.baseUrl}/check-location.php`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("CLOCK IN API:", data);

            data.httpStatus = res.status;
            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Clock In API error:", err);
            throw formatNetworkError(err);
        }
    },

    async confirmKdm(token, payload) {
        try {
            const res = await fetch(`${this.baseUrl}/confirm-kdm.php`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("CONFIRM KDM API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Confirm KDM API error:", err);
            throw formatNetworkError(err);
        }
    },

    async cancelKdm(token, payload) {
        try {
            const res = await fetch(`${this.baseUrl}/cancel-kdm.php`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("CANCEL KDM API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Cancel KDM API error:", err);
            throw formatNetworkError(err);
        }
    },

    async clockOut(token, payload) {
        try {
            const res = await fetch(`${this.baseUrl}/clock-out.php`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("CLOCK OUT API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Clock Out API error:", err);
            throw formatNetworkError(err);
        }
    },

    async getHistory(token) {
        try {
            const res = await fetch(`${this.baseUrl}/history.php`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            const data = await res.json();
            console.log("HISTORY API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ History API error:", err);
            return null;
        }
    },

    async getTodayStatus(token) {
        try {
            const res = await fetch(`${this.baseUrl}/today.php`, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            const data = await res.json();
            console.log("TODAY API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Today API error:", err);
            return null;
        }
    },

    async getSchedule(token, month = null, year = null) {
        try {
            let url = `${this.baseUrl}/schedule.php`;
            const params = [];
            if (month) params.push(`month=${month}`);
            if (year) params.push(`year=${year}`);
            if (params.length > 0) url += `?${params.join('&')}`;

            const res = await fetch(url, {
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Accept": "application/json"
                }
            });

            const data = await res.json();
            console.log("SCHEDULE API:", data);

            handleUnauthorized(res, data);

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Schedule API error:", err);
            return null;
        }
    }
};

window.PresensiAPI = PresensiAPI;
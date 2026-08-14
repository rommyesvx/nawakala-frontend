/**
 * PRESENSI API
 */
const PresensiAPI = {
    baseUrl: window.API_BASE_URL,

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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Clock In API error:", err);
            throw err;
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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Confirm KDM API error:", err);
            throw err;
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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Clock Out API error:", err);
            throw err;
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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

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

            if (res.status === 401) {
                if (typeof window.handleUnauthorized === 'function') window.handleUnauthorized();
                throw data;
            }

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ Schedule API error:", err);
            return null;
        }
    }
};

window.PresensiAPI = PresensiAPI;
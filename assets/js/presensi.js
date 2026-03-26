/**
 * PRESENSI API
 */
const PresensiAPI = {
    baseUrl: "https://caraka-biroumumpbj.kemendikdasmen.go.id/api",

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

            // Tambahkan httpStatus ke dalam object data agar frontend (UI) bisa mengecek dengan mudah (Contoh: 202 untuk KDM)
            data.httpStatus = res.status;

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

            if (!res.ok) throw data;
            return data;
        } catch (err) {
            console.error("❌ History API error:", err);
            return null;
        }
    }
};

window.PresensiAPI = PresensiAPI;
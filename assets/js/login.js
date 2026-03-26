const LoginAPI = {
    baseUrl: "https://caraka-biroumumpbj.kemendikdasmen.go.id/api/v2",

    /**
     * Melakukan login user
     * @param {string} user_id - Menggunakan parameter, bukan getElementById agar function reusable
     * @param {string} user_password 
     * @returns {Promise<Object>} Response dari server
     */
    login: async function (user_id, user_password) {
        // Fallback: Jika parameter kosong, coba ambil dari DOM (untuk kompatibilitas kode lama)
        if (!user_id) user_id = document.getElementById("inputUser")?.value;
        if (!user_password) user_password = document.getElementById("inputPass")?.value;

        console.log(`Mencoba login ke: ${this.baseUrl}/login.php`);

        try {
            const response = await fetch(`${this.baseUrl}/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    user_password: user_password
                })
            });

            // 1. Cek apakah HTTP Status sukses (200-299)
            if (!response.ok) {
                // Coba ambil pesan error spesifik dari JSON server (jika ada)
                let errorMessage = `Terjadi kesalahan (Status: ${response.status})`;
                let serverResponse = null;

                try {
                    serverResponse = await response.json();
                    // Gunakan pesan dari server jika ada properti 'message' atau 'error'
                    if (serverResponse.message) errorMessage = serverResponse.message;
                    else if (serverResponse.error) errorMessage = serverResponse.error;
                } catch (jsonError) {
                    // Jika response bukan JSON (misal HTML error dari PHP), gunakan status text
                    errorMessage = `Server Error: ${response.status} ${response.statusText}`;
                }

                // Kustomisasi pesan berdasarkan kode status agar lebih user-friendly
                if (response.status === 401 || response.status === 400) {
                    errorMessage = serverResponse?.message || "user_id atau user_password yang Anda masukkan salah.";
                } else if (response.status === 404) {
                    errorMessage = "Alamat Login tidak ditemukan (404). Hubungi admin.";
                } else if (response.status >= 500) {
                    errorMessage = "Sedang terjadi gangguan pada server pusat (Error 500). Silakan coba lagi nanti.";
                }

                // Lempar error agar ditangkap blok catch di bawah
                throw new Error(errorMessage);
            }

            // 2. Jika Login Sukses
            const result = await response.json();
            return result;

        } catch (error) {
            console.error("Login Error Detail:", error);

            // 3. Membedakan Error Jaringan vs Error API
            let userMessage = error.message;

            // Jika error adalah TypeError (biasanya 'Failed to fetch' karena internet mati/CORS)
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                userMessage = "Gagal terhubung ke server. Periksa koneksi internet/WiFi Anda atau pastikan Anda terhubung ke jaringan kantor.";
            }

            // Return format object error yang konsisten
            return {
                status: 'error',
                message: userMessage,
                originalError: error.toString() // Untuk debugging developer
            };
        }
    },

    /**
     * Melakukan logout (Hapus token di server)
     * @param {string} token 
     */
    logout: async function (token) {
        if (!token) return;

        try {
            await fetch(`${this.baseUrl}/logout.php`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.warn("Logout server gagal (abaikan jika token expired).");
        }
    }
};

// Expose ke Global Window
window.LoginAPI = LoginAPI;
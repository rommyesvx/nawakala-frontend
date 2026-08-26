// ==========================================
// 1. CONFIGURATION & DATA
// ==========================================

const STORAGE_KEY_USER = 'presensi_local_user';
const STORAGE_KEY_HISTORY = 'presensi_local_history';

let currentCalendarDate = new Date();
let currentUserLat = null, currentUserLon = null;
let lastFreshGpsTime = 0;
let activeUser = null;
let currentNotifMessage = "Tidak ada notifikasi baru.";

// ==========================================
// 2. MAIN ROUTER & INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.split("/").pop() || 'index.html';
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);

    if (savedUser) {
        activeUser = JSON.parse(savedUser);
        updateUIUserData();

        updateDashboardButtonUI();

        if (window.ProfileAPI && activeUser.token) {
            window.ProfileAPI.getProfile(activeUser.token).then(apiData => {
                if (apiData) {
                    activeUser.fullname = apiData.user_name || activeUser.fullname;
                    activeUser.user_id = apiData.user_nip || apiData.user_id || activeUser.user_id;
                    activeUser.address = apiData.user_alamat || activeUser.address;
                    activeUser.ttl = apiData.user_birthday ? apiData.user_birthday.split(' ')[0] : activeUser.ttl;
                    activeUser.status = apiData.user_type || activeUser.status;
                    activeUser.user_jabatan = apiData.user_jabatan || activeUser.user_jabatan;
                    activeUser.is_security = (typeof apiData.is_security !== 'undefined') ? apiData.is_security : (apiData.user_jabatan === 'Petugas Keamanan');
                    activeUser.office = apiData.office_name || activeUser.office;

                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(activeUser));
                    updateUIUserData();

                    updateDashboardButtonUI();
                }
            });
        }

        if (page === 'login.html') {
            window.location.href = 'home.html';
            return;
        }
    } else {
        if (page !== 'login.html') {
            window.location.href = 'login.html';
            return;
        }
    }

    getLocation(false);
    initPullToRefresh();

    if (page === 'login.html') initLogin();
    else if (page === 'home.html') initHome();
    else if (page === 'presensi.html') initHistoryPage();
    else if (page === 'calendar.html') initCalendarPage();
    else if (page === 'profile.html') initProfilePage();
    else if (page === 'patrol.html') initPatrolPage();
});

// ==========================================
// 3. PAGE SPECIFIC LOGIC
// ==========================================

let isLoginSubmitting = false;

function initLogin() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (isLoginSubmitting) return;

        const inputUser = document.getElementById('inputUser');
        const inputPass = document.getElementById('inputPass');
        const email = inputUser?.value?.trim() || "";
        const pass = inputPass?.value?.trim() || "";
        const btn = form.querySelector('button');
        const originalBtnText = btn ? btn.innerHTML : "MASUK";

        if (!email || !pass) {
            return showAppModal("Gagal", "NIK/User ID dan Password wajib diisi", "error");
        }

        isLoginSubmitting = true;
        if (inputUser) inputUser.disabled = true;
        if (inputPass) inputPass.disabled = true;
        if (btn) {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Autentikasi...';
            btn.disabled = true;
        }

        let isSuccessRedirect = false;

        try {
            if (window.LoginAPI) {
                const result = await window.LoginAPI.login(email, pass);

                if (result.status === 'success' && result.data) {
                    const tempUser = result.data.user;
                    const tempToken = result.data.token;

                    if (btn) btn.innerHTML = '<i class="fas fa-sync fa-spin me-2"></i> Memuat Profil...';

                    let finalUser = {
                        username: tempUser.user_id || tempUser.name || "User",
                        fullname: tempUser.name || "User",
                        token: tempToken,
                        user_id: tempUser.user_id || "-",
                        ttl: "-",
                        address: "-",
                        status: tempUser.user_type || "Pegawai",
                        user_jabatan: tempUser.user_jabatan || null,
                        is_security: tempUser.is_security || false,
                        office: "-"
                    };

                    if (window.ProfileAPI) {
                        try {
                            const profileData = await window.ProfileAPI.getProfile(tempToken);
                            if (profileData) {
                                finalUser.fullname = profileData.user_name || finalUser.fullname;
                                finalUser.user_id = profileData.user_nip || profileData.user_id || finalUser.user_id;
                                finalUser.address = profileData.user_alamat || "-";
                                finalUser.ttl = profileData.user_birthday ? profileData.user_birthday.split(' ')[0] : "-";
                                finalUser.status = profileData.user_type || finalUser.status;
                                finalUser.user_jabatan = profileData.user_jabatan || finalUser.user_jabatan;
                                finalUser.is_security = (typeof profileData.is_security !== 'undefined') ? profileData.is_security : finalUser.is_security;
                                finalUser.office = profileData.office_name || "-";
                            }
                        } catch (errProfile) {
                            console.warn("Skip profile fetch error:", errProfile);
                        }
                    }

                    localStorage.removeItem(STORAGE_KEY_HISTORY);
                    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(finalUser));

                    isSuccessRedirect = true;
                    document.getElementById('viewLogin')?.classList.add('d-none');
                    document.getElementById('viewLoading')?.classList.remove('d-none');

                    let pct = 50;
                    const interval = setInterval(() => {
                        pct += 10;
                        const elPct = document.getElementById('loadingPercent');
                        if (elPct) elPct.innerText = pct + "%";
                        if (pct >= 100) {
                            clearInterval(interval);
                            window.location.href = 'home.html';
                        }
                    }, 50);

                } else {
                    showAppModal("Login Gagal", result.message || "User ID atau password salah", "error");
                }
            } else {
                showAppModal("Error", "Modul Login API tidak ditemukan.", "error");
            }
        } catch (error) {
            console.error("Submit error:", error);
            showAppModal("Error", "Gagal menghubungi server login.", "error");
        } finally {
            if (!isSuccessRedirect) {
                isLoginSubmitting = false;
                if (inputUser) inputUser.disabled = false;
                if (inputPass) inputPass.disabled = false;
                if (btn) {
                    btn.innerHTML = originalBtnText;
                    btn.disabled = false;
                }
            }
        }
    });
}

function initPatrolPage() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('canvas');
    const photoResult = document.getElementById('photo-result');
    const btnCapture = document.getElementById('btn-capture');
    const btnRetake = document.getElementById('btn-retake');
    const btnSend = document.getElementById('btn-send');
    const locationInfo = document.getElementById('location-info');

    let patrolLat = null;
    let patrolLon = null;
    let imageBase64 = null;

    if (!video) return;

    // A. Kamera
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = stream;
        } catch (err) {
            showAppModal("Error Kamera", "Gagal akses kamera: " + err, "error");
        }
    }
    startCamera();

    // B. GPS
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                patrolLat = position.coords.latitude;
                patrolLon = position.coords.longitude;
                if (locationInfo) {
                    locationInfo.innerHTML = `<i class="fas fa-map-marker-alt text-success"></i> Lokasi Terkunci: ${patrolLat.toFixed(5)}, ${patrolLon.toFixed(5)}`;
                    locationInfo.classList.remove('alert-light', 'text-muted');
                    locationInfo.classList.add('alert-success', 'fw-bold');
                }
                checkReady();
            },
            (error) => {
                if (locationInfo) locationInfo.innerHTML = `<i class="fas fa-exclamation-circle text-danger"></i> Gagal ambil GPS. Aktifkan lokasi!`;
            },
            { enableHighAccuracy: true }
        );
    } else {
        showAppModal("Error", "Browser tidak mendukung GPS", "error");
    }

    // C. Capture
    btnCapture.addEventListener('click', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

        video.classList.add('hidden');
        const shutter = document.getElementById('shutter-container');
        if (shutter) shutter.classList.add('hidden');
        photoResult.src = imageBase64;
        photoResult.classList.remove('hidden');
        btnRetake.classList.remove('hidden');
        checkReady();
    });

    btnRetake.addEventListener('click', () => {
        imageBase64 = null;
        photoResult.classList.add('hidden');
        video.classList.remove('hidden');
        const shutter = document.getElementById('shutter-container');
        if (shutter) shutter.classList.remove('hidden');
        btnRetake.classList.add('hidden');
        checkReady();
    });

    function checkReady() {
        if (patrolLat && patrolLon && imageBase64) {
            btnSend.disabled = false;
        } else {
            btnSend.disabled = true;
        }
    }

    // D. Kirim
    btnSend.addEventListener('click', async () => {
        const note = document.getElementById('note').value;
        const originalText = btnSend.innerHTML;
        btnSend.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
        btnSend.disabled = true;

        if (window.PatrolAPI && activeUser?.token) {
            const result = await PatrolAPI.submitReport(activeUser.token, {
                latitude: patrolLat,
                longitude: patrolLon,
                note: note,
                image: imageBase64
            });

            if (result.status === 'success') {
                showAppModal("Berhasil", "✅ " + result.message, "success");
                setTimeout(() => window.location.href = 'home.html', 2000);
            } else {
                showAppModal("Gagal", "❌ " + result.message, "error");
                btnSend.innerHTML = originalText;
                btnSend.disabled = false;
            }
        } else {
            showAppModal("Error", "Modul PatrolAPI error.", "error");
            btnSend.innerHTML = originalText;
            btnSend.disabled = false;
        }
    });
}

// -----------------------------------------------------------

async function refreshHistoryFromAPI() {
    if (!activeUser?.token || !window.PresensiAPI) {
        renderHistoryUI(getLocalHistory());
        checkTodayStatus();
        updateDashboardButtonUI();
        return;
    }

    try {
        const todayRes = await PresensiAPI.getTodayStatus(activeUser.token);
        let todayApiData = null;
        if (todayRes && todayRes.status === 'success' && todayRes.data) {
            todayApiData = todayRes.data;
            if (todayApiData.schedule) {
                updateTodayScheduleUI(todayApiData.schedule);
            }
        }

        const apiResult = await PresensiAPI.getHistory(activeUser.token);
        const historyList = Array.isArray(apiResult?.data?.history) ? apiResult.data.history : [];

        const mappedHistory = historyList.map(item => ({
            dateKey: item.tanggal,
            rawDate: `${item.hari}, ${new Date(item.tanggal).toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
            })}`,
            inTime: (item.jam_masuk && item.jam_masuk !== '-') ? item.jam_masuk : '--:--:--',
            outTime: (item.jam_keluar && item.jam_keluar !== '-') ? item.jam_keluar : '--:--:--',
            type: item.status || 'KDK'
        }));

        if (todayApiData) {
            const todayKey = formatDateKey(new Date());
            let todayItem = mappedHistory.find(h => h.dateKey === todayKey);

            if (todayApiData.status === 'not_clocked_in') {
                if (todayItem) {
                    const idx = mappedHistory.indexOf(todayItem);
                    if (idx > -1) mappedHistory.splice(idx, 1);
                }
            } else {
                const formatTime = (timeStr) => {
                    if (!timeStr) return '--:--:--';
                    const parts = timeStr.split(' ');
                    return parts[1] || timeStr;
                };

                const inTime = formatTime(todayApiData.clock_in_time);
                const outTime = formatTime(todayApiData.clock_out_time);

                if (todayItem) {
                    if (inTime !== '--:--:--') todayItem.inTime = inTime;
                    if (outTime !== '--:--:--') todayItem.outTime = outTime;
                } else {
                    mappedHistory.push({
                        dateKey: todayKey,
                        rawDate: new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
                        inTime: inTime,
                        outTime: outTime,
                        type: 'KDK'
                    });
                }
            }
        }

        saveLocalHistory(mappedHistory);
        renderHistoryUI(mappedHistory);
        updateWeeklyStatusBubbles(historyList);

    } catch (err) {
        console.warn("Skip refreshHistoryFromAPI error:", err);
        renderHistoryUI(getLocalHistory());
    }

    checkTodayStatus();
    updateDashboardButtonUI();
}

async function initHome() {
    updateDateDisplay();
    setInterval(() => { checkNotification(); }, 1000);
    await refreshHistoryFromAPI();
}

async function initHistoryPage() {
    await refreshHistoryFromAPI();
}

function initCalendarPage() {
    renderCalendar();
}

function initProfilePage() {
}

function updateTodayScheduleUI(schedule) {
    if (!schedule) return;
    const targetInEl = document.getElementById('targetInDisplay');
    const targetOutEl = document.getElementById('targetOutDisplay');
    const officeEl = document.getElementById('officePlotingDisplay');
    const badgeEl = document.getElementById('scheduleSourceBadge');

    let inTime = schedule.formatted_in_target || schedule.clock_in_target;
    let outTime = schedule.formatted_out_target || schedule.clock_out_target;

    if (!inTime || inTime === '00:00' || inTime === '00:00:00' || inTime === '-') {
        inTime = '07:30';
    } else if (inTime.length > 5) {
        inTime = inTime.substring(0, 5);
    }

    if (!outTime || outTime === '00:00' || outTime === '00:00:00' || outTime === '-') {
        outTime = '16:00';
    } else if (outTime.length > 5) {
        outTime = outTime.substring(0, 5);
    }

    if (targetInEl) {
        targetInEl.innerText = inTime;
    }
    if (targetOutEl) {
        targetOutEl.innerText = outTime;
    }
    if (officeEl) {
        officeEl.innerText = schedule.office_name || activeUser?.office || 'Kantor Utama';
    }
    if (badgeEl) {
        if (schedule.has_schedule) {
            badgeEl.innerHTML = `<i class="fas fa-check-circle me-1 text-success"></i>Ploting Admin`;
        } else {
            badgeEl.innerHTML = `<i class="fas fa-clock me-1 text-secondary"></i>Jam Reguler`;
        }
    }
}

// ==========================================
// 4. SHARED FUNCTIONS
// ==========================================

function updateUIUserData() {
    if (!activeUser) return;

    document.querySelectorAll('.user-fullname-text').forEach(el => el.innerText = activeUser.fullname);

    const nameParts = (activeUser.fullname || "").trim().split(/\s+/);
    let initials = '';
    for (let i = 0; i < Math.min(nameParts.length, 3); i++) {
        if (nameParts[i]) initials += nameParts[i].charAt(0).toUpperCase();
    }

    document.querySelectorAll('.user-initials').forEach(el => el.innerText = initials);

    if (document.getElementById('profInitials')) {
        document.getElementById('profInitials').innerText = initials;
        if (initials.length === 3) document.getElementById('profInitials').style.fontSize = "2rem";
        else document.getElementById('profInitials').style.fontSize = "";
    }

    if (document.getElementById('profName')) document.getElementById('profName').innerText = activeUser.fullname;
    if (document.getElementById('profuser_id')) document.getElementById('profuser_id').innerText = activeUser.user_id;
    if (document.getElementById('profTTL')) document.getElementById('profTTL').innerText = activeUser.ttl;
    if (document.getElementById('profAddress')) document.getElementById('profAddress').innerText = activeUser.address;
    if (document.getElementById('profOffice')) document.getElementById('profOffice').innerText = activeUser.office || "-";
}

function showLoadingBar(message = "Mencatat presensi...") {
    let overlay = document.getElementById('attendanceLoadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'attendanceLoadingOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div style="
            background: #ffffff;
            padding: 24px 28px;
            border-radius: 24px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 320px;
            width: 85%;
        ">
            <div style="position: relative; width: 64px; height: 64px; margin: 0 auto 16px auto;">
                <div class="spinner-border text-primary" style="width: 64px; height: 64px; border-width: 4px;" role="status"></div>
                <i class="fas fa-fingerprint text-primary position-absolute top-50 start-50 translate-middle" style="font-size: 1.5rem;"></i>
            </div>
            <h6 style="font-weight: 700; color: #0f172a; margin-bottom: 6px; font-size: 1rem;">${message}</h6>
            <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 14px;">Mohon tunggu sebentar...</p>
            <div class="progress" style="height: 6px; border-radius: 10px; background: #e2e8f0; overflow: hidden;">
                <div class="progress-bar progress-bar-striped progress-bar-animated bg-primary" style="width: 100%;"></div>
            </div>
        </div>
    `;
    overlay.style.display = 'flex';
}

function hideLoadingBar() {
    const overlay = document.getElementById('attendanceLoadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

function showToastNotification(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toastNotificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastNotificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 100000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            pointer-events: none;
            width: 90%;
            max-width: 420px;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    const isSuccess = type === 'success';
    const isError = type === 'error';
    
    const bgColor = isSuccess ? '#059669' : isError ? '#dc2626' : '#d97706';
    const iconClass = isSuccess ? 'fa-check-circle' : isError ? 'fa-exclamation-triangle' : 'fa-info-circle';

    toast.style.cssText = `
        background: ${bgColor};
        color: #ffffff;
        padding: 14px 22px;
        border-radius: 50px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
        font-weight: 600;
        pointer-events: auto;
        animation: slideDownToast 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        width: 100%;
        justify-content: center;
        text-align: center;
    `;

    toast.innerHTML = `<i class="fas ${iconClass} fs-5"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideUpToast 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => toast.remove(), 350);
    }, duration);
}

let isAttendanceProcessing = false;
let isKdmConfirming = false;

function formatErrorMessage(err) {
    if (!navigator.onLine || (err && (err.name === 'TypeError' || (typeof err === 'string' && err.includes('Failed to fetch'))))) {
        return "Gagal terhubung ke server. Periksa koneksi internet atau data seluler Anda.";
    }
    return typeof err === 'string' ? err : (err?.message || err?.error || err?.status || "Terjadi kesalahan saat presensi.");
}

function processAttendance() {
    if (isAttendanceProcessing) {
        console.warn("⚠️ Presensi sedang diproses, mengabaikan klik ganda.");
        return;
    }

    if (!navigator.geolocation) {
        showAppModal("Error", "Browser tidak mendukung GPS", "error");
        return;
    }

    const gpsAge = Date.now() - lastFreshGpsTime;
    if (currentUserLat !== null && currentUserLon !== null && lastFreshGpsTime > 0 && gpsAge < 45000) {
        console.log(`⚡ Menggunakan lokasi GPS segar (${Math.round(gpsAge / 1000)}s lalu) - Instan!`);
        executeAttendanceLogic();
        return;
    }

    isAttendanceProcessing = true;
    showLoadingBar("Mengunci lokasi GPS...");

    navigator.geolocation.getCurrentPosition(
        (p) => {
            currentUserLat = p.coords.latitude;
            currentUserLon = p.coords.longitude;
            lastFreshGpsTime = Date.now();

            const coordsStr = `${currentUserLat.toFixed(5)}, ${currentUserLon.toFixed(5)}`;
            const cachedRaw = localStorage.getItem("user_location_cache");
            let locName = coordsStr;
            if (cachedRaw) {
                try {
                    const parsed = JSON.parse(cachedRaw);
                    if (parsed.name) locName = parsed.name;
                } catch (e) {}
            }
            localStorage.setItem("user_location_cache", JSON.stringify({
                lat: currentUserLat,
                lng: currentUserLon,
                name: locName,
                teks_tampil: locName,
                timestamp: Date.now()
            }));

            hideLoadingBar();
            executeAttendanceLogic();
        },
        (err) => {
            console.warn("⚠️ Perhatian: Gagal memperbarui GPS baru, mencoba pakai koordinat terakhir:", err);
            if (currentUserLat !== null && currentUserLon !== null) {
                hideLoadingBar();
                executeAttendanceLogic();
            } else if (err && err.code === err.TIMEOUT) {
                console.log("🔄 Percobaan ulang lokasi dengan akurasi jaringan...");
                navigator.geolocation.getCurrentPosition(
                    (pLow) => {
                        currentUserLat = pLow.coords.latitude;
                        currentUserLon = pLow.coords.longitude;
                        lastFreshGpsTime = Date.now();
                        hideLoadingBar();
                        executeAttendanceLogic();
                    },
                    (errLow) => {
                        isAttendanceProcessing = false;
                        hideLoadingBar();
                        showAppModal("Gagal", "Gagal mendapatkan lokasi GPS. Waktu pencarian habis. Pastikan lokasi/GPS HP aktif.", "error");
                    },
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                );
            } else {
                isAttendanceProcessing = false;
                hideLoadingBar();
                showAppModal("Gagal", "Gagal mendapatkan lokasi GPS. Aktifkan GPS Anda.", "error");
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
}

// --- FUNGSI HELPER: CEK ROLE & UPDATE TAMPILAN ---


function isUserSatpam() {
    if (!activeUser) return false;

    if (activeUser.is_security === true) return true;

    const jabatan = (activeUser.user_jabatan || activeUser.status || "").toLowerCase();
    const nama = (activeUser.fullname || "").toLowerCase();

    const keywords = ["satpam", "security", "keamanan", "pengamanan", "guard", "petugas keamanan"];

    return keywords.some(key => jabatan.includes(key) || nama.includes(key));
}

function updateDashboardButtonUI() {
    const btnDesktop = document.querySelector('.nav-container button.btn-gradient') || document.querySelector('.nav-container button.btn-warning');
    const fabMobile = document.querySelector('.fab-btn');

    if (!btnDesktop && !fabMobile) return;

    const isSatpam = isUserSatpam();

    if (isSatpam) {
        if (btnDesktop) {
            btnDesktop.className = "btn btn-warning rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2";
            btnDesktop.innerHTML = `<i class="fas fa-user-shield"></i> <span>Presensi & Lapor Patroli</span>`;
            btnDesktop.style.background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
            btnDesktop.style.color = "#ffffff";
            btnDesktop.style.border = "none";
        }
        if (fabMobile) {
            fabMobile.style.borderColor = "#f59e0b";
            fabMobile.style.color = "#d97706";
            fabMobile.innerHTML = `<i class="fas fa-user-shield"></i>`;
        }
    } else {
        if (btnDesktop) {
            btnDesktop.className = "btn btn-primary rounded-pill px-4 fw-bold shadow-sm btn-gradient d-flex align-items-center gap-2";
            btnDesktop.innerHTML = `<i class="fas fa-fingerprint"></i> <span>Absen Sekarang</span>`;
            btnDesktop.style.background = "";
            btnDesktop.style.color = "";
            btnDesktop.style.border = "";
        }
        if (fabMobile) {
            fabMobile.style.borderColor = "#38bdf8";
            fabMobile.style.color = "#0ea5e9";
            fabMobile.innerHTML = `<i class="fas fa-fingerprint"></i>`;
        }
    }
}


// ==========================================
// KONTROL MODAL KDM
// ==========================================
window.closeKdmModal = () => {
    document.getElementById('kdmConfirmModal').classList.add('d-none');
    window.pendingKdmData = null;
    window.currentAttendanceId = null;
};

window.confirmKdmAttendance = async () => {
    if (isKdmConfirming) return;
    isKdmConfirming = true;

    const pendingData = window.pendingKdmData;
    const attId = window.currentAttendanceId;
    closeKdmModal();

    if (window.PresensiAPI && activeUser?.token) {
        try {
            showAppModal("Info", "Mengonfirmasi kehadiran KDM...", "warning");
            const payload = {
                latitude: pendingData?.latitude || currentUserLat,
                longitude: pendingData?.longitude || currentUserLon,
                confirmation_status: true
            };
            if (attId && typeof attId === 'number' && attId > 0) {
                payload.attendance_id = attId;
            }
            await PresensiAPI.confirmKdm(activeUser.token, payload);
            closeAppModal();
            finishClockInUI('KDM');
        } catch (err) {
            closeAppModal();
            const errMsg = formatErrorMessage(err);
            showAppModal("Gagal", "Gagal mengonfirmasi KDM: " + errMsg, "error");
        } finally {
            isKdmConfirming = false;
        }
    } else {
        isKdmConfirming = false;
        showAppModal("Error", "Sesi atau API tidak tersedia.", "error");
    }
};

async function executeAttendanceLogic() {
    if (currentUserLat == null || currentUserLon == null) {
        processAttendance();
        return;
    }

    const now = new Date();
    const hour = now.getHours();
    const todayKey = formatDateKey(now);
    const timeStr = formatTimeOnly(now);

    const history = getLocalHistory();
    let existingIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].dateKey === todayKey) {
            existingIndex = i;
            break;
        }
    }
    const todayRecord = existingIndex > -1 ? history[existingIndex] : null;

    const isValidTime = (t) => Boolean(t && t !== '--:--:--' && t !== '-' && t !== '' && t !== 'null' && t !== 'undefined');

    const isClockedIn = todayRecord && isValidTime(todayRecord.inTime);
    const isClockedOut = todayRecord && isValidTime(todayRecord.outTime);
    const isSatpam = isUserSatpam();

    if (isSatpam && isClockedIn && !isClockedOut && hour < 16) {
        isAttendanceProcessing = false;
        window.location.href = "patrol.html";
        return;
    }

    try {
        if (existingIndex > -1 && isClockedIn && !isClockedOut) {
            showLoadingBar("Mencatat presensi pulang...");
            if (window.PresensiAPI && activeUser?.token) {
                await PresensiAPI.clockOut(activeUser.token, {
                    latitude: currentUserLat,
                    longitude: currentUserLon
                });
            }
            hideLoadingBar();

            showToastNotification("Presensi Berhasil Dicatat", "success");
            await refreshHistoryFromAPI();
            return;
        }

        showLoadingBar("Mencatat presensi masuk...");
        if (window.PresensiAPI && activeUser?.token) {
            const result = await PresensiAPI.clockIn(activeUser.token, {
                latitude: currentUserLat,
                longitude: currentUserLon
            });
            hideLoadingBar();

            if (result && result.httpStatus === 202) {
                window.pendingKdmData = {
                    latitude: currentUserLat,
                    longitude: currentUserLon
                };
                window.currentAttendanceId = result.data?.attendance_id || null;
                document.getElementById('kdmConfirmModal').classList.remove('d-none');
            } else if (result && result.httpStatus === 200) {
                await finishClockInUI('KDK');
            }
        } else {
            hideLoadingBar();
            showToastNotification("PresensiAPI / Token tidak tersedia", "error");
        }

    } catch (err) {
        hideLoadingBar();
        const errMsg = formatErrorMessage(err);
        showToastNotification(errMsg, "error", 5000);
    } finally {
        isAttendanceProcessing = false;
    }
}

async function finishClockInUI(statusPresensi) {
    showToastNotification("Presensi Berhasil Dicatat", "success");
    await refreshHistoryFromAPI();
}

function renderHistoryUI(historyData) {
    if (!Array.isArray(historyData)) historyData = [];

    // Grouping per tanggal (dateKey) agar tidak membuat card/baris baru jika ada multiple entry di tanggal yang sama
    const groupedMap = new Map();
    historyData.forEach(item => {
        if (!item.dateKey) return;
        if (!groupedMap.has(item.dateKey)) {
            groupedMap.set(item.dateKey, { ...item });
        } else {
            const existing = groupedMap.get(item.dateKey);
            if (item.inTime && item.inTime !== '--:--:--') existing.inTime = item.inTime;
            if (item.outTime && item.outTime !== '--:--:--') existing.outTime = item.outTime;
            if (item.type) existing.type = item.type;
        }
    });

    const consolidatedHistory = Array.from(groupedMap.values());
    consolidatedHistory.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

    const dashList = document.getElementById('dashboardHistoryList');
    if (dashList) {
        let kdk = 0, kdm = 0, html = '';
        const countedDates = new Set();

        consolidatedHistory.forEach((rec, idx) => {
            if (!countedDates.has(rec.dateKey)) {
                countedDates.add(rec.dateKey);
                if (rec.type === 'KDK') kdk++; else kdm++;
            }

            const badgeColor = '#f59e0b';

            if (idx < 3) {
                html += `
                 <div class="hist-item-gradient mb-2">
                    <div>
                        <div class="fw-bold small">${rec.rawDate}</div>
                        <div class="d-flex gap-3 mt-1" style="font-size:0.75rem">
                            <span><i class="fas fa-door-open text-success"></i> ${rec.inTime}</span>
                            <span><i class="fas fa-door-closed text-danger"></i> ${rec.outTime}</span>
                        </div>
                    </div>
                    <span class="badge shadow-sm fw-bold" style="background-color: ${badgeColor}; color: white;">${rec.type}</span>
                 </div>`;
            }
        });
        dashList.innerHTML = html || '<div class="text-center text-muted small py-3">Belum ada riwayat.</div>';
        if (document.getElementById('countKDK')) document.getElementById('countKDK').innerText = kdk;
        if (document.getElementById('countKDM')) document.getElementById('countKDM').innerText = kdm;
    }

    const tableList = document.getElementById('fullHistoryList');
    if (tableList) {
        let fullHtml = '';
        consolidatedHistory.forEach(rec => {
            const dateParts = rec.rawDate.split(',');
            const dayName = dateParts[0];
            const fullDate = dateParts[1] || rec.rawDate;
            const badgeColor = '#f59e0b';

            fullHtml += `
             <tr>
                <td class="ps-4 py-3">
                    <div class="d-flex flex-column">
                        <span class="fw-bold text-dark">${dayName}</span>
                        <small class="text-muted" style="font-size:0.75rem">${fullDate}</small>
                    </div>
                </td>
                <td class="align-middle"><span class="badge rounded-pill px-3" style="background-color: ${badgeColor}; color: white;">${rec.type}</span></td>
                <td class="align-middle font-monospace small">${rec.inTime}</td>
                <td class="align-middle font-monospace small">${rec.outTime}</td>
             </tr>`;
        });
        tableList.innerHTML = fullHtml || '<tr><td colspan="4" class="text-center py-4 text-muted">Belum ada data presensi.</td></tr>';
    }
}

function checkTodayStatus() {
    const todayKey = formatDateKey(new Date());
    const history = getLocalHistory();
    let todayData = null;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].dateKey === todayKey) {
            todayData = history[i];
            break;
        }
    }

    const elIn = document.getElementById('clockInDisplay');
    const elOut = document.getElementById('clockOutDisplay');

    if (elIn && elOut) {
        if (todayData) {
            elIn.innerText = todayData.inTime;
            elOut.innerText = todayData.outTime;
        } else {
            elIn.innerText = '--:--:--';
            elOut.innerText = '--:--:--';
        }
    }
}

function updateWeeklyStatusBubbles(apiHistory = null) {
    const container = document.getElementById('weeklyBubbles');
    if (!container) return;

    const history = getLocalHistory();
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const mondayDate = new Date(now);
    mondayDate.setDate(now.getDate() - distanceToMonday);

    let html = '';
    const days = ['S', 'S', 'R', 'K', 'J'];

    for (let i = 0; i < 5; i++) {
        const checkDate = new Date(mondayDate);
        checkDate.setDate(mondayDate.getDate() + i);
        const dateKey = formatDateKey(checkDate);

        const record = history.find(h => h.dateKey === dateKey && h.inTime !== '--:--:--');

        if (record) {
            html += `<div class="bubble active"><i class="fas fa-check"></i></div>`;
        } else {
            html += `<div class="bubble" style="font-size: 0.6rem; opacity: 0.7;">${days[i]}</div>`;
        }
    }
    container.innerHTML = html;
}

// ==========================================
// 5. HELPER UTILS & NOTIFICATIONS
// ==========================================

function checkNotification() {
    const now = new Date();
    const hour = now.getHours();

    const elIn = document.getElementById('clockInDisplay');
    const elOut = document.getElementById('clockOutDisplay');

    if (!elIn || !elOut) return;

    const isCheckedIn = elIn.innerText !== '--:--:--';
    const isCheckedOut = elOut.innerText !== '--:--:--';

    let hasNotif = false;
    currentNotifMessage = "Tidak ada notifikasi baru.";

    if (hour >= 7 && hour < 8 && !isCheckedIn) {
        hasNotif = true;
        currentNotifMessage = "🔔 <b>Pengingat Masuk</b><br>Halo! Jangan lupa untuk melakukan presensi Masuk hari ini.";
    }
    else if (hour >= 16 && hour < 17 && isCheckedIn && !isCheckedOut) {
        hasNotif = true;
        currentNotifMessage = "🔔 <b>Pengingat Pulang</b><br>Halo! Pekerjaan hari ini selesai, silahkan presensi Pulang.";
    }

    const badges = document.querySelectorAll('#notifBadge');
    badges.forEach(el => {
        if (hasNotif) el.classList.remove('d-none');
        else el.classList.add('d-none');
    });
}

function getLocalHistory() {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.history)) return parsed.history;
    return [];
}

function saveLocalHistory(data) {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(data));
}
function formatDateKey(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatTimeOnly(dateObj) {
    return dateObj.toLocaleTimeString('en-GB', { hour12: false });
}

function updateDateDisplay() {
    const d = new Date();
    if (document.getElementById('dashDateNum')) {
        const dNum = d.getDate();
        document.getElementById('dashDateNum').innerText = dNum;
        document.getElementById('dashDateDay').innerText = d.toLocaleDateString('id-ID', { weekday: 'long' });
        document.getElementById('dashDateMonth').innerText = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
}

function getLocation(forceLoadingText = false) {
    const textEls = document.querySelectorAll('.locationTextShort');
    const cachedRaw = localStorage.getItem("user_location_cache");

    if (cachedRaw) {
        try {
            const cached = JSON.parse(cachedRaw);
            if (cached.lat && cached.lng) {
                currentUserLat = cached.lat;
                currentUserLon = cached.lng;
                const cachedName = cached.name || cached.teks_tampil || `${cached.lat.toFixed(5)}, ${cached.lng.toFixed(5)}`;
                textEls.forEach(el => { el.innerText = cachedName; });
            }
        } catch (e) {}
    } else if (forceLoadingText) {
        textEls.forEach(el => { el.innerText = "Mencari..."; });
    }

    if (!navigator.geolocation) return;

    if (!window.gpsWatchId) {
        window.gpsWatchId = navigator.geolocation.watchPosition(
            (p) => {
                currentUserLat = p.coords.latitude;
                currentUserLon = p.coords.longitude;
                lastFreshGpsTime = Date.now();
            },
            (err) => console.warn("Background GPS Watcher warning:", err),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }

    navigator.geolocation.getCurrentPosition(
        (p) => {
            currentUserLat = p.coords.latitude;
            currentUserLon = p.coords.longitude;
            lastFreshGpsTime = Date.now();

            fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${currentUserLat}&longitude=${currentUserLon}&localityLanguage=id`)
                .then(res => res.json())
                .then(data => {
                    const locality = (data.locality || '').trim();
                    const city = (data.city || '').trim();
                    let locName = locality;
                    if (city && city !== locality) {
                        locName = locName ? `${locName}, ${city}` : city;
                    }
                    const finalLocName = locName || `${currentUserLat.toFixed(5)}, ${currentUserLon.toFixed(5)}`;

                    localStorage.setItem("user_location_cache", JSON.stringify({
                        lat: currentUserLat,
                        lng: currentUserLon,
                        name: finalLocName,
                        teks_tampil: finalLocName,
                        timestamp: Date.now()
                    }));

                    textEls.forEach(el => { el.innerText = finalLocName; });
                })
                .catch(() => {
                    const coordsStr = `${currentUserLat.toFixed(5)}, ${currentUserLon.toFixed(5)}`;
                    localStorage.setItem("user_location_cache", JSON.stringify({
                        lat: currentUserLat,
                        lng: currentUserLon,
                        name: coordsStr,
                        teks_tampil: coordsStr,
                        timestamp: Date.now()
                    }));
                    textEls.forEach(el => { el.innerText = coordsStr; });
                });
        },
        () => {
            if (!localStorage.getItem("user_location_cache")) {
                textEls.forEach(el => { el.innerText = "Gagal melacak lokasi"; });
            }
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

async function renderCalendar() {
    const elGrid = document.getElementById('calendarGrid');
    if (!elGrid) return;

    elGrid.innerHTML = '<div class="col-12 text-center py-5 text-muted"><i class="fas fa-spinner fa-spin"></i> Memuat...</div>';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    document.getElementById('calendarTitle').innerText = `${monthNames[month]} ${year}`;

    let holidaysData = {};
    if (window.CalendarAPI) {
        holidaysData = await window.CalendarAPI.getHolidays(month + 1, year);
    } else {
        console.error("Gagal memuat CalendarAPI.");
    }

    let schedulesMap = {};
    let userSchedules = [];
    if (window.PresensiAPI && activeUser?.token) {
        const scheduleRes = await window.PresensiAPI.getSchedule(activeUser.token, month + 1, year);
        if (scheduleRes && scheduleRes.status === 'success' && Array.isArray(scheduleRes.data?.schedules)) {
            userSchedules = scheduleRes.data.schedules;
            userSchedules.forEach(item => {
                schedulesMap[item.schedule_date] = item;
            });
        }
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = '';
    let holidaysInMonth = [];

    for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day faded"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        const strMonth = String(month + 1).padStart(2, '0');
        const strDay = String(day).padStart(2, '0');
        const dateKey = `${year}-${strMonth}-${strDay}`;

        const holiday = holidaysData[dateKey];
        const schedule = schedulesMap[dateKey];
        const dateCheck = new Date(year, month, day);
        const isWeekend = dateCheck.getDay() === 0 || dateCheck.getDay() === 6;

        let classes = 'calendar-day';

        if (today.getDate() === day && today.getMonth() === month && today.getFullYear() === year) {
            classes += ' today';
        } else if (holiday) {
            holidaysInMonth.push({ date: day, name: holiday.name, type: holiday.type });
            classes += holiday.type === 'cuti' ? ' text-warning fw-bold' : ' text-danger fw-bold';
        } else if (schedule) {
            classes += ' border border-primary text-primary fw-bold';
        } else if (isWeekend) {
            classes += ' text-danger';
        }

        const hist = getLocalHistory();
        const hasAbsen = hist.find(h => h.dateKey === dateKey && h.outTime !== '--:--:--');
        
        let dots = '';
        if (hasAbsen) {
            dots += `<div style="height:4px;width:4px;background:#10b981;border-radius:50%"></div>`;
        }
        if (schedule) {
            dots += `<div style="height:4px;width:4px;background:#0d6efd;border-radius:50%"></div>`;
        }

        let onclick = '';
        if (holiday) {
            const safeName = holiday.name.replace(/'/g, "\\'");
            onclick = `onclick="showHolidayInfo('${safeName}', '${day} ${monthNames[month]}', '${holiday.type}')"`;
        } else if (schedule) {
            const safeOffice = schedule.office_name.replace(/'/g, "\\'");
            const inT = schedule.formatted_in_target || '-';
            const outT = schedule.formatted_out_target || '-';
            onclick = `onclick="showScheduleInfo('${day} ${monthNames[month]} ${year}', '${safeOffice}', '${inT}', '${outT}')"`;
        }

        html += `<div class="${classes}" ${onclick} style="cursor: pointer;">
                    <div class="d-flex flex-column align-items-center justify-content-center w-100 h-100 position-relative">
                        <span>${day}</span>
                        <div class="d-flex gap-1 align-items-center mt-1">${dots}</div>
                    </div>
                 </div>`;
    }
    elGrid.innerHTML = html;

    const holList = document.getElementById('holidayList');
    if (holList) {
        let listHtml = '';

        if (holidaysInMonth.length > 0) {
            listHtml += `<h6 class="fw-bold text-dark mb-2 mt-3" style="font-size: 0.9rem;"><i class="fas fa-calendar-times text-danger me-2"></i>Hari Libur Bulan Ini</h6>`;
            holidaysInMonth.forEach(h => {
                const badgeClass = h.type === 'cuti' ? 'bg-warning text-dark' : 'bg-danger text-white';
                const badgeText = h.type === 'cuti' ? 'Cuti Bersama' : 'Libur Nasional';

                listHtml += `<div class="d-flex align-items-center gap-3 bg-white p-3 rounded-4 shadow-sm border-0 mb-2">
                            <div class="d-flex flex-column align-items-center justify-content-center bg-light rounded-3" style="width:45px;height:45px">
                                <span class="fw-bold text-dark fs-5 mb-0" style="line-height:1">${h.date}</span>
                            </div>
                            <div class="flex-grow-1">
                                <h6 class="fw-bold text-dark mb-1 small">${h.name}</h6>
                                <span class="badge ${badgeClass} rounded-pill" style="font-size:0.6rem">${badgeText}</span>
                            </div>
                        </div>`;
            });
        } else {
            listHtml = `<div class="text-center text-muted small py-3">Tidak ada hari libur bulan ini.</div>`;
        }

        holList.innerHTML = listHtml;
    }
}

// ==========================================
// 6. GLOBAL WINDOW EXPORTS
// ==========================================

window.changeMonth = (step) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + step);
    renderCalendar();
};

window.showScheduleInfo = (dateStr, officeName, clockIn, clockOut) => {
    showAppModal(
        "Jadwal Ploting Absen",
        `<div class="text-center">
            <h6 class="fw-bold mb-3 text-primary"><i class="fas fa-calendar-day me-1"></i>${dateStr}</h6>
            <div class="p-3 bg-light rounded-4 text-start mb-2">
                <div class="mb-2">
                    <small class="text-muted d-block">Lokasi Penugasan / Kantor</small>
                    <span class="fw-bold text-dark"><i class="fas fa-building text-primary me-1"></i>${officeName}</span>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-6">
                        <small class="text-muted d-block mb-1">Target Masuk</small>
                        <span class="badge bg-success font-monospace px-3 py-2 w-100" style="font-size: 0.85rem;"><i class="fas fa-sign-in-alt me-1"></i>${clockIn}</span>
                    </div>
                    <div class="col-6">
                        <small class="text-muted d-block mb-1">Target Pulang</small>
                        <span class="badge bg-danger font-monospace px-3 py-2 w-100" style="font-size: 0.85rem;"><i class="fas fa-sign-out-alt me-1"></i>${clockOut}</span>
                    </div>
                </div>
            </div>
        </div>`,
        "info"
    );
};

window.showHolidayInfo = (name, date, type) => {
    showAppModal(type === 'cuti' ? "Cuti Bersama" : "Libur Nasional", `<h6 class="fw-bold">${date}</h6><p class="mb-0 text-muted">${name}</p>`, type === 'cuti' ? 'warning' : 'error');
};

window.showAppModal = (t, m, type = 'success') => {
    document.getElementById('modalTitle').innerText = t;
    document.getElementById('modalMessage').innerHTML = m;
    const icon = document.getElementById('modalIcon');
    const bg = document.getElementById('modalIconBg');

    if (type === 'error') { icon.className = 'fas fa-times'; bg.style.background = '#fee2e2'; bg.style.color = '#ef4444'; }
    else if (type === 'warning') { icon.className = 'fas fa-exclamation-triangle'; bg.style.background = '#fef3c7'; bg.style.color = '#d97706'; }
    else { icon.className = 'fas fa-check'; bg.style.background = '#e0f2fe'; bg.style.color = '#0ea5e9'; }

    document.getElementById('appModal').classList.remove('d-none');
};

window.closeAppModal = () => document.getElementById('appModal').classList.add('d-none');
window.handleLogout = () => document.getElementById('logoutModal').classList.remove('d-none');
window.closeLogoutModal = () => document.getElementById('logoutModal').classList.add('d-none');

window.confirmLogout = async () => {
    const savedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (savedUser) {
        const user = JSON.parse(savedUser);
        if (window.LoginAPI && user.token) {
            await window.LoginAPI.logout(user.token);
        }
    }
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
    window.location.href = 'login.html';
};

window.processAttendance = processAttendance;
window.refreshLocation = () => {
    const icons = document.querySelectorAll('.fa-sync-alt');
    icons.forEach(i => i.classList.add('fa-spin'));
    getLocation();
    setTimeout(() => icons.forEach(i => i.classList.remove('fa-spin')), 1500);
};
window.handleNotificationClick = () => {
    showAppModal("Notifikasi", currentNotifMessage || "Tidak ada notifikasi baru.");
};

window.toggleProfileDropdown = (event) => {
    event.stopPropagation();
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.classList.toggle('d-none');
    }
};

document.addEventListener('click', (event) => {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown && !dropdown.classList.contains('d-none') && !dropdown.contains(event.target)) {
        dropdown.classList.add('d-none');
    }
});

// ==========================================
// PULL TO REFRESH (SWIPE DOWN TO REFRESH)
// ==========================================
function initPullToRefresh() {
    let startY = 0;
    let currentY = 0;
    let isPulling = false;
    let isRefreshing = false;
    const threshold = 60;

    let ptrEl = document.getElementById('ptrIndicator');
    if (!ptrEl) {
        ptrEl = document.createElement('div');
        ptrEl.id = 'ptrIndicator';
        ptrEl.className = 'ptr-element';
        ptrEl.innerHTML = `
            <div class="ptr-box">
                <i class="fas fa-arrow-down ptr-icon" id="ptrIcon"></i>
                <span id="ptrText">Tarik untuk menyegarkan</span>
            </div>
        `;
        document.body.prepend(ptrEl);
    }

    const ptrIcon = document.getElementById('ptrIcon');
    const ptrText = document.getElementById('ptrText');

    window.addEventListener('touchstart', (e) => {
        if (isRefreshing) return;
        if (window.scrollY === 0 || document.documentElement.scrollTop === 0) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (!isPulling || isRefreshing) return;

        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;

        if (deltaY > 0 && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
            const pullDistance = Math.min(deltaY * 0.45, 80);
            ptrEl.style.transform = `translateY(${pullDistance}px)`;

            if (pullDistance >= threshold) {
                if (ptrText) ptrText.innerText = "Lepaskan untuk menyegarkan";
                if (ptrIcon) ptrIcon.style.transform = "rotate(180deg)";
            } else {
                if (ptrText) ptrText.innerText = "Tarik untuk menyegarkan";
                if (ptrIcon) ptrIcon.style.transform = "rotate(0deg)";
            }
        }
    }, { passive: true });

    window.addEventListener('touchend', async () => {
        if (!isPulling || isRefreshing) return;
        isPulling = false;

        const deltaY = currentY - startY;
        const pullDistance = Math.min(deltaY * 0.45, 80);

        if (pullDistance >= threshold && (window.scrollY === 0 || document.documentElement.scrollTop === 0)) {
            isRefreshing = true;
            ptrEl.style.transform = `translateY(65px)`;
            if (ptrIcon) {
                ptrIcon.className = "fas fa-sync-alt ptr-icon ptr-spinning";
                ptrIcon.style.transform = "rotate(0deg)";
            }
            if (ptrText) ptrText.innerText = "Memperbarui data...";

            try {
                if (typeof window.refreshLocation === 'function') {
                    window.refreshLocation();
                }
                if (typeof refreshHistoryFromAPI === 'function') {
                    await refreshHistoryFromAPI();
                }
                if (typeof updateDashboardButtonUI === 'function') {
                    updateDashboardButtonUI();
                }
                if (typeof showToastNotification === 'function') {
                    showToastNotification("Data berhasil diperbarui", "success", 2500);
                }
            } catch (err) {
                console.error("Gagal memperbarui data swipe:", err);
            } finally {
                setTimeout(() => {
                    ptrEl.style.transform = `translateY(0px)`;
                    setTimeout(() => {
                        if (ptrIcon) ptrIcon.className = "fas fa-arrow-down ptr-icon";
                        if (ptrText) ptrText.innerText = "Tarik untuk menyegarkan";
                        isRefreshing = false;
                    }, 200);
                }, 600);
            }
        } else {
            ptrEl.style.transform = `translateY(0px)`;
        }

        startY = 0;
        currentY = 0;
    });
}

document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        console.log("🔄 Tab/Aplikasi kembali aktif. Memperbarui data dashboard...");
        if (typeof checkGPS === "function") checkGPS();
        if (activeUser && typeof refreshHistoryFromAPI === "function") {
            refreshHistoryFromAPI();
        }
        if (typeof updateDashboardButtonUI === "function") {
            updateDashboardButtonUI();
        }
    }
});
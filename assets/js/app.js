// ==========================================
// 🚀 1. FITUR TAMPIL CEPAT (Hanya untuk Pindah Halaman)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    // Kita cek apakah ini "Fresh Start" atau hanya pindah halaman
    // Jika ada tanda 'fresh_login', kita jangan tampilkan cache dulu agar prosedurnya normal
    if (!sessionStorage.getItem("is_fresh_login")) {
        let cachedLocation = localStorage.getItem("user_location_cache");
        if (cachedLocation) {
            let locationData = JSON.parse(cachedLocation);
            let elemenLokasi = document.querySelectorAll(".locationTextShort");
            elemenLokasi.forEach(function(el) {
                el.innerHTML = locationData.teks_tampil || (locationData.lat.toFixed(5) + ", " + locationData.lng.toFixed(5));
            });
        }
    }
});

// ==========================================
// 🔄 2. EVENT RESUME (Kembali dari Background)
// ==========================================
document.addEventListener("resume", function() {
    console.log("Aplikasi dilanjutkan. Menampilkan cache dan update GPS di background...");
    
    // Langsung tampilkan yang ada di memori agar user tidak melihat "Mencari..."
    let cachedLocation = localStorage.getItem("user_location_cache");
    if (cachedLocation) {
        let locationData = JSON.parse(cachedLocation);
        let elemenLokasi = document.querySelectorAll(".locationTextShort");
        elemenLokasi.forEach(el => {
            el.innerHTML = locationData.teks_tampil;
        });
    }
    
    // Tetap jalankan checkGPS untuk memperbarui lokasi diam-diam
    checkGPS(); 
}, false);

// ==========================================
// 🛡️ 3. LISTENER UTAMA CORDOVA (PROSEDUR NORMAL)
// ==========================================
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
    console.log("Cordova siap.");

    // Beri tanda bahwa aplikasi baru saja dibuka (Fresh Start)
    // Gunakan sessionStorage (akan hilang jika aplikasi ditutup total)
    sessionStorage.setItem("is_fresh_login", "true");

    // Prosedur Keamanan Ketat (Normal)
    setTimeout(function() {
        checkDeviceSecurity(); 
    }, 500); 

    // Setelah 5 detik, hapus tanda fresh login agar perpindahan halaman selanjutnya jadi instan
    setTimeout(function() {
        sessionStorage.removeItem("is_fresh_login");
    }, 5000);
}

// ==============================
// 1️⃣ CEK KEAMANAN PERANGKAT (KTP HP)
// ==============================
function checkDeviceSecurity() {
    if (typeof device === 'undefined') {
        alert("⚠️ KEAMANAN EROR: Identitas perangkat tidak terbaca.");
        navigator.app.exitApp();
        return;
    }
    if (device.isVirtual) {
        alert("⛔ EMULATOR TERDETEKSI!");
        navigator.app.exitApp();
        return;
    }
    localStorage.setItem("device_uuid", device.uuid);
    checkMockLocation();
}

// ==============================
// 2️⃣ CEK FAKE GPS (VERSI KETAT)
// ==============================
function checkMockLocation() {
    let mockPlugin = (window.plugins && window.plugins.mocklocation) || (cordova.plugins && cordova.plugins.mocklocation);
    if (!mockPlugin) {
        checkPermission();
        return; 
    }
    try {
        mockPlugin.check(function (result) {
            let isFake = (result === true || result === "true" || result.isMock === true);
            if (isFake) {
                alert("⛔ FAKE GPS TERDETEKSI!\nAplikasi akan ditutup.");
                navigator.app.exitApp();
            } else {
                checkPermission(); 
            }
        }, function () { checkPermission(); });
    } catch (e) { checkPermission(); }
}

// ==============================
// 3️⃣ IZIN & 4️⃣ NYALAKAN GPS HARDWARE
// ==============================
function checkPermission() {
    var permissions = cordova.plugins.permissions;
    var list = [permissions.ACCESS_FINE_LOCATION, permissions.CAMERA];
    permissions.hasPermission(list, function(status) {
        if (!status.hasPermission) {
            permissions.requestPermissions(list, function(s) {
                if(s.hasPermission) turnOnGPS();
            });
        } else { turnOnGPS(); }
    });
}

function turnOnGPS() {
    if (typeof cordova.plugins.locationAccuracy !== "undefined") {
        cordova.plugins.locationAccuracy.request(function () {
            checkGPS(); 
        }, function () { checkGPS(); }, cordova.plugins.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY);
    } else { checkGPS(); }
}

// ==============================
// 5️⃣ CEK GPS AKTIF (NORMAL DENGAN LOADING SAAT AWAL)
// ==============================
function checkGPS() {
    let elemenLokasi = document.querySelectorAll(".locationTextShort");

    // Jika ini fresh login, kita paksa munculkan "Mencari..." agar prosedur terasa normal
    if (sessionStorage.getItem("is_fresh_login")) {
        elemenLokasi.forEach(el => { el.innerHTML = "Mencari sinyal GPS..."; });
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            let lat = position.coords.latitude;
            let lng = position.coords.longitude;
            let teksLokasi = lat.toFixed(5) + ", " + lng.toFixed(5);

            let newLocationData = {
                lat: lat,
                lng: lng,
                teks_tampil: teksLokasi,
                timestamp: new Date().getTime()
            };
            localStorage.setItem("user_location_cache", JSON.stringify(newLocationData));

            elemenLokasi.forEach(el => { el.innerHTML = teksLokasi; });
        },
        function (error) {
            elemenLokasi.forEach(el => { el.innerHTML = "Gagal melacak lokasi"; });
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

function showToast(message) { console.log("[TOAST]: " + message); }
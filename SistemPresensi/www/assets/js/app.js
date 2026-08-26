window.API_BASE_URL = window.API_BASE_URL || "https://caraka-biroumumpbj.kemendikdasmen.go.id/api/v2";

function setupNetworkStatusBanner() {
    let banner = document.getElementById("networkStatusBanner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "networkStatusBanner";
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            text-align: center;
            color: #ffffff;
            transition: transform 0.3s ease, opacity 0.3s ease;
            transform: translateY(-100%);
            opacity: 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(banner);
    }

    function updateNetworkStatus() {
        if (!navigator.onLine) {
            banner.style.backgroundColor = "#ef4444";
            banner.innerHTML = `<i class="fas fa-wifi-slash me-2"></i> ⚠️ Koneksi Internet Terputus (Mode Offline)`;
            banner.style.transform = "translateY(0)";
            banner.style.opacity = "1";
        } else {
            if (banner.style.transform === "translateY(0px)" || banner.style.transform === "translateY(0)") {
                banner.style.backgroundColor = "#10b981";
                banner.innerHTML = `<i class="fas fa-check-circle me-2"></i> ✓ Koneksi Terhubung Kembali`;
                setTimeout(() => {
                    banner.style.transform = "translateY(-100%)";
                    banner.style.opacity = "0";
                }, 3000);
            }
        }
    }

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    if (!navigator.onLine) updateNetworkStatus();
}

document.addEventListener("DOMContentLoaded", function () {
    setupNetworkStatusBanner();

    if (!sessionStorage.getItem("is_fresh_login")) {
        let cachedLocation = localStorage.getItem("user_location_cache");
        if (cachedLocation) {
            let locationData = JSON.parse(cachedLocation);
            let elemenLokasi = document.querySelectorAll(".locationTextShort");
            elemenLokasi.forEach(function (el) {
                el.innerHTML = locationData.teks_tampil || (locationData.lat.toFixed(5) + ", " + locationData.lng.toFixed(5));
            });
        }
    }
});


document.addEventListener("resume", function () {
    console.log("Aplikasi dilanjutkan. Menampilkan cache dan update GPS di background...");

    let cachedLocation = localStorage.getItem("user_location_cache");
    if (cachedLocation) {
        let locationData = JSON.parse(cachedLocation);
        let elemenLokasi = document.querySelectorAll(".locationTextShort");
        elemenLokasi.forEach(el => {
            el.innerHTML = locationData.teks_tampil;
        });
    }

    checkGPS();
    if (typeof refreshHistoryFromAPI === "function") {
        refreshHistoryFromAPI();
    }
}, false);


document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
    console.log("Cordova siap.");

    sessionStorage.setItem("is_fresh_login", "true");

    setTimeout(function () {
        checkDeviceSecurity();
    }, 500);

    setTimeout(function () {
        sessionStorage.removeItem("is_fresh_login");
    }, 5000);
}


function checkDeviceSecurity() {
    if (typeof device === 'undefined') {
        alert("⚠️ KEAMANAN EROR: Identitas perangkat tidak terbaca.");
        navigator.app.exitApp();
        return;
    }
    // [TESTING EMULATOR] Pengecekan emulator di-nonaktifkan sementara
    /*
    if (device.isVirtual) {
        alert("⛔ EMULATOR TERDETEKSI!");
        navigator.app.exitApp();
        return;
    }
    */
    localStorage.setItem("device_uuid", device.uuid);
    checkMockLocation();
}


function checkMockLocation() {
    let mockPlugin = (window.plugins && window.plugins.mocklocation) || (cordova.plugins && cordova.plugins.mocklocation);
    if (!mockPlugin) {
        checkPermission();
        return;
    }
    try {
        mockPlugin.check(function (result) {
            let isFake = (result === true || result === "true" || result.isMock === true);
            // [TESTING EMULATOR] Fake GPS check di-nonaktifkan sementara
            /*
            if (isFake) {
                alert(" FAKE GPS TERDETEKSI!\nAplikasi akan ditutup.");
                navigator.app.exitApp();
            } else {
                checkPermission();
            }
            */
            checkPermission();
        }, function () { checkPermission(); });
    } catch (e) { checkPermission(); }
}


function checkPermission() {
    var permissions = cordova.plugins.permissions;
    var list = [permissions.ACCESS_FINE_LOCATION, permissions.CAMERA];
    permissions.hasPermission(list, function (status) {
        if (!status.hasPermission) {
            permissions.requestPermissions(list, function (s) {
                if (s.hasPermission) turnOnGPS();
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

function checkGPS() {
    let elemenLokasi = document.querySelectorAll(".locationTextShort");
    let cachedLocation = localStorage.getItem("user_location_cache");

    if (!cachedLocation && sessionStorage.getItem("is_fresh_login")) {
        elemenLokasi.forEach(el => { el.innerHTML = "Mencari sinyal GPS..."; });
    }

    function onPosSuccess(position) {
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
    }

    navigator.geolocation.getCurrentPosition(
        onPosSuccess,
        function (error) {
            if (error && error.code === error.TIMEOUT) {
                navigator.geolocation.getCurrentPosition(
                    onPosSuccess,
                    function (errLow) {
                        elemenLokasi.forEach(el => { el.innerHTML = "Gagal melacak lokasi"; });
                    },
                    { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 }
                );
            } else {
                elemenLokasi.forEach(el => { el.innerHTML = "Gagal melacak lokasi"; });
            }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
}

function showToast(message) { console.log("[TOAST]: " + message); }
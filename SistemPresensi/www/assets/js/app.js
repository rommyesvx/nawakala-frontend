window.API_BASE_URL = window.API_BASE_URL || "http://caraka-biroumumpbj.kemendikdasmen.go.id/api/v2";
document.addEventListener("DOMContentLoaded", function () {
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

window.handleUnauthorized = function() {
    alert("Sesi Anda telah habis. Silakan login kembali.");
    localStorage.removeItem('presensi_local_user');
    localStorage.removeItem('presensi_local_history');
    sessionStorage.removeItem("is_fresh_login");
    window.location.href = 'login.html';
};



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
    if (device.isVirtual) {
        alert("⛔ EMULATOR TERDETEKSI!");
        navigator.app.exitApp();
        return;
    }
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
            if (isFake) {
                alert(" FAKE GPS TERDETEKSI!\nAplikasi akan ditutup.");
                navigator.app.exitApp();
            } else {
                checkPermission();
            }
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
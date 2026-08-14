/**
 * Navbar Component Loader for Nawakala App
 * Centrally renders Desktop and Mobile Navbars across all pages.
 */
(function () {
    function renderNavbars() {
        const currentPath = window.location.pathname.split("/").pop() || "home.html";

        const desktopPlaceholder = document.getElementById("navbar-desktop-container") || document.querySelector("nav.desktop-navbar");
        const mobilePlaceholder = document.getElementById("navbar-mobile-container") || document.querySelector("div.mobile-nav-container");

        const isHome = currentPath === 'home.html' || currentPath === '' || currentPath === 'index.html';
        const isPresensi = currentPath === 'presensi.html';
        const isCalendar = currentPath === 'calendar.html';
        const isProfile = currentPath === 'profile.html';

        const desktopHTML = `
        <nav class="desktop-navbar desktop-view">
            <div class="nav-container">
                <div class="d-flex align-items-center gap-3">
                    <img src="assets/images/logo.png?v=1.0.1" alt="Logo" class="navbar-logo">
                </div>

                <div class="nav-links d-flex gap-4 brand-text-bold">
                    <a href="home.html" class="nav-link-desk ${isHome ? 'active' : ''}">Home</a>
                    <a href="presensi.html" class="nav-link-desk ${isPresensi ? 'active' : ''}">Presensi</a>
                    <a href="calendar.html" class="nav-link-desk ${isCalendar ? 'active' : ''}">Kalender</a>
                    <a href="profile.html" class="nav-link-desk ${isProfile ? 'active' : ''}">Profil</a>
                </div>

                <div class="d-flex align-items-center gap-3">
                    <button id="btnActionDesktop" onclick="processAttendance()"
                        class="btn btn-primary rounded-pill px-4 fw-bold shadow-sm btn-gradient d-flex align-items-center gap-2">
                        <i class="fas fa-fingerprint"></i>
                        <span>Absen Sekarang</span>
                    </button>

                    <div class="position-relative cursor-pointer mx-3" onclick="handleNotificationClick()">
                        <i class="far fa-bell fa-lg text-secondary"></i>
                        <span id="notifBadge"
                            class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle d-none"></span>
                    </div>

                    <div class="position-relative">
                        <div class="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm fw-bold cursor-pointer"
                            onclick="toggleProfileDropdown(event)">
                            <span class="user-initials">ME</span>
                            <span class="position-absolute bottom-0 end-0 bg-success border border-white rounded-circle"
                                style="width: 10px; height: 10px;"></span>
                        </div>

                        <div id="profileDropdown"
                            class="dropdown-menu-custom shadow-lg rounded-4 d-none animate-fade-in-fast">
                            <div class="p-3 border-bottom">
                                <div class="d-flex align-items-center gap-3">
                                    <div class="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                        style="width: 45px; height: 45px; font-size: 1.1rem;">
                                        <span class="user-initials">ME</span>
                                    </div>
                                    <div class="overflow-hidden">
                                        <h6 class="mb-0 fw-bold text-dark text-truncate user-fullname-text"
                                            style="max-width: 180px;">Nama User</h6>
                                        <small class="text-muted d-block" style="font-size: 0.75rem;">Alih Daya</small>
                                    </div>
                                </div>
                            </div>
                            <div class="p-2">
                                <a href="#" onclick="handleLogout()"
                                    class="d-flex align-items-center gap-2 px-3 py-2 rounded-3 text-decoration-none text-danger hover-bg-red-soft">
                                    <i class="fas fa-power-off" style="width: 20px;"></i>
                                    <span class="small fw-bold">Keluar</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        `;

        const mobileHTML = `
        <div class="mobile-nav-container d-md-none">
            <div class="fab-container">
                <button id="btnActionMobile" class="fab-btn" onclick="processAttendance()">
                    <i class="fas fa-fingerprint"></i>
                </button>
            </div>
            <nav class="mobile-navbar">
                <div class="nav-curve-bg">
                    <a href="home.html" class="mob-item ${isHome ? 'active' : ''}"><i class="fas fa-home"></i><span>Home</span></a>
                    <a href="presensi.html" class="mob-item ${isPresensi ? 'active' : ''}"><i class="fas fa-calendar-check"></i><span>Presensi</span></a>
                    <div style="width: 100%;"></div>
                    <a href="calendar.html" class="mob-item ${isCalendar ? 'active' : ''}"><i class="far fa-calendar-alt"></i><span>Kalender</span></a>
                    <a href="profile.html" class="mob-item ${isProfile ? 'active' : ''}"><i class="far fa-user"></i><span>Profil</span></a>
                </div>
            </nav>
        </div>
        `;

        if (desktopPlaceholder) {
            desktopPlaceholder.outerHTML = desktopHTML;
        }
        if (mobilePlaceholder) {
            mobilePlaceholder.outerHTML = mobileHTML;
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderNavbars);
    } else {
        renderNavbars();
    }
})();

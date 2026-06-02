/* -------------------------------------------------------------
   AMRITA UNIVERSITY MANAGEMENT SYSTEM - CONTROLLER SCRIPT
   Provides premium micro-interactions, validations, and flows
   ------------------------------------------------------------- */

// Configure your live backend API server URL here when deploying separately.
// Replace 'http://localhost:3000' with your live deployed backend URL (e.g., https://your-backend.render.com)
const API_BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');
    const loginCard = document.querySelector('.login-card');
    
    // Interactive Links & Modals
    const opacLink = document.getElementById('opacLink');
    const forgotLink = document.getElementById('forgotLink');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const toastContainer = document.getElementById('toastContainer');
    const logoTrigger = document.getElementById('logoTrigger');

    /* ==========================================
       1. Input Validation & Error Handling
       ========================================== */
    
    // Helper to validate input and set error states
    const validateField = (input, errorId) => {
        const value = input.value.trim();
        const group = input.closest('.input-group');
        
        if (!value) {
            group.classList.add('has-error');
            return false;
        } else {
            group.classList.remove('has-error');
            return true;
        }
    };

    // Remove error class dynamically on user input
    [usernameInput, passwordInput].forEach(input => {
        input.addEventListener('input', () => {
            const group = input.closest('.input-group');
            if (group.classList.contains('has-error')) {
                group.classList.remove('has-error');
            }
        });
    });

    // Handle form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        
        const isUsernameValid = validateField(usernameInput, 'usernameError');
        const isPasswordValid = validateField(passwordInput, 'passwordError');
        
        if (!isUsernameValid || !isPasswordValid) {
            // Shake the card to indicate validation failure
            loginCard.classList.remove('shake');
            void loginCard.offsetWidth; // Trigger reflow to restart animation
            loginCard.classList.add('shake');
            
            showToast('Please fill out all required fields.', 'error');
            
            setTimeout(() => {
                loginCard.classList.remove('shake');
            }, 400);
            return;
        }
        
        // Disable form elements & enter loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        usernameInput.disabled = true;
        passwordInput.disabled = true;

        try {
            // Asynchronous request to backend API
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showToast(`Welcome back, ${result.user.username}! Login successful.`, 'success');
                // Clear input fields
                usernameInput.value = '';
                passwordInput.value = '';
                // Transition to simulation dashboard
                setTimeout(() => {
                    showDashboardSimulation(result.user);
                }, 1000);
            } else {
                showToast(result.message || 'Authentication failed: Invalid credentials.', 'error');
            }
        } catch (err) {
            console.error('Network error authenticating user:', err);
            showToast('Unable to connect to the authentication server.', 'error');
        } finally {
            // Restore button & input states
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
            usernameInput.disabled = false;
            passwordInput.disabled = false;
        }
    });

    /* ==========================================
       2. Mock Authentication & Loading States
       ========================================== */
    const startAuthentication = () => {
        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Enter loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        usernameInput.disabled = true;
        passwordInput.disabled = true;
        
        // Simulate network latency (1.5 seconds)
        setTimeout(() => {
            // Exit loading state
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
            usernameInput.disabled = false;
            passwordInput.disabled = false;

            // Trigger demo success/error cases based on inputs
            if (username.toLowerCase() === 'error' || password.toLowerCase() === 'error') {
                showToast('Authentication failed: Invalid credentials or account locked.', 'error');
                loginCard.classList.add('shake');
                setTimeout(() => loginCard.classList.remove('shake'), 400);
            } else {
                showToast(`Welcome back, ${username}! Login successful.`, 'success');
                // Simulate redirect to academic dashboard after a successful login
                setTimeout(() => {
                    showDashboardSimulation(username);
                }, 1000);
            }
        }, 1500);
    };

    /* ==========================================
       3. Toast Notification System
       ========================================== */
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Select matching icons for different states
        let icon = '🔔';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '❌';
        
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.add('is-active');
        }, 10);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.classList.remove('is-active');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    };

    /* ==========================================
       4. Modal Overlay Interactions
       ========================================== */
    const modalCard = modalOverlay.querySelector('.modal-card');

    const openModal = (htmlContent, isAdmin = false) => {
        modalContent.innerHTML = htmlContent;
        if (isAdmin) {
            modalCard.classList.add('admin-modal');
        } else {
            modalCard.classList.remove('admin-modal');
        }
        modalOverlay.classList.add('is-active');
        
        // Focus first button in modal for accessibility
        setTimeout(() => {
            const focusable = modalContent.querySelector('button, input, a');
            if (focusable) focusable.focus();
        }, 100);
    };

    const closeModal = () => {
        modalOverlay.classList.remove('is-active');
        setTimeout(() => {
            modalCard.classList.remove('admin-modal');
        }, 300);
    };

    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    // Close modal on Escape key press
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalOverlay.classList.contains('is-active')) {
            closeModal();
        }
    });

    // Open OPAC Search modal
    opacLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const opacHTML = `
            <h3>Academic OPAC Search</h3>
            <p>Welcome to the Online Public Access Catalog (OPAC). This system allows you to search, reserve, and view the status of publications and books across all campus libraries.</p>
            <div style="margin: 20px 0;">
                <input type="text" placeholder="Search title, author, or ISBN..." style="width: 100%; padding: 12px 14px; border: 1px solid #CBD5E1; border-radius: 4px; font-family: inherit; font-size: 0.95rem; margin-bottom: 12px; outline: none; background: #F8FAFC;">
                <button type="button" class="modal-primary-btn" id="modalSearchBtn" style="width: 100%;">Search Catalog</button>
            </div>
            <p style="font-size: 0.85rem; color: #94A3B8;">Requires campus intranet access to reserve physical copies.</p>
        `;
        openModal(opacHTML);

        // Bind interactive event inside modal
        document.getElementById('modalSearchBtn').addEventListener('click', () => {
            showToast('Searching catalog...', 'success');
            closeModal();
        });
    });

    // Open "Can't access your account?" modal
    forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const forgotHTML = `
            <h3>Account Recovery Support</h3>
            <p>Enter your registered academic email address below. We will verify your profile and send a password reset link to your inbox.</p>
            <form id="recoveryForm" style="margin-top: 15px;">
                <input type="email" id="recoveryEmail" placeholder="yourname@amrita.edu" required style="width: 100%; padding: 12px 14px; border: 1px solid #CBD5E1; border-radius: 4px; font-family: inherit; font-size: 0.95rem; margin-bottom: 15px; outline: none; background: #F8FAFC;">
                <button type="submit" class="modal-primary-btn" style="width: 100%;">Request Reset Code</button>
            </form>
        `;
        openModal(forgotHTML);

        // Handle recovery submission
        const form = document.getElementById('recoveryForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('recoveryEmail').value.trim();
            if (email) {
                showToast(`Recovery link successfully dispatched to ${email}`, 'success');
                closeModal();
            }
        });
    });

    /* ==========================================
       5. Dashboard Simulation (Success Flow)
       ========================================== */
    const showDashboardSimulation = (user) => {
        const username = typeof user === 'object' ? user.username : user;
        const email = typeof user === 'object' ? user.email : `${username}@amrita.edu`;
        const role = typeof user === 'object' ? user.role : 'student';

        // Create full overlay to simulate transition to internal campus system
        const dashboardOverlay = document.createElement('div');
        dashboardOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: #87D3C1;
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
            transition: opacity 0.5s ease;
            font-family: inherit;
        `;
        
        dashboardOverlay.innerHTML = `
            <div style="background: white; padding: 40px; border-radius: 12px; width: 90%; max-width: 550px; box-shadow: 0 20px 50px rgba(0,0,0,0.15); text-align: center; animation: fadeInPage 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);">
                <div style="width: 80px; height: 80px; background: #ECFDF5; color: #10B981; font-size: 2.5rem; border-radius: 50%; display: flex; justify-content: center; align-items: center; margin: 0 auto 20px;">✓</div>
                <h2 style="color: #F59223; margin-bottom: 5px; font-weight: 600;">Welcome, ${username}!</h2>
                <div style="margin-bottom: 20px; font-size: 0.95rem; color: var(--text-muted);">
                    <span style="background: #F1F5F9; padding: 4px 10px; border-radius: 12px; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; color: ${role === 'admin' ? '#D97706' : '#0D9488'}; background-color: ${role === 'admin' ? '#FEF3C7' : '#CCFBF1'}; border: 1px solid ${role === 'admin' ? '#FCD34D' : '#99F6E4'};">${role}</span>
                    <p style="margin-top: 8px; font-family: monospace;">${email}</p>
                </div>
                <p style="color: #64748B; margin-bottom: 25px; line-height: 1.6;">You have logged in securely to the <strong>Amrita University Academic Management System</strong> using **Firebase Authentication**. Your session is active and profile is registered in Cloud Firestore.</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="logoutBtn" class="modal-primary-btn" style="background: #F59223;">Return to Log In</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(dashboardOverlay);
        
        // Trigger opacity fade
        setTimeout(() => {
            dashboardOverlay.style.opacity = '1';
        }, 10);

        document.getElementById('logoutBtn').addEventListener('click', () => {
            dashboardOverlay.style.opacity = '0';
            setTimeout(() => {
                dashboardOverlay.remove();
                // Clear input fields on logout
                usernameInput.value = '';
                passwordInput.value = '';
                usernameInput.focus();
                showToast('Logged out successfully.', 'info');
            }, 500);
        });
    };

    /* ==========================================
       6. Secure Registered Users Console
       ========================================== */
    
    // HTML sanitizer helper
    const escapeHTML = (str) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    // Render registered users list (safe metadata only)
    const renderTableRows = (items) => {
        if (!items || items.length === 0) {
            return `<tr><td colspan="4" class="no-records">No registered users found in Firestore.</td></tr>`;
        }
        
        return items.map(item => {
            const dateStr = new Date(item.createdAt).toLocaleString();
            const safeUsername = escapeHTML(item.username);
            const safeEmail = escapeHTML(item.email);
            const role = item.role || 'student';
            
            return `
                <tr>
                    <td style="font-weight: 600; color: var(--brand-orange);">${safeUsername}</td>
                    <td style="font-family: monospace; font-size: 0.95rem; color: var(--text-muted);">${safeEmail}</td>
                    <td>
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: ${role === 'admin' ? '#D97706' : '#0D9488'}; background-color: ${role === 'admin' ? '#FEF3C7' : '#CCFBF1'}; border: 1px solid ${role === 'admin' ? '#FCD34D' : '#99F6E4'};">${role}</span>
                    </td>
                    <td class="credential-date">${dateStr}</td>
                    <td class="credential-actions" style="text-align: right;">
                        <button class="btn-copy btn-copy-username" data-type="username" data-copy="${safeUsername}">Copy User</button>
                        <button class="btn-copy" data-type="email" data-copy="${safeEmail}">Copy Email</button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    const renderAdminDashboard = (users) => {
        const dashboardHTML = `
            <div class="admin-header">
                <h3>Registered Users Console</h3>
                <div class="admin-search-wrapper">
                    <input type="text" id="adminSearchInput" placeholder="Search by username/email..." autocomplete="off">
                </div>
            </div>
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Registration Date</th>
                            <th style="text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody">
                        ${renderTableRows(users)}
                    </tbody>
                </table>
            </div>
            <div class="admin-footer">
                <span>Database: <strong>Firebase Firestore</strong></span>
                <span class="admin-total-badge" id="adminTotalBadge">Total: ${users.length} profiles</span>
            </div>
        `;
        
        openModal(dashboardHTML, true);

        // Bind Search Filtering
        const searchInput = document.getElementById('adminSearchInput');
        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                const filtered = users.filter(item => 
                    item.username.toLowerCase().includes(query) || 
                    item.email.toLowerCase().includes(query) ||
                    (item.role || '').toLowerCase().includes(query)
                );
                
                const tableBody = document.getElementById('adminTableBody');
                if (tableBody) {
                    tableBody.innerHTML = renderTableRows(filtered);
                }
                
                const totalBadge = document.getElementById('adminTotalBadge');
                if (totalBadge) {
                    totalBadge.textContent = `Total: ${filtered.length} profiles`;
                }
            });
        }

        // Bind Event Delegation for Clipboard Copying
        const tableBody = document.getElementById('adminTableBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('btn-copy')) {
                    const textToCopy = target.getAttribute('data-copy');
                    const copyType = target.getAttribute('data-type');
                    
                    navigator.clipboard.writeText(textToCopy)
                        .then(() => {
                            showToast(`${copyType === 'username' ? 'Username' : 'Email'} copied to clipboard.`, 'success');
                        })
                        .catch(err => {
                            console.error('Failed to copy: ', err);
                            showToast('Unable to access clipboard.', 'error');
                        });
                }
            });
        }
    };

    // Logo Click Event to trigger Registered Users Console
    if (logoTrigger) {
        logoTrigger.addEventListener('click', async (e) => {
            e.preventDefault();
            showToast('Loading system registry...', 'info');
            
            // Open loading modal immediately
            openModal(`
                <div class="admin-header">
                    <h3>Registered Users Console</h3>
                </div>
                <div style="text-align: center; padding: 50px 0; color: var(--text-muted);">
                    <span class="btn-spinner" style="display: inline-block; border-top-color: var(--brand-orange); width: 28px; height: 28px;"></span>
                    <p style="margin-top: 15px; font-weight: 500;">Reading metadata from Cloud Firestore...</p>
                </div>
            `, true);

            try {
                const response = await fetch(`${API_BASE_URL}/api/admin/users`);
                const result = await response.json();
                
                if (response.ok && result.success) {
                    renderAdminDashboard(result.data);
                } else {
                    openModal(`
                        <h3>Database Connection Refused</h3>
                        <p>${result.message || 'The administrative registry failed to load.'}</p>
                    `, false);
                }
            } catch (err) {
                console.error(err);
                openModal(`
                    <h3>Backend Offline</h3>
                    <p>Unable to connect to the backend server API at <code>${API_BASE_URL}</code>.<br><br>Please verify the server is active.</p>
                `, false);
            }
        });

        // Trigger via keyboard for accessibility
        logoTrigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                logoTrigger.click();
            }
        });
    }
});


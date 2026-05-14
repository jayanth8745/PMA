// Global Variables
let currentUser = null;
let authToken = null;
let memories = [];
let currentPage = 1;
let totalPages = 1;

// API Base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Connection status
let backendConnected = false;

// Check backend connection
async function checkBackendConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      backendConnected = true;
      console.log('✅ Backend connected');
      return true;
    }
  } catch (error) {
    backendConnected = false;
    console.error('❌ Backend connection failed:', error);
    return false;
  }
}

// Check connection periodically
setInterval(checkBackendConnection, 30000); // Check every 30 seconds

// Check on page load
document.addEventListener('DOMContentLoaded', () => {
  checkBackendConnection();
});

// Initialize App
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});


function initializeApp() {
    setupEventListeners();
    checkAuthStatus();
    initializeVoiceRecognition();
    loadTheme();
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Non-blocking loading for memory operations
function showMemoryLoading() {
    // Show the non-blocking loading overlay
    const memoryLoadingOverlay = document.getElementById('memoryLoadingOverlay');
    if (memoryLoadingOverlay) {
        memoryLoadingOverlay.classList.add('show');
    }
    
    // Also disable the submit button
    const memoryForm = document.getElementById('memoryForm');
    if (memoryForm) {
        const submitBtn = memoryForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }
    }
}

function hideMemoryLoading() {
    // Hide the non-blocking loading overlay
    const memoryLoadingOverlay = document.getElementById('memoryLoadingOverlay');
    if (memoryLoadingOverlay) {
        memoryLoadingOverlay.classList.remove('show');
    }
    
    // Re-enable the submit button
    const memoryForm = document.getElementById('memoryForm');
    if (memoryForm) {
        const submitBtn = memoryForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Create Memory';
        }
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function closeModal() {
    const modal = document.getElementById('memoryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    window.location.href = 'index.html';
}

function showAuthSection() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
}

async function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    await loadMemories(1, searchTerm);
}

async function handleFilter() {
    await loadMemories(1);
}

async function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        
        // If on auth pages, redirect to dashboard
        if (['index.html', 'login.html', 'register.html'].includes(currentPage)) {
            window.location.href = 'dashboard.html';
        } else if (currentPage === 'dashboard.html') {
            // Load dashboard data
            document.getElementById('userName').textContent = currentUser.name || currentUser.email;
            await loadMemories();
            loadStats();
            renderCalendar();
        }
    } else {
        // If not logged in and on dashboard, redirect to index
        if (currentPage === 'dashboard.html') {
            window.location.href = 'index.html';
        }
    }
}

async function loadMemories(page = 1, search = '') {
    try {
        showLoading();
        
        const category = document.getElementById('categoryFilter')?.value || '';
        const mood = document.getElementById('moodFilter')?.value || '';
        
        let url = `${API_BASE_URL}/memories?page=${page}&per_page=10`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        if (mood) url += `&mood=${encodeURIComponent(mood)}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            memories = data.memories;
            currentPage = data.pagination.page;
            totalPages = data.pagination.pages;
            
            renderPagination();
        } else {
            showError(data.error || 'Failed to load memories');
        }
    } catch (error) {
        console.error('Load memories error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    if (currentPage > 1) {
        html += `<button onclick="loadMemories(${currentPage - 1})" class="btn btn-secondary">Previous</button>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<button onclick="loadMemories(${i})" class="btn ${active}">${i}</button>`;
    }
    
    // Next button
    if (currentPage < totalPages) {
        html += `<button onclick="loadMemories(${currentPage + 1})" class="btn btn-secondary">Next</button>`;
    }
    
    pagination.innerHTML = html;
}

function viewMemory(memoryId) {
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return;
    
    const modal = document.getElementById('memoryModal');
    const modalBody = document.getElementById('modalBody');
    
    if (modal && modalBody) {
        modalBody.innerHTML = `
            <h2>${memory.title}</h2>
            <p><strong>Date:</strong> ${formatDate(memory.date)}</p>
            <p><strong>Category:</strong> ${memory.category}</p>
            <p><strong>Mood:</strong> ${memory.mood}</p>
            <p><strong>Description:</strong></p>
            <p>${memory.description}</p>
            ${memory.tags && memory.tags.length > 0 ? `
                <p><strong>Tags:</strong> ${memory.tags.join(', ')}</p>
            ` : ''}
            <div class="modal-actions">
                <button onclick="editMemory('${memory.id}')" class="btn btn-secondary">Edit</button>
                <button onclick="deleteMemory('${memory.id}')" class="btn btn-danger">Delete</button>
            </div>
        `;
        
        modal.style.display = 'block';
    }
}

async function handleMemorySubmit(e) {
    e.preventDefault();
    showMemoryLoading();
    
    const title = document.getElementById('memoryTitle').value.trim();
    const description = document.getElementById('memoryDescription').value.trim();
    const mood = document.getElementById('memoryMood').value;
    const category = document.getElementById('memoryCategory').value;
    const tags = document.getElementById('memoryTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const date = document.getElementById('memoryDate').value || new Date().toISOString();
    
    try {
        const response = await fetch(`${API_BASE_URL}/memories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                title,
                description,
                mood,
                category,
                tags,
                date
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Memory created successfully!');
            document.getElementById('memoryForm').reset();
            
            // Clear voice-filled flags
            ['memoryTitle', 'memoryDescription', 'memoryTags'].forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.dataset.voiceFilled = 'false';
                }
            });
            
            // Load memories asynchronously without blocking UI
            loadMemories().catch(error => {
                console.error('Failed to load memories after creation:', error);
            });
        } else {
            showError(data.error || 'Failed to create memory');
        }
    } catch (error) {
        console.error('Create memory error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideMemoryLoading();
    }
}

async function deleteMemory(memoryId) {
    if (!confirm('Are you sure you want to delete this memory?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/memories/${memoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showSuccess('Memory deleted successfully!');
            closeModal();
            await loadMemories();
        } else {
            const data = await response.json();
            showError(data.error || 'Failed to delete memory');
        }
    } catch (error) {
        console.error('Delete memory error:', error);
        showError('Network error. Please try again.');
    }
}

async function editMemory(memoryId) {
    // For now, just show the memory details
    // In a full implementation, this would open an edit form
    viewMemory(memoryId);
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('darkMode') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    localStorage.setItem('theme', savedTheme);
    localStorage.setItem('darkMode', savedTheme);
    if (typeof ENHANCED_STATE !== 'undefined') {
        ENHANCED_STATE.darkMode = savedTheme === 'dark';
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('darkMode', newTheme);
    if (typeof ENHANCED_STATE !== 'undefined') {
        ENHANCED_STATE.darkMode = newTheme === 'dark';
    }
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners');
    
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            console.log('Auth tab clicked:', this.dataset.tab);
            switchAuthTab(this.dataset.tab);
        });
    });

    // Auth forms
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        console.log('Login form found, adding event listener');
        if (!loginForm.dataset.submitBound) {
            loginForm.addEventListener('submit', handleLogin);
            loginForm.dataset.submitBound = 'true';
        }
    } else {
        console.error('Login form not found');
    }
    
    if (registerForm) {
        console.log('Register form found, adding event listener');
        if (!registerForm.dataset.submitBound) {
            registerForm.addEventListener('submit', handleRegister);
            registerForm.dataset.submitBound = 'true';
        }
    } else {
        console.error('Register form not found');
    }

    // Memory form
    const memoryForm = document.getElementById('memoryForm');
    if (memoryForm) {
        memoryForm.addEventListener('submit', handleMemorySubmit);
    }

    // Voice toggle
    const voiceToggle = document.getElementById('voiceToggle');
    if (voiceToggle) {
        voiceToggle.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Voice toggle clicked');
            toggleVoiceAssistant();
        });
    }
    
    // Voice query button
    const voiceQueryBtn = document.getElementById('voiceQueryBtn');
    if (voiceQueryBtn) {
        voiceQueryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Voice query button clicked');
            toggleVoiceQuery();
        });
    }
    
    // Ask button
    const askBtn = document.getElementById('askBtn');
    if (askBtn) {
        askBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Ask button clicked');
            handleTextQuery();
        });
    }

    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dark mode toggle clicked');
            toggleTheme();
        });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button clicked');
            logout();
        });
    }

    // Search and filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleFilter);
    }
    
    const moodFilter = document.getElementById('moodFilter');
    if (moodFilter) {
        moodFilter.addEventListener('change', handleFilter);
    }

    // Modal
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('memoryModal');
        if (modal && event.target === modal) {
            closeModal();
        }
    });
    
    // Clear voice-filled data when user manually edits form fields
    ['memoryTitle', 'memoryDescription', 'memoryTags'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function() {
                this.dataset.voiceFilled = 'false';
            });
        }
    });
}

// Authentication
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('Login function called');
    showLoading();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Login data:', { email, password: '***' });
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        console.log('Login response status:', response.status);
        const data = await response.json();
        console.log('Login response data:', data);
        
        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Register function called');
    showLoading();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const name = `${firstName} ${lastName}`.trim();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    console.log('Register data:', { name, email, password: '***' });
    
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        console.log('Register response status:', response.status);
        const data = await response.json();
        console.log('Register response data:', data);
        
        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            window.location.href = 'dashboard.html';
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Register error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
        loadMemories();
        loadStats();
        renderCalendar();
    }
}

function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
    document.getElementById('userName').textContent = currentUser.name || currentUser.email;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    document.getElementById('authSection').style.display = 'flex';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    
    // Reset forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// Memory Management
async function handleMemorySubmit(e) {
    e.preventDefault();
    showLoading();
    
    const title = document.getElementById('memoryTitle').value;
    const description = document.getElementById('memoryDescription').value;
    const date = document.getElementById('memoryDate').value || new Date().toISOString().split('T')[0];
    const mood = document.getElementById('memoryMood').value;
    const category = document.getElementById('memoryCategory').value;
    const tags = document.getElementById('memoryTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
    const imageFile = document.getElementById('memoryImage').files[0];
    
    let imageUrl = null;
    
    // Upload image if provided
    if (imageFile) {
        imageUrl = await uploadImage(imageFile);
    }
    
    try {
        const memoryData = {
            title,
            description,
            date,
            mood,
            category,
            tags,
            image_url: imageUrl
        };
        
        const response = await fetch(`${API_BASE_URL}/memories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(memoryData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Memory created successfully!');
            document.getElementById('memoryForm').reset();
            loadMemories();
            loadStats();
            renderCalendar();
        } else {
            showError(data.error || 'Failed to create memory');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            return data.file_url;
        }
    } catch (error) {
        console.error('Image upload failed:', error);
    }
    
    return null;
}

async function loadMemories(page = 1, search = '', category = '', mood = '') {
    showLoading();
    
    const params = new URLSearchParams({
        page: page.toString(),
        limit: '9'
    });
    
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (mood) params.append('mood', mood);
    
    try {
        const response = await fetch(`${API_BASE_URL}/memories?${params}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            memories = data.memories;
            currentPage = data.pagination.page;
            totalPages = data.pagination.pages;
            renderMemories();
            renderPagination();
        } else {
            showError(data.error || 'Failed to load memories');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

function renderMemories() {
    const container = document.getElementById('memoriesList');
    
    if (memories.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No memories found. Create your first memory!</p>';
        return;
    }
    
    container.innerHTML = memories.map(memory => `
        <div class="memory-card mood-${memory.mood}" onclick="showMemoryDetails('${memory._id}')">
            <div class="memory-header">
                <div>
                    <div class="memory-title">${memory.title}</div>
                    <div class="memory-date">${formatDate(memory.date)}</div>
                </div>
                <div class="memory-actions">
                    <button onclick="event.stopPropagation(); editMemory('${memory._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="event.stopPropagation(); deleteMemory('${memory._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="memory-description">${memory.description}</div>
            ${memory.image_url ? `<img src="${memory.image_url}" alt="${memory.title}" style="width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;">` : ''}
            <div class="memory-meta">
                <span class="memory-category">${memory.category}</span>
                <div class="memory-tags">
                    ${memory.tags.map(tag => `<span class="memory-tag">${tag}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
    
    // Update calendar after memories are rendered
    renderCalendar();
}

function renderPagination() {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `<button onclick="loadMemories(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button onclick="loadMemories(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span>...</span>';
        }
    }
    
    // Next button
    paginationHTML += `<button onclick="loadMemories(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    container.innerHTML = paginationHTML;
}

async function showMemoryDetails(memoryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/memories/${memoryId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const memory = data.memory;
            const modalBody = document.getElementById('modalBody');
            
            modalBody.innerHTML = `
                <h2>${memory.title}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">${formatDate(memory.date)}</p>
                ${memory.image_url ? `<img src="${memory.image_url}" alt="${memory.title}" style="width: 100%; border-radius: 0.5rem; margin-bottom: 1rem;">` : ''}
                <p style="line-height: 1.6; margin-bottom: 1rem;">${memory.description}</p>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                    <span class="memory-category">${memory.category}</span>
                    <span style="background: var(--mood-${memory.mood}); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${memory.mood}</span>
                </div>
                <div class="memory-tags">
                    ${memory.tags.map(tag => `<span class="memory-tag">${tag}</span>`).join('')}
                </div>
            `;
            
            document.getElementById('memoryModal').style.display = 'block';
        } else {
            showError(data.error || 'Failed to load memory');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    }
}

function closeModal() {
    document.getElementById('memoryModal').style.display = 'none';
}

async function deleteMemory(memoryId) {
    if (!confirm('Are you sure you want to delete this memory?')) {
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/memories/${memoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Memory deleted successfully!');
            loadMemories();
            loadStats();
            renderCalendar();
        } else {
            showError(data.error || 'Failed to delete memory');
        }
    } catch (error) {
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

// Search and Filter
function handleSearch(e) {
    const searchTerm = e.target.value;
    loadMemories(currentPage, searchTerm, getCategoryFilter(), getMoodFilter());
}

function handleFilter() {
    loadMemories(currentPage, getSearchTerm(), getCategoryFilter(), getMoodFilter());
}

function getSearchTerm() {
    return document.getElementById('searchInput').value;
}

function getCategoryFilter() {
    return document.getElementById('categoryFilter').value;
}

function getMoodFilter() {
    return document.getElementById('moodFilter').value;
}

function playClickSound() {
    // Create a click sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}
/* =========================================================
UNIFIED VOICE ASSISTANT SYSTEM
========================================================= */

let voiceRecognition = null;

let isListening = false;

let currentTranscript = '';

let voiceMeterStream = null;
let voiceMeterContext = null;
let voiceMeterFrame = null;

/* =========================================================
ELEMENTS
========================================================= */

const voiceBtn =
    document.getElementById("voiceToggleBtn");

const sphereOverlay =
    document.getElementById("voiceSphereOverlay");

const transcriptElement =
    document.getElementById("transcriptText");

const voiceStatusText =
    document.getElementById("voiceStatusText");

/* =========================================================
INIT
========================================================= */

initializeVoiceRecognition();

/* =========================================================
BUTTON
========================================================= */

if(voiceBtn){

    voiceBtn.addEventListener("click", () => {

        toggleVoiceAssistant();
    });
}

/* =========================================================
TOGGLE
========================================================= */

function toggleVoiceAssistant(){

    if(isListening){

        stopVoiceAssistant();

    }else{

        startVoiceAssistant();
    }
}

/* =========================================================
START
========================================================= */

function startVoiceAssistant(){

    if(!voiceRecognition){

        setVoiceSphereVisualState(
            "speaking",
            "Speech recognition is not supported in this browser"
        );

        showError("Voice recognition not supported");

        setTimeout(() => {

            setVoiceSphereVisualState(
                "idle",
                "Use Chrome or Edge for voice"
            );
        }, 2400);

        return;
    }

    if(isListening) return;

    currentTranscript = '';

    isListening = true;

    setVoiceSphereVisualState(
        "listening",
        "Starting microphone..."
    );

    try{

        window.__stopWakeVoiceAssistant?.();

        voiceRecognition.start();

        startVoiceMeter();

        voiceBtn?.classList.add("active");

        voiceBtn?.setAttribute("aria-pressed", "true");

        voiceBtn?.setAttribute("aria-label", "Stop voice assistant");

        updateVoiceStatus(
            "Listening... Speak naturally"
        );

    }catch(error){

        console.error(error);

        isListening = false;

        setVoiceSphereVisualState(
            "listening",
            "Microphone is getting ready. Tap again if needed."
        );

        voiceBtn?.classList.remove("active");

        setTimeout(() => {

            if(!isListening){

                setVoiceSphereVisualState(
                    "idle",
                    "Tap the mic to start"
                );
            }
        }, 2400);
    }
}

/* =========================================================
STOP
========================================================= */

function stopVoiceAssistant(){

    isListening = false;

    if(voiceRecognition){

        voiceRecognition.stop();
    }

    stopVoiceMeter();

    setVoiceSphereVisualState(
        "idle",
        "Tap the mic to start"
    );

    voiceBtn?.classList.remove("active");

    voiceBtn?.setAttribute("aria-pressed", "false");

    voiceBtn?.setAttribute("aria-label", "Start voice assistant");

    updateVoiceStatus(
        "Voice assistant stopped"
    );
}

/* =========================================================
INITIALIZE RECOGNITION
========================================================= */

function initializeVoiceRecognition(){

    if(
        !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
    ){

        console.warn(
            "Speech Recognition not supported"
        );

        setVoiceSphereVisualState(
            "idle",
            "Use Chrome or Edge for voice"
        );

        return;
    }

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    voiceRecognition =
        new SpeechRecognition();

    voiceRecognition.continuous = true;

    voiceRecognition.interimResults = true;

    voiceRecognition.lang = "en-US";

    /* =========================================
    START
    ========================================= */

    voiceRecognition.onstart = () => {

        console.log(
            "Voice recognition started"
        );

        setVoiceSphereVisualState(
            "listening",
            "Listening... Speak naturally"
        );
    };

    /* =========================================
    END
    ========================================= */

    voiceRecognition.onend = () => {

        console.log(
            "Voice recognition ended"
        );

        if(isListening){

            setTimeout(() => {

                try{

                    voiceRecognition.start();

                }catch(err){

                    console.log(err);
                }

            }, 150);
        }
    };

    /* =========================================
    SPEECH START
    ========================================= */

    voiceRecognition.onspeechstart = () => {

        setVoiceSphereVisualState(
            "listening",
            "Hearing you..."
        );
    };

    /* =========================================
    SPEECH END
    ========================================= */

    voiceRecognition.onspeechend = () => {

        setVoiceSphereVisualState(
            "listening",
            "Listening... Speak naturally"
        );
    };

    /* =========================================
    RESULT
    ========================================= */

    voiceRecognition.onresult = async (
        event
    ) => {

        let interimTranscript = '';

        for(
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ){

            const transcript =
                event.results[i][0].transcript;

            /* FINAL */
            if(event.results[i].isFinal){

                currentTranscript +=
                    transcript + ' ';

                updateTranscript(
                    currentTranscript
                );

                handleVoiceCommand(
                    transcript.toLowerCase()
                );

            }else{

                interimTranscript +=
                    transcript;
            }
        }

        updateTranscript(
            currentTranscript +
            interimTranscript
        );
    };

    /* =========================================
    ERROR
    ========================================= */

    voiceRecognition.onerror = (
        event
    ) => {

        console.error(
            "Voice Error:",
            event.error
        );

        updateVoiceStatus(
            "Voice error: " +
            event.error
        );

        if(
            event.error === "not-allowed"
        ){

            stopVoiceAssistant();
        }
    };

    console.log(
        "Voice assistant initialized"
    );
}

/* =========================================================
COMMAND CONTROLLER
========================================================= */

async function handleVoiceCommand(
    command
){

    console.log(
        "Voice Command:",
        command
    );

    /* =========================================
    WAKE WORD
    ========================================= */

    if(
        command.includes(
            "hey assistant"
        ) ||
        command.includes(
            "hello assistant"
        )
    ){

        setVoiceSphereVisualState(
            "listening",
            "How can I help you?"
        );

        speakText(
            "How can I help you?"
        );

        return;
    }

    /* =========================================
    STOP
    ========================================= */

    if(
        command.includes("stop") ||
        command.includes("close assistant")
    ){

        stopVoiceAssistant();

        return;
    }

    /* =========================================
    CHAT
    ========================================= */

    if(command.includes("open chat")){

        openChatAssistant?.();

        speakText(
            "Opening chat assistant"
        );

        return;
    }

    /* =========================================
    TASKS
    ========================================= */

    if(command.includes("open tasks")){

        openTasksPanel?.();

        speakText(
            "Opening tasks"
        );

        return;
    }

    /* =========================================
    CALENDAR
    ========================================= */

    if(
        command.includes(
            "open calendar"
        )
    ){

        openCalendar?.();

        speakText(
            "Opening calendar"
        );

        return;
    }

    /* =========================================
    THEME
    ========================================= */

    if(command.includes("dark mode")){

        document.body.setAttribute(
            "data-theme",
            "dark"
        );

        speakText(
            "Dark mode activated"
        );

        return;
    }

    if(command.includes("light mode")){

        document.body.setAttribute(
            "data-theme",
            "light"
        );

        speakText(
            "Light mode activated"
        );

        return;
    }

    /* =========================================
    SCROLL
    ========================================= */

    if(
        command.includes(
            "scroll down"
        )
    ){

        window.scrollBy({

            top: 500,

            behavior: "smooth"
        });

        return;
    }

    if(
        command.includes(
            "scroll up"
        )
    ){

        window.scrollBy({

            top: -500,

            behavior: "smooth"
        });

        return;
    }

    /* =========================================
    AI FALLBACK
    ========================================= */

    sendToAI(command);
}

/* =========================================================
AI REQUEST
========================================================= */

async function sendToAI(message){

    try{

        addMessage?.(
            message,
            "user"
        );

        const response =
    await fetch("http://localhost:5000/api/chat", {

        method: "POST",

        headers: {

            "Content-Type":
            "application/json",

            // =====================================
            // USER AUTH
            // =====================================
            "Authorization":
            authToken
        },

        body: JSON.stringify({

            text: message
        })
    });
        const data =
            await response.json();

        addMessage?.(
            data.reply,
            "bot"
        );

        speakText(
            data.reply
        );

    }catch(error){

        console.error(error);

        speakText(
            "I'm having trouble connecting to the server. Please check your internet connection and try again."
        );
    }
}

/* =========================================================
TEXT TO SPEECH
========================================================= */

function setVoiceSphereVisualState(state, label){

    if(!sphereOverlay) return;

    document.body?.classList.toggle(
        "voice-sphere-open",
        state !== "idle"
    );

    sphereOverlay.classList.remove(
        "active",
        "listening",
        "speaking"
    );

    if(state !== "idle"){

        sphereOverlay.classList.add("active");

        sphereOverlay.classList.add(state);
    }else{

        sphereOverlay.style.removeProperty("display");
    }

    const sphere =
        document.getElementById("voiceSphere");

    if(sphere){

        sphere.classList.remove(
            "state-idle",
            "state-listening",
            "state-speaking"
        );

        sphere.classList.add(
            `state-${state}`
        );
    }

    const stateEl =
        document.getElementById("voiceSphereState");

    if(stateEl && label){

        stateEl.textContent = label;
    }
}

async function startVoiceMeter(){

    const sphere =
        document.getElementById("voiceSphere");

    if(
        !sphere ||
        voiceMeterStream ||
        !navigator.mediaDevices?.getUserMedia
    ) return;

    try{

        voiceMeterStream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        voiceMeterContext =
            new (window.AudioContext || window.webkitAudioContext)();

        const source =
            voiceMeterContext.createMediaStreamSource(
                voiceMeterStream
            );

        const analyser =
            voiceMeterContext.createAnalyser();

        analyser.fftSize = 256;

        source.connect(analyser);

        const data =
            new Uint8Array(analyser.frequencyBinCount);

        const updateLevel = () => {

            analyser.getByteTimeDomainData(data);

            let sum = 0;

            for(const value of data){

                const centered =
                    (value - 128) / 128;

                sum += centered * centered;
            }

            const rms =
                Math.sqrt(sum / data.length);

            const level =
                Math.min(1, rms * 8);

            sphere.style.setProperty(
                "--voice-level",
                level.toFixed(3)
            );

            voiceMeterFrame =
                requestAnimationFrame(updateLevel);
        };

        updateLevel();

    }catch(error){

        console.warn(
            "Voice meter unavailable",
            error
        );
    }
}

function stopVoiceMeter(){

    if(voiceMeterFrame){

        cancelAnimationFrame(voiceMeterFrame);

        voiceMeterFrame = null;
    }

    if(voiceMeterStream){

        voiceMeterStream.getTracks().forEach(
            track => track.stop()
        );

        voiceMeterStream = null;
    }

    if(voiceMeterContext){

        voiceMeterContext.close?.();

        voiceMeterContext = null;
    }

    const sphere =
        document.getElementById("voiceSphere");

    sphere?.style.setProperty(
        "--voice-level",
        "0"
    );
}

function speakText(text){

    if(!("speechSynthesis" in window))
        return;

    window.speechSynthesis.cancel();

    setVoiceSphereVisualState(
        "speaking",
        "Speaking..."
    );

    const utterance =
        new SpeechSynthesisUtterance(
            text
        );

    utterance.rate = 1;

    utterance.pitch = 1;

    utterance.volume = 1;

    utterance.onend = () => {

        if(!isListening){

            setVoiceSphereVisualState(
                "idle",
                "Tap the mic to start"
            );
        }else{

            setVoiceSphereVisualState(
                "listening",
                "Listening... Speak naturally"
            );
        }
    };

    window.speechSynthesis.speak(
        utterance
    );
}

/* =========================================================
TRANSCRIPT
========================================================= */

function updateTranscript(text){

    if(!transcriptElement) return;

    transcriptElement.textContent =
        text;

    transcriptElement.scrollTop =
        transcriptElement.scrollHeight;
}

/* =========================================================
STATUS
========================================================= */

function updateVoiceStatus(text){

    if(voiceStatusText){

        voiceStatusText.textContent =
            text;
    }
}

/* =========================================================
HELPERS
========================================================= */

function showError(message){

    console.error(message);

    updateVoiceStatus(message);
}
// Calendar
function renderCalendar() {
    const calendar = document.getElementById('miniCalendar');
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = 'bold';
        dayHeader.style.textAlign = 'center';
        calendar.appendChild(dayHeader);
    });
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        calendar.appendChild(emptyDay);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayMemories = memories.filter(memory => memory.date.startsWith(dateStr));
        
        if (dayMemories.length > 0) {
            dayElement.classList.add('has-memories');
            dayElement.innerHTML = `
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-day-memories">${dayMemories.length} ${dayMemories.length === 1 ? 'memory' : 'memories'}</div>
            `;
        } else {
            dayElement.innerHTML = `<div class="calendar-day-number">${day}</div>`;
        }
        
        dayElement.addEventListener('click', () => showDayMemories(dateStr, dayMemories));
        calendar.appendChild(dayElement);
    }
}

function showDayMemories(date, dayMemories) {
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h2>Memories for ${formatDate(date)}</h2>
        ${dayMemories.length === 0 ? '<p>No memories for this day.</p>' : 
            dayMemories.map(memory => `
                <div style="background: var(--surface); padding: 1rem; border-radius: 0.5rem; margin-bottom: 1rem;">
                    <h3>${memory.title}</h3>
                    <p style="color: var(--text-secondary);">${memory.description}</p>
                    <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                        <span class="memory-category">${memory.category}</span>
                        <span style="background: var(--mood-${memory.mood}); color: white; padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.8rem;">${memory.mood}</span>
                    </div>
                </div>
            `).join('')
        }
    `;
    
    document.getElementById('memoryModal').style.display = 'block';
}

// Utility Functions
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: var(--success);' : 'background: var(--error);'}
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
function initializeApp() {
    setupEventListeners();
    checkAuthStatus();
    loadTheme();
    
    // Page-specific initialization
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage === 'index.html') {
        initializeHomePage();
    } else if (currentPage === 'login.html') {
        initializeLoginPage();
    } else if (currentPage === 'register.html') {
        initializeRegisterPage();
    } else if (currentPage === 'dashboard.html') {
        initializeDashboard();
    }
}

// Theme Management
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || localStorage.getItem('darkMode') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    localStorage.setItem('theme', savedTheme);
    localStorage.setItem('darkMode', savedTheme);
    if (typeof ENHANCED_STATE !== 'undefined') {
        ENHANCED_STATE.darkMode = savedTheme === 'dark';
    }
    updateDarkModeIcon();
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('darkMode', newTheme);
    if (typeof ENHANCED_STATE !== 'undefined') {
        ENHANCED_STATE.darkMode = newTheme === 'dark';
    }
    updateDarkModeIcon();
    
    // Add transition effect
    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    // Show notification
    const themeName = newTheme === 'dark' ? 'Dark Mode' : 'Light Mode';
    showNotification(`${themeName} enabled`, 'success');
}

function updateDarkModeIcon() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const currentTheme = document.documentElement.getAttribute('data-theme');
    
    if (darkModeToggle) {
        const icon = darkModeToggle.querySelector('i');
        if (currentTheme === 'dark') {
            icon.className = 'fas fa-sun';
            darkModeToggle.title = 'Switch to Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            darkModeToggle.title = 'Switch to Dark Mode';
        }
    }
}

// Navigation
function setupEventListeners() {
    // Mobile navigation toggle
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!navMenu.contains(e.target) && !navToggle.contains(e.target)) {
                navMenu.classList.remove('active');
            }
        });
    }
    
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleTheme);
        
        // Update icon based on current theme
        updateDarkModeIcon();
    }
    
    // Logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
}

// Authentication
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        
        // Update UI for logged-in user
        updateAuthUI();
        
        // Redirect to dashboard if on auth pages
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'login.html' || currentPage === 'register.html') {
            window.location.href = 'dashboard.html';
        }
    }
}

function updateAuthUI() {
    const userName = document.getElementById('userName');
    const userDisplayName = document.getElementById('userDisplayName');
    
    if (currentUser && userName) {
        userName.textContent = currentUser.name || currentUser.email || 'User';
    }
    
    if (currentUser && userDisplayName) {
        userDisplayName.textContent = currentUser.name || currentUser.email || 'User';
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    
    showLoading();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Check if backend is available
    try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showSuccess('Login successful! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        
        // If backend is not available, create a demo account for testing
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
            // Create demo user for testing purposes
            const demoUser = {
                name: email.split('@')[0], // Use email prefix as name
                email: email,
                id: Date.now()
            };
            
            authToken = 'demo_token_' + Date.now();
            currentUser = demoUser;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showSuccess('Demo login successful! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError('Network error. Please try again.');
        }
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    if (e) e.preventDefault();
    
    showLoading();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (password !== confirmPassword) {
        showError('Passwords do not match');
        hideLoading();
        return;
    }
    
    if (password.length < 6) {
        showError('Password must be at least 6 characters long');
        hideLoading();
        return;
    }
    
    // Check if backend is available
    try {
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name: `${firstName} ${lastName}`,
                email, 
                password 
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.access_token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showSuccess('Registration successful! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        
        // If backend is not available, create a demo account for testing
        if (error.name === 'AbortError' || error.message.includes('fetch')) {
            // Create demo user for testing purposes
            const demoUser = {
                name: `${firstName} ${lastName}`,
                email: email,
                id: Date.now()
            };
            
            authToken = 'demo_token_' + Date.now();
            currentUser = demoUser;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showSuccess('Demo account created! Redirecting to dashboard...');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            showError('Network error. Please try again.');
        }
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    
    showSuccess('Logged out successfully');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1000);
}

// Page Initializers
function initializeHomePage() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if (!loginForm.dataset.submitBound) {
            loginForm.addEventListener('submit', handleLogin);
            loginForm.dataset.submitBound = 'true';
        }
    }
    
    // Google OAuth configuration
    const GOOGLE_CLIENT_ID = '127133815034-bljv5l22k71v2s4o7q7kjkmrmnitveq5.apps.googleusercontent.com'; // REPLACE with your actual Google Client ID
    
    // Initialize Google Sign-In
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignIn
        });
        
        // Render Google Sign-In button
        const googleSignInElement = document.getElementById('googleSignIn');
        if (googleSignInElement) {
            google.accounts.id.renderButton(googleSignInElement, {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left'
            });
        }
    }
    
    // Facebook login handler (placeholder)
    const facebookBtn = document.querySelector('.btn-facebook');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => {
            showInfo('Facebook login coming soon!');
        });
    }
}

function initializeRegisterPage() {
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        if (!registerForm.dataset.submitBound) {
            registerForm.addEventListener('submit', handleRegister);
            registerForm.dataset.submitBound = 'true';
        }
    }
    
    // Password strength indicator
    const passwordInput = document.getElementById('password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    if (passwordInput && strengthBar && strengthText) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strength = calculatePasswordStrength(password);
            
            strengthBar.style.width = `${strength.percentage}%`;
            strengthBar.style.backgroundColor = strength.color;
            strengthText.textContent = strength.text;
        });
    }
    
    // Google OAuth configuration for registration
    const GOOGLE_CLIENT_ID = '127133815034-bljv5l22k71v2s4o7q7kjkmrmnitveq5.apps.googleusercontent.com'; // REPLACE with your actual Google Client ID
    
    // Initialize Google Sign-In for registration
    if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleSignUp
        });
        
        // Render Google Sign-In button for registration
        const googleSignUpElement = document.getElementById('googleSignUp');
        if (googleSignUpElement) {
            google.accounts.id.renderButton(googleSignUpElement, {
                theme: 'outline',
                size: 'large',
                text: 'signup_with',
                shape: 'rectangular',
                logo_alignment: 'left'
            });
        }
    }
    
    // Facebook signup handler (placeholder)
    const facebookBtn = document.querySelector('.btn-facebook');
    if (facebookBtn) {
        facebookBtn.addEventListener('click', () => {
            showInfo('Facebook signup coming soon!');
        });
    }
}

// Google OAuth handler functions
function handleGoogleSignIn(response) {
    showLoading();
    
    // Send Google ID token to backend for verification
    fetch(`${API_BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: response.credential
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token && data.user) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            authToken = data.access_token;
            currentUser = data.user;
            showSuccess('Successfully logged in with Google!');
            window.location.href = 'dashboard.html';
        } else {
            showError('Google login failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Google login error:', error);
        showError('Google login failed. Please try again.');
    })
    .finally(() => {
        hideLoading();
    });
}

function handleGoogleSignUp(response) {
    showLoading();
    
    // Send Google ID token to backend for registration
    fetch(`${API_BASE_URL}/auth/google/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: response.credential
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token && data.user) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            authToken = data.access_token;
            currentUser = data.user;
            showSuccess('Successfully registered with Google!');
            window.location.href = 'dashboard.html';
        } else {
            showError('Google registration failed. Please try again.');
        }
    })
    .catch(error => {
        console.error('Google registration error:', error);
        showError('Google registration failed. Please try again.');
    })
    .finally(() => {
        hideLoading();
    });
}

function initializeDashboard() {
    if (!authToken) {
        window.location.href = 'login.html';
        return;
    }

    loadDashboardData();
    setupDashboardEventListeners();
}

async function loadDashboardData() {
    await Promise.all([
        loadStats(),
        renderMiniCalendar()
    ]);
}

function setupDashboardEventListeners() {
    
    // Memory form
    const memoryForm = document.getElementById('memoryForm');
    if (memoryForm) {
        memoryForm.addEventListener('submit', handleMemorySubmit);
    }
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const moodFilter = document.getElementById('moodFilter');
    
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 500));
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', handleSearch);
    }
    
    if (moodFilter) {
        moodFilter.addEventListener('change', handleSearch);
    }
    
    // Panel toggles
    document.querySelectorAll('.panel-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const panel = this.closest('.dashboard-panel');
            const content = panel.querySelector('.panel-content');
            const icon = this.querySelector('i');
            
            content.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-up');
            icon.classList.toggle('fa-chevron-down');
        });
    });
}

// Dashboard Functions
async function loadStats() {
    try {
        // Check if we're in demo mode
        if (authToken && authToken.startsWith('demo_token_')) {
            // Load demo stats
            document.getElementById('totalMemories').textContent = '12';
            document.getElementById('totalCategories').textContent = '6';
            document.getElementById('favoriteMood').textContent = 'Happy';
            document.getElementById('recentMemories').textContent = '3';
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalMemories').textContent = data.total_memories || 0;
            document.getElementById('totalCategories').textContent = data.categories?.length || 0;
            document.getElementById('favoriteMood').textContent = data.favorite_mood || 'Happy';
            document.getElementById('recentMemories').textContent = data.recent_memories || 0;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        
        // Load demo stats if backend is not available
        if (authToken && authToken.startsWith('demo_token_')) {
            document.getElementById('totalMemories').textContent = '12';
            document.getElementById('totalCategories').textContent = '6';
            document.getElementById('favoriteMood').textContent = 'Happy';
            document.getElementById('recentMemories').textContent = '3';
        }
    }
}

function renderMiniCalendar() {
    const calendar = document.getElementById('miniCalendar');
    if (!calendar) return;

    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - 7);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let calendarHTML = `
        <div class="calendar-span" style="grid-column: 1 / -1; text-align: center; font-weight: 700; margin-bottom: 0.75rem; color: var(--text-primary);">
            ${monthNames[today.getMonth()]} ${today.getFullYear()} · 4-Week View
        </div>
    `;

    weekdayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-label">${day}</div>`;
    });

    for (let i = 0; i < 28; i++) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const isToday = dateKey === today.toISOString().split('T')[0];
        const memories = (ENHANCED_STATE.memories || []).filter(mem => {
            const memDate = mem.date || mem.createdAt || '';
            return memDate.startsWith(dateKey);
        });
        const memoryCount = memories.length;
        const classes = ['calendar-day', memoryCount ? 'has-memories' : '', isToday ? 'today' : ''].filter(Boolean).join(' ');

        calendarHTML += `
            <div class="${classes}" onclick="showDayMemories(${date.getFullYear()}, ${date.getMonth()}, ${date.getDate()})">
                <div>
                    <div class="calendar-day-label">${weekdayNames[date.getDay()]}</div>
                    <div class="calendar-day-number">${date.getDate()}</div>
                </div>
                <div class="calendar-day-memories">${memoryCount ? `${memoryCount} memory` + (memoryCount > 1 ? 's' : '') : 'No memories'}</div>
            </div>
        `;
    }

    calendar.innerHTML = calendarHTML;
}

async function handleMemorySubmit(e) {
    if (e) e.preventDefault();
    
    showLoading();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('memoryTitle').value);
    formData.append('description', document.getElementById('memoryDescription').value);
    formData.append('date', document.getElementById('memoryDate').value);
    formData.append('mood', document.getElementById('memoryMood').value);
    formData.append('category', document.getElementById('memoryCategory').value);
    formData.append('tags', document.getElementById('memoryTags').value);
    
    const imageInput = document.getElementById('memoryImage');
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }
    
    // Check if we're in demo mode
    if (authToken && authToken.startsWith('demo_token_')) {
        // Simulate memory creation in demo mode
        setTimeout(() => {
            showSuccess('Memory created successfully! (Demo mode)');
            document.getElementById('memoryForm').reset();
            loadDashboardData(); // Reload dashboard data
        }, 1000);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/memories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showSuccess('Memory created successfully!');
            document.getElementById('memoryForm').reset();
            loadDashboardData();
        } else {
            showError(data.error || 'Failed to create memory');
        }
    } catch (error) {
        console.error('Memory creation error:', error);
        showError('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const mood = document.getElementById('moodFilter').value;
    
    // Implement search functionality
    console.log('Searching:', { searchTerm, category, mood });
}

function toggleVoiceRecording() {
    // Implement voice recording functionality
    showInfo('Voice recording coming soon!');
}

function scrollToPanel(panelId) {
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    if (panel) {
        panel.scrollIntoView({ behavior: 'smooth' });
    }
}

// Utility Functions
function calculatePasswordStrength(password) {
    let strength = 0;
    let feedback = '';
    
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 12.5;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 12.5;
    
    if (strength < 25) {
        feedback = 'Weak';
        color = '#ef4444';
    } else if (strength < 50) {
        feedback = 'Fair';
        color = '#f59e0b';
    } else if (strength < 75) {
        feedback = 'Good';
        color = '#10b981';
    } else {
        feedback = 'Strong';
        color = '#059669';
    }
    
    return {
        percentage: strength,
        text: feedback,
        color: color
    };
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showDayMemories(year, month, day) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    showInfo(`Memories for ${formatDate(date)} - Feature coming soon!`);
}

// Loading and Notifications
function showLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/* ════════════════════════════════════════════════
   CAREOPS ENHANCEMENTS (TASKS, EXPENSES, CHARTS, VOICE ORB)
════════════════════════════════════════════════ */
const CONFIG = {
  API_URL: (typeof window.API_URL !== 'undefined') ? window.API_URL : API_BASE_URL
};

/* ════════════════════════════════════════════════
   STATE (enhanced)
════════════════════════════════════════════════ */
const ENHANCED_STATE = {
  tasks: JSON.parse(localStorage.getItem('pma_tasks') || '[]'),
  expenses: JSON.parse(localStorage.getItem('pma_expenses') || '[]'),
  memories: JSON.parse(localStorage.getItem('pma_memories') || '[]'),
  voiceLogs: JSON.parse(localStorage.getItem('pma_voice_logs') || '[]'),
  taskFilter: 'all',
  darkMode: (localStorage.getItem('theme') || localStorage.getItem('darkMode') || 'light') === 'dark',
};

const saveEnhanced = () => {
  localStorage.setItem('pma_tasks', JSON.stringify(ENHANCED_STATE.tasks));
  localStorage.setItem('pma_expenses', JSON.stringify(ENHANCED_STATE.expenses));
  localStorage.setItem('pma_memories', JSON.stringify(ENHANCED_STATE.memories));
  localStorage.setItem('pma_voice_logs', JSON.stringify(ENHANCED_STATE.voiceLogs));
};

/* ════════════════════════════════════════════════
   TOAST (unified)
════════════════════════════════════════════════ */
function toast(msg, type = 'info') {
  const icons = { success:'fa-check-circle', error:'fa-exclamation-circle', info:'fa-info-circle' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<i class="fas ${icons[type]}"></i> ${msg}`;
  
  // Try to find toast-wrap, create it if it doesn't exist
  let toastWrap = document.getElementById('toast-wrap');
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.id = 'toast-wrap';
    toastWrap.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px;';
    document.body.appendChild(toastWrap);
  }
  
  toastWrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

/* ════════════════════════════════════════════════
   DARK MODE (enhanced)
════════════════════════════════════════════════ */
function applyEnhancedTheme() {
  document.documentElement.setAttribute('data-theme', ENHANCED_STATE.darkMode ? 'dark' : 'light');
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) toggle.innerHTML = ENHANCED_STATE.darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
}
applyEnhancedTheme();

/* ════════════════════════════════════════════════
   SIDEBAR / ASSISTANT CONTROLS
════════════════════════════════════════════════ */
document.getElementById('sidebarToggle')?.addEventListener('click', () => {
  const overlay = document.getElementById('assistantOverlay');
  const sidebar = document.getElementById('sidebar');
  if (overlay && !overlay.classList.contains('hidden')) {
    hideAssistantOverlay();
    return;
  }
  sidebar?.classList.toggle('open');
  updateSidebarToggleIcon();
});

// Assistant button removed - chat assistant is always open

// Chat Assistant is always open - no need for open button

document.getElementById('assistantClose')?.addEventListener('click', () => {
  hideAssistantOverlay();
});

document.getElementById('assistantOverlay')?.addEventListener('click', (event) => {
  if (event.target === document.getElementById('assistantOverlay')) {
    hideAssistantOverlay();
  }
});

document.getElementById('assistantVoiceButton')?.addEventListener('click', () => {
  toggleAssistantVoice();
});

document.getElementById('assistantSendBtn')?.addEventListener('click', () => {
  handleAssistantText();
});

document.getElementById('assistantTextInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAssistantText();
  } else {
    setAssistantOrbMode('typing');
    updateAssistantStatus('Typing...');
  }
});

document.getElementById('assistantTextInput')?.addEventListener('focus', () => {
  setAssistantOrbMode('typing');
  updateAssistantStatus('Typing...');
});

document.getElementById('assistantTextInput')?.addEventListener('blur', () => {
  if (isListeningEnhanced) {
    setAssistantOrbMode('listening');
    updateAssistantStatus('Listening...');
  } else {
    setAssistantOrbMode('idle');
    updateAssistantStatus('Ready for voice or text');
  }
});

document.getElementById('assistantClearBtn')?.addEventListener('click', () => {
  const conv = document.getElementById('assistantConversation');
  if (conv) conv.innerHTML = '';
  const hub = document.getElementById('hubConversation');
  if (hub) hub.innerHTML = '';
});

document.getElementById('hubSendBtn')?.addEventListener('click', () => {
  handleHubText();
});

document.getElementById('hubTextInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleHubText();
  } else {
    setAssistantOrbMode('typing');
  }
});

document.getElementById('sidebarReturn')?.addEventListener('click', () => {
  document.getElementById('sidebar')?.classList.remove('open');
  updateSidebarToggleIcon();
  if (window.innerWidth <= 1100) {
    window.history.length > 1 ? window.history.back() : window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

function smoothTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('sidebar')?.classList.remove('open');
  updateSidebarToggleIcon();
}

function updateSidebarToggleIcon() {
  const btn = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('assistantOverlay');
  const sidebar = document.getElementById('sidebar');
  if (!btn) return;

  if (overlay && !overlay.classList.contains('hidden')) {
    btn.title = 'Return';
    btn.innerHTML = '<i class="fas fa-arrow-left"></i>';
    btn.classList.add('return-active');
    return;
  }

  if (sidebar && sidebar.classList.contains('open')) {
    btn.title = window.innerWidth <= 1100 ? 'Return' : 'Close menu';
    btn.innerHTML = window.innerWidth <= 1100 ? '<i class="fas fa-arrow-left"></i>' : '<i class="fas fa-times"></i>';
    btn.classList.toggle('return-active', window.innerWidth <= 1100);
    return;
  }

  btn.title = 'Open menu';
  btn.innerHTML = '<i class="fas fa-bars"></i>';
  btn.classList.remove('return-active');
}

function showAssistantOverlay() {
  const overlay = document.getElementById('assistantOverlay');
  overlay?.classList.remove('hidden');
  assistantActive = true;
  startAssistantAudio();
  if (!assistantAnimationFrame) animateAssistantOrb();
  updateSidebarToggleIcon();
  updateAssistantVoiceButton();
  updateAssistantStatus(isListeningEnhanced ? 'Listening...' : 'Ready for voice or text');
}

function hideAssistantOverlay() {
  const overlay = document.getElementById('assistantOverlay');
  overlay?.classList.add('hidden');
  assistantActive = false;
  stopAssistantAudio();
  stopListeningEnhanced();
  setAssistantOrbMode('idle');
  updateSidebarToggleIcon();
  updateAssistantVoiceButton();
  updateAssistantStatus('Ready for voice or text');
}

function toggleAssistantVoice() {
  if (isListeningEnhanced) {
    stopListeningEnhanced();
    setAssistantOrbMode('idle');
    updateAssistantStatus('Voice stopped');
  } else {
    startListeningEnhanced();
    setAssistantOrbMode('listening');
    updateAssistantStatus('Listening...');
  }
  updateAssistantVoiceButton();
}

function updateAssistantVoiceButton() {
  const btn = document.getElementById('assistantVoiceButton');
  if (!btn) return;
  if (isListeningEnhanced) {
    btn.innerHTML = '<i class="fas fa-stop"></i> Stop Voice';
    btn.classList.add('active');
  } else {
    btn.innerHTML = '<i class="fas fa-microphone"></i> Start Voice';
    btn.classList.remove('active');
  }
}

function updateAssistantStatus(text) {
  const status = document.getElementById('assistantStatus');
  if (status) status.textContent = text;
}

function appendAssistantMessage(role, text) {
  ['assistantConversation', 'hubConversation'].forEach(id => {
    const conv = document.getElementById(id);
    if (!conv) return;
    const item = document.createElement('div');
    item.className = `assistant-message ${role}`;
    item.innerHTML = `
      <span class="assistant-message-label">${role === 'user' ? 'You' : 'Chat Assistant'}</span>
      <span class="assistant-message-text">${escHtml(text)}</span>
    `;
    conv.appendChild(item);
    conv.scrollTop = conv.scrollHeight;
  });
}

function handleAssistantText() {
  const input = document.getElementById('assistantTextInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  appendAssistantMessage('user', value);
  processEnhancedCommand(value);
  input.value = '';
  setAssistantOrbMode('processing');
  updateAssistantStatus('Processing...');
}

function handleHubText() {
  const input = document.getElementById('hubTextInput');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  appendAssistantMessage('user', value);
  processEnhancedCommand(value);
  input.value = '';
  setAssistantOrbMode('processing');
  updateAssistantStatus('Processing...');
}

function setAssistantOrbMode(mode) {
  assistantOrbMode = mode;
  if (mode === 'typing') {
    assistantActive = false;
  } else if (mode === 'listening') {
    assistantActive = true;
  }
}


async function startAssistantAudio() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
  if (assistantAudioContext) return;

  try {
    assistantStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    assistantAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = assistantAudioContext.createMediaStreamSource(assistantStream);
    assistantAnalyser = assistantAudioContext.createAnalyser();
    assistantAnalyser.fftSize = 256;
    assistantDataArray = new Uint8Array(assistantAnalyser.frequencyBinCount);
    source.connect(assistantAnalyser);
    if (!assistantAnimationFrame) animateAssistantOrb();
  } catch (error) {
    console.warn('Assistant audio capture failed', error);
  }
}

function stopAssistantAudio() {
  if (assistantAnimationFrame) {
    cancelAnimationFrame(assistantAnimationFrame);
    assistantAnimationFrame = null;
  }
  if (assistantStream) {
    assistantStream.getTracks().forEach(track => track.stop());
    assistantStream = null;
  }
  if (assistantAudioContext) {
    assistantAudioContext.close();
    assistantAudioContext = null;
    assistantAnalyser = null;
    assistantDataArray = null;
  }
}

function animateAssistantOrb() {
  const canvas = document.getElementById('assistantOrbCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const R = W / 2;
  const now = Date.now() * 0.002;
  let volume = 0.08;
  let hue = 210;

  if (assistantAnalyser && assistantDataArray) {
    assistantAnalyser.getByteFrequencyData(assistantDataArray);
    const sum = assistantDataArray.reduce((acc, val) => acc + val, 0);
    volume = Math.min(1, Math.max(0.1, sum / assistantDataArray.length / 140));
    hue = 200 + Math.min(70, Math.max(0, sum / assistantDataArray.length / 4));
  }

  ctx.clearRect(0, 0, W, H);
  const coreColor = `hsl(${hue}, 95%, 60%)`;
  const outerColor = `hsl(${hue}, 85%, 30%)`;
  const glow = 0.45 + volume * 0.45;

  let orbScale = 1;
  if (assistantOrbMode === 'typing') {
    orbScale = 0.72;
    volume = 0.04;
    hue = 180;
  } else if (assistantOrbMode === 'processing') {
    orbScale = 0.92;
  } else if (assistantOrbMode === 'listening') {
    orbScale = 1.08 + volume * 0.12;
  }

  const background = ctx.createRadialGradient(R, R, 8, R, R, R);
  background.addColorStop(0, `${coreColor}`);
  background.addColorStop(0.45, `${coreColor}bb`);
  background.addColorStop(0.75, `${outerColor}55`);
  background.addColorStop(1, `${outerColor}00`);
  ctx.fillStyle = background;
  ctx.globalAlpha = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  const baseRadius = R * (0.82 * orbScale);
  const ripple = baseRadius * (0.92 + 0.08 * Math.sin(now * 2));
  const wobble = 10 * volume;
  ctx.beginPath();
  ctx.ellipse(R, R, ripple + wobble, ripple - wobble, Math.sin(now) * 0.2, 0, Math.PI * 2);
  const orbGrad = ctx.createRadialGradient(R - 18, R - 18, 4, R, R, ripple - 2);
  orbGrad.addColorStop(0, `${coreColor}`);
  orbGrad.addColorStop(0.65, `${coreColor}cc`);
  orbGrad.addColorStop(1, `${outerColor}`);
  ctx.fillStyle = orbGrad;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = `hsla(${hue}, 95%, 75%, 0.75)`;
  ctx.lineWidth = 2;
  ctx.ellipse(R, R, ripple * 0.92, ripple * 0.88, Math.cos(now) * 0.12, 0, Math.PI * 2);
  ctx.stroke();

  if (assistantActive || assistantOrbMode === 'typing') {
    ctx.beginPath();
    ctx.arc(R, R, 10 + volume * 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
  }

  assistantAnimationFrame = requestAnimationFrame(animateAssistantOrb);
}

/* ════════════════════════════════════════════════
   USER (enhanced)
════════════════════════════════════════════════ */
const storedUserEnhanced = JSON.parse(localStorage.getItem('pma_user') || '{"name":"User"}');
['userName','userDisplayName'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = storedUserEnhanced.name;
});
document.getElementById('logoutLink')?.addEventListener('click', e => {
  e.preventDefault();
  localStorage.removeItem('pma_user');
  window.location.href = 'index.html';
});
document.getElementById('sidebarLogout')?.addEventListener('click', e => {
  e.preventDefault();
  localStorage.removeItem('pma_user');
  window.location.href = 'index.html';
});

/* ════════════════════════════════════════════════
   UTILITY (enhanced)
════════════════════════════════════════════════ */
const uidEnhanced = () => Math.random().toString(36).slice(2, 10);
const fmtMoney = n => '₹' + Number(n).toFixed(2);
function timeAgoEnhanced(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

const CAT_COLORS = {
  work:'#0891b2', study:'#6366f1', personal:'#059669', finance:'#db2777',
  food:'#0891b2', entertainment:'#6366f1', utilities:'#db2777',
  transport:'#059669', health:'#d97706', shopping:'#d97706',
  salary:'#0891b2', general:'#6366f1', family:'#059669',
  friends:'#0891b2', travel:'#d97706', education:'#6366f1',
  hobby:'#db2777', other:'#64748b',
};

/* ════════════════════════════════════════════════
   RENDER: TASKS (enhanced)
════════════════════════════════════════════════ */
function renderEnhancedTasks() {
  const list = document.getElementById('taskList');
  if (!list) return;
  let filtered = ENHANCED_STATE.taskFilter === 'all' ? ENHANCED_STATE.tasks
    : ENHANCED_STATE.tasks.filter(t => t.category === ENHANCED_STATE.taskFilter);

  updateEnhancedTaskStats();

  if (!filtered.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-check-circle"></i>No tasks found.</div>';
    return;
  }

  list.innerHTML = filtered.map(t => {
    const catColor = CAT_COLORS[t.category] || '#a0aec0';
    return `
    <div class="memory-card task-card ${t.done ? 'completed' : 'pending'}" id="task-${t.id}">
      <div class="memory-card-header">
        <div class="memory-card-icon task-icon ${t.done ? 'completed' : 'pending'}" style="background: ${t.done ? 'linear-gradient(135deg, var(--green), #10b981)' : 'linear-gradient(135deg, var(--primary), var(--secondary-color))'};">
          <i class="fas ${t.done ? 'fa-check' : 'fa-clock'}"></i>
        </div>
        <div class="memory-card-meta">
          <span class="memory-card-type task-type" style="background: ${catColor};">${t.category}</span>
          <span class="memory-card-time task-status ${t.done ? 'completed' : 'pending'}">${t.done ? 'Completed' : 'Pending'}</span>
        </div>
      </div>
      <div class="memory-card-content task-content">
        <h4 class="${t.done ? 'completed-title' : ''}">${escHtml(t.title)}</h4>
        <div class="task-details">
          ${t.reminder ? `<div class="task-reminder"><i class="fas fa-bell"></i> ${escHtml(t.reminder)}</div>` : ''}
          <div class="task-priority">
            <span class="priority-badge ${t.priority || 'medium'}">${t.priority || 'medium'}</span>
          </div>
        </div>
      </div>
      <button class="task-complete-btn" onclick="toggleEnhancedTask('${t.id}')" title="${t.done ? 'Mark as pending' : 'Mark as complete'}">
        <i class="fas ${t.done ? 'fa-undo' : 'fa-check'}"></i>
      </button>
      <button class="task-delete-btn" onclick="deleteEnhancedTask('${t.id}')" title="Delete task">
        <i class="fas fa-trash"></i>
      </button>
    </div>`;
  }).join('');
}

function updateEnhancedTaskStats() {
  const total = ENHANCED_STATE.tasks.length;
  const done = ENHANCED_STATE.tasks.filter(t => t.done).length;
  const pending = total - done;
  const withReminders = ENHANCED_STATE.tasks.filter(t => t.reminder && t.reminder.trim() !== '' && !t.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const ids = ['ov-total','statTasksDone','ov-done'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [total, done, done][i];
  });
  const pendEl = document.getElementById('ov-pending'); if (pendEl) pendEl.textContent = pending;
  const remindersEl = document.getElementById('ov-reminders'); if (remindersEl) remindersEl.textContent = withReminders;
  const pctEl = document.getElementById('completion-pct'); if (pctEl) pctEl.textContent = pct + '%';
  const barEl = document.getElementById('completion-bar'); if (barEl) barEl.style.width = pct + '%';
  const lblEl = document.getElementById('task-count-label'); if (lblEl) lblEl.textContent = `${total} task${total !== 1 ? 's' : ''}`;
  const sbEl = document.getElementById('sidebar-task-count'); if (sbEl) sbEl.textContent = pending;
  const sidEl = document.getElementById('statTasksDone'); if (sidEl) sidEl.textContent = done;

  // Category breakdown
  const cats = {};
  ENHANCED_STATE.tasks.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });
  const bd = document.getElementById('cat-breakdown');
  if (bd) {
    bd.innerHTML = Object.entries(cats).map(([cat, cnt]) => {
      const c = CAT_COLORS[cat] || '#a0aec0';
      const pctCat = total > 0 ? (cnt / total * 100).toFixed(0) : 0;
      return `
      <div class="memory-card task-overview-card">
        <div class="memory-card-header">
          <div class="memory-card-icon task-category-icon" style="background: linear-gradient(135deg, ${c}aa, ${c});">
            <i class="fas fa-tasks"></i>
          </div>
          <div class="memory-card-meta">
            <span class="memory-card-type task-category-type" style="background: ${c};">${cat}</span>
            <span class="memory-card-time task-count">${cnt} tasks</span>
          </div>
        </div>
        <div class="memory-card-content task-overview-content">
          <h4>Task Distribution</h4>
          <div class="task-overview-details">
            <div class="task-percentage" style="color: ${c}; border-color: ${c}; background: ${c}15;">
              ${pctCat}%
            </div>
            <div class="task-progress">
              <div class="task-progress-bar">
                <div class="task-progress-fill" style="width: ${pctCat}%; background: linear-gradient(90deg, ${c}aa, ${c}); box-shadow: 0 0 6px ${c}60;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  updateEnhancedCharts();
}

function addEnhancedTask() {
  const title = document.getElementById('taskInput')?.value.trim();
  if (!title) return toast('Please enter a task title.', 'error');
  const task = {
    id: uidEnhanced(),
    title,
    category: document.getElementById('taskCategory')?.value || 'general',
    reminder: document.getElementById('taskReminder')?.value.trim() || '',
    done: false,
    createdAt: new Date().toISOString()
  };
  ENHANCED_STATE.tasks.unshift(task);
  saveEnhanced(); renderEnhancedTasks(); updateEnhancedTaskStats(); updateEnhancedCharts();
  
  // Clear input fields after adding
  document.getElementById('taskInput').value = '';
  document.getElementById('taskCategory').value = 'general';
  document.getElementById('taskReminder').value = '';
  
  toast('Task added successfully!', 'success');
}

function toggleEnhancedTask(id) {
  const t = ENHANCED_STATE.tasks.find(t => t.id === id);
  if (t) { t.done = !t.done; saveEnhanced(); renderEnhancedTasks(); }
}

function deleteEnhancedTask(id) {
  ENHANCED_STATE.tasks = ENHANCED_STATE.tasks.filter(t => t.id !== id);
  saveEnhanced(); renderEnhancedTasks(); toast('Task deleted.', 'info');
}

document.getElementById('addTaskBtn')?.addEventListener('click', addEnhancedTask);
document.getElementById('taskInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') addEnhancedTask(); });

document.getElementById('clearDoneTasks')?.addEventListener('click', () => {
  const before = ENHANCED_STATE.tasks.length;
  ENHANCED_STATE.tasks = ENHANCED_STATE.tasks.filter(t => !t.done);
  saveEnhanced(); renderEnhancedTasks();
  toast(`Cleared ${before - ENHANCED_STATE.tasks.length} completed tasks.`, 'success');
});

// Filter pills
document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    ENHANCED_STATE.taskFilter = pill.dataset.filter;
    renderEnhancedTasks();
  });
});

/* ════════════════════════════════════════════════
   RENDER: EXPENSES (enhanced)
════════════════════════════════════════════════ */
function renderEnhancedExpenses() {
  const list = document.getElementById('expenseList');
  if (!list) return;
  const last5 = ENHANCED_STATE.expenses.slice(0, 5);

  const totalIncome = ENHANCED_STATE.expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = ENHANCED_STATE.expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const balance = totalIncome - totalExpense;

  const incomeEl = document.getElementById('total-income'); if (incomeEl) incomeEl.textContent = fmtMoney(totalIncome);
  const expenseEl = document.getElementById('total-expense'); if (expenseEl) expenseEl.textContent = fmtMoney(totalExpense);
  const balanceEl = document.getElementById('balance');
  if (balanceEl) {
    balanceEl.textContent = fmtMoney(balance);
    balanceEl.style.color = balance >= 0 ? 'var(--green)' : 'var(--pink)';
  }
  const statExpEl = document.getElementById('statExpenses'); if (statExpEl) statExpEl.textContent = fmtMoney(totalExpense);
  const sbExpEl = document.getElementById('sb-expenses'); if (sbExpEl) sbExpEl.textContent = fmtMoney(totalExpense);

  if (!last5.length) {
    list.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i>No transactions yet.</div>';
  } else {
    list.innerHTML = last5.map(e => `
    <div class="memory-card transaction-card tx-${e.type}" id="exp-${e.id}">
      <div class="memory-card-header">
        <div class="memory-card-icon transaction-icon ${e.type}">
          <i class="fas ${e.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
        </div>
        <div class="memory-card-meta">
          <span class="memory-card-type transaction-type ${e.type}">${e.type}</span>
          <span class="memory-card-time">${timeAgoEnhanced(e.date)}</span>
        </div>
      </div>
      <div class="memory-card-content transaction-content">
        <h4>${escHtml(e.title)}</h4>
        <div class="transaction-details">
          <span class="transaction-category">${e.category}</span>
          <span class="transaction-amount ${e.type}">${e.type === 'income' ? '+' : '-'}${fmtMoney(e.amount)}</span>
        </div>
      </div>
      <button class="transaction-delete" onclick="deleteEnhancedExpense('${e.id}')" title="Delete transaction">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
  }

  // Spending breakdown by category
  try {
    const byCat = {};
    ENHANCED_STATE.expenses.filter(e => e.type === 'expense').forEach(e => {
      byCat[e.category] = (byCat[e.category] || 0) + e.amount;
    });
    const total = Object.values(byCat).reduce((s, v) => s + v, 0);
    const bd = document.getElementById('spendBreakdown');
    if (bd) {
      if (Object.keys(byCat).length === 0) {
        bd.innerHTML = '<div class="empty-state"><i class="fas fa-chart-pie"></i>No expense data.</div>';
      } else {
        bd.innerHTML = Object.entries(byCat).sort(([,a],[,b]) => b - a).map(([cat, amt]) => {
          const pct = total > 0 ? (amt / total * 100).toFixed(1) : 0;
          const c = CAT_COLORS[cat] || '#a0aec0';
          return `
          <div class="memory-card spending-breakdown-card">
            <div class="memory-card-header">
              <div class="memory-card-icon spending-category-icon" style="background: linear-gradient(135deg, ${c}aa, ${c});">
                <i class="fas fa-chart-pie"></i>
              </div>
              <div class="memory-card-meta">
                <span class="memory-card-type spending-category-type" style="background: ${c};">${cat}</span>
                <span class="memory-card-time spending-percentage">${pct}%</span>
              </div>
            </div>
            <div class="memory-card-content spending-content">
              <h4>Spending Analysis</h4>
              <div class="spending-details">
                <div class="spending-amount" style="color: ${c}; border-color: ${c}; background: ${c}15;">
                  ${fmtMoney(amt)}
                </div>
                <div class="spending-progress">
                  <div class="spending-progress-bar">
                    <div class="spending-progress-fill" style="width: ${pct}%; background: linear-gradient(90deg, ${c}aa, ${c}); box-shadow: 0 0 8px ${c}60;"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
        }).join('');
      }
    }
  } catch (error) {
    console.error('Error rendering spending breakdown:', error);
    const bd = document.getElementById('spendBreakdown');
    if (bd) {
      bd.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i>Error loading breakdown.</div>';
    }
  }

  updateEnhancedCharts();
}

function addEnhancedExpense() {
  const title = document.getElementById('expTitle')?.value.trim();
  const amount = parseFloat(document.getElementById('expAmount')?.value);
  const type = document.getElementById('expType')?.value || 'expense';
  if (!title || isNaN(amount) || amount <= 0) return toast('Please enter valid expense details.', 'error');
  const expense = {
    id: uidEnhanced(),
    title,
    amount,
    type: type,
    category: document.getElementById('expCat')?.value || 'general',
    date: document.getElementById('expDate')?.value || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  
  // Add to enhanced state
  ENHANCED_STATE.expenses.unshift(expense);
  saveEnhanced();
  
  // Update UI immediately
  renderEnhancedExpenses();
  updateEnhancedCharts();
  
  // Clear input fields after adding
  document.getElementById('expTitle').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expType').value = 'expense';
  document.getElementById('expCat').value = 'general';
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
  
  toast('Transaction added successfully!', 'success');
  
  // Also save to MongoDB if authenticated
  if (authToken && !authToken.startsWith('demo_token_')) {
    apiJson('/expenses', {
      method: 'POST',
      body: JSON.stringify(expense)
    }).catch(error => {
      console.error('Failed to save expense to backend:', error);
      toast('Expense saved locally, but failed to sync to cloud', 'warning');
    });
  }
  
  // Clear input fields after adding
  document.getElementById('expTitle').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expCategory').value = 'general';
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
  
  toast('Expense added successfully!', 'success');
}

function deleteEnhancedExpense(id) {
  // Remove from enhanced state
  ENHANCED_STATE.expenses = ENHANCED_STATE.expenses.filter(e => e.id !== id);
  saveEnhanced();
  renderEnhancedExpenses();
  
  // Also delete from MongoDB if authenticated
  if (authToken && !authToken.startsWith('demo_token_')) {
    apiJson(`/expenses/${id}`, {
      method: 'DELETE'
    }).catch(error => {
      console.error('Failed to delete expense from backend:', error);
      toast('Expense deleted locally, but failed to sync to cloud', 'warning');
    });
  }
  
  toast('Transaction removed.', 'info');
}

document.getElementById('addExpenseToggle')?.addEventListener('click', () => {
  const form = document.getElementById('expenseForm');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
document.getElementById('cancelExpenseBtn')?.addEventListener('click', () => {
  const form = document.getElementById('expenseForm');
  if (form) form.style.display = 'none';
});
document.getElementById('saveExpenseBtn')?.addEventListener('click', addEnhancedExpense);

/* ════════════════════════════════════════════════
   RENDER: MEMORY (enhanced)
════════════════════════════════════════════════ */
function pushEnhancedMemory(mem) {
  const entry = {
    id: uidEnhanced(),
    content: mem.content,
    type: mem.type || 'note',
    tags: mem.tags || [],
    date: mem.date || new Date().toISOString().split('T')[0],
    category: mem.category || '',
    mood: mem.mood || '',
    createdAt: new Date().toISOString(),
  };
  ENHANCED_STATE.memories.unshift(entry);
  saveEnhanced(); renderCalendarEnhanced();

  const sbEl = document.getElementById('sb-memories'); if (sbEl) sbEl.textContent = ENHANCED_STATE.memories.length;
  const tmEl = document.getElementById('totalMemories'); if (tmEl) tmEl.textContent = ENHANCED_STATE.memories.length;
  
  // Clear input fields after adding
  document.getElementById('memoryTitle').value = '';
  document.getElementById('memoryDescription').value = '';
  document.getElementById('memoryCategory').value = 'general';
  document.getElementById('memoryMood').value = 'neutral';
  document.getElementById('memoryDate').value = new Date().toISOString().split('T')[0];
  
  toast('Memory saved successfully!', 'success');
  fetch(`${CONFIG.API_URL}/memories`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(entry) }).catch(()=>{});
}

const MEM_ICONS = { note:'fa-sticky-note', voice:'fa-microphone', task:'fa-check-square', reminder:'fa-bell' };


/* ════════════════════════════════════════════════
   ORIGINAL MEMORY FORM + RECENT + SEARCH + CALENDAR (enhanced)
════════════════════════════════════════════════ */
const dateInput = document.getElementById('memoryDate');
if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

const memoryForm = document.getElementById('memoryForm');
if (memoryForm) {
  memoryForm.addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('memoryTitle')?.value.trim();
    const desc = document.getElementById('memoryDescription')?.value.trim();
    if (!title || !desc) return toast('Please fill all required fields.', 'error');

    pushEnhancedMemory({
      content: `[${document.getElementById('memoryCategory')?.value}] ${title}: ${desc}`,
      type: 'note',
      date: document.getElementById('memoryDate')?.value,
      category: document.getElementById('memoryCategory')?.value,
      mood: document.getElementById('memoryMood')?.value,
      tags: document.getElementById('memoryTags')?.value.split(',').map(s => s.trim()).filter(Boolean) || [],
    });
    e.target.reset();
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    toast('Memory saved!', 'success');
  });
}

function showMemoryModalEnhanced(id) {
  const m = ENHANCED_STATE.memories.find(x => x.id === id);
  if (!m) return;
  const modalBody = document.getElementById('modalBody');
  if (modalBody) {
    modalBody.innerHTML = `
    <h3 style="margin-bottom:.5rem;font-size:1rem;color:var(--cyan);">${m.type.toUpperCase()}</h3>
    <p style="line-height:1.7;margin-bottom:.8rem;">${escHtml(m.content)}</p>
    <div style="font-size:.75rem;color:var(--text-muted);">${new Date(m.createdAt).toLocaleString()}</div>
    ${m.tags?.length ? `<div class="mem-tags" style="margin-top:.6rem;">${m.tags.map(t=>`<span class="mem-tag">${t}</span>`).join('')}</div>` : ''}`;
  }
  const modal = document.getElementById('memoryModal');
  if (modal) modal.classList.add('open');
}

document.getElementById('modalClose')?.addEventListener('click', () => document.getElementById('memoryModal')?.classList.remove('open'));
document.getElementById('memoryModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });

// Search
['searchInput','categoryFilter','moodFilter'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', doEnhancedSearch);
});
function doEnhancedSearch() {
  const q = document.getElementById('searchInput')?.value.toLowerCase() || '';
  const cat = document.getElementById('categoryFilter')?.value || '';
  const results = ENHANCED_STATE.memories.filter(m => {
    const matchQ = !q || m.content.toLowerCase().includes(q);
    const matchC = !cat || m.content.toLowerCase().includes(cat);
    return matchQ && matchC;
  }).slice(0, 8);

  const container = document.getElementById('searchResults');
  if (!container) return;
  container.innerHTML = results.length
    ? results.map(m => `
    <div class="memory-card" onclick="showMemoryModalEnhanced('${m.id}')">
      <h4>${escHtml(m.content.substring(0, 55))}…</h4>
      <div class="meta">${m.type} · ${timeAgoEnhanced(m.createdAt)}</div>
    </div>`).join('')
    : (q || cat ? '<div class="empty-state"><i class="fas fa-search"></i>No results found.</div>' : '');
}

// Calendar
let calDateEnhanced = new Date();
function renderCalendarEnhanced() {
  const container = document.getElementById('miniCalendar');
  if (!container) return;
  const y = calDateEnhanced.getFullYear();
  const mo = calDateEnhanced.getMonth();
  const today = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const firstOfMonth = new Date(y, mo, 1);
  const startDay = new Date(firstOfMonth);
  startDay.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  let html = `
  <div class="cal-header">
    <button class="cal-nav" onclick="changeEnhancedMonth(-1)"><i class="fas fa-chevron-left"></i></button>
    <span style="font-weight:700;font-size:.95rem;">${monthNames[mo]} ${y} · 4-Week View</span>
    <button class="cal-nav" onclick="changeEnhancedMonth(1)"><i class="fas fa-chevron-right"></i></button>
  </div>
  <div class="cal-grid">
    ${weekdayNames.map(d => `<div class="cal-day-name">${d}</div>`).join('')}
    ${Array.from({ length: 42 }, (_, i) => {
      const date = new Date(startDay);
      date.setDate(startDay.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const isToday = dateKey === today.toISOString().split('T')[0];
      const outsideMonth = date.getMonth() !== mo;
      const dayMemories = (ENHANCED_STATE.memories || []).filter(mem => {
        const memDate = (mem.date || mem.createdAt || '').split('T')[0];
        return memDate === dateKey;
      });
      const summary = dayMemories.length ? `${dayMemories.length} ${dayMemories.length === 1 ? 'memory' : 'memories'}` : 'No memories';
      // Get tasks and reminders for this date
      const dayTasks = (ENHANCED_STATE.tasks || []).filter(task => {
        const taskDate = (task.createdAt || '').split('T')[0];
        return taskDate === dateKey;
      });
      const dayReminders = dayTasks.filter(task => task.reminder && task.reminder.trim() !== '');
      
      // Create indicators
      const hasMemories = dayMemories.length > 0;
      const hasTasks = dayTasks.length > 0;
      const hasReminders = dayReminders.length > 0;
      
      return `
        <div class="cal-day ${isToday ? 'today' : ''} ${outsideMonth ? 'outside-month' : ''} ${hasMemories ? 'has-memories' : ''} ${hasTasks ? 'has-tasks' : ''} ${hasReminders ? 'has-reminders' : ''}" onclick="openCalendarPopup(${date.getFullYear()}, ${date.getMonth()}, ${date.getDate()})">
          <div class="cal-day-top">
            <span class="cal-day-number">${date.getDate()}</span>
            <span class="cal-day-month">${weekdayNames[date.getDay()]}</span>
          </div>
          <div class="cal-day-meta">
            ${summary}
            <div class="cal-day-indicators">
              ${hasMemories ? '<span class="cal-indicator cal-indicator-memory" title="Memories">🧠</span>' : ''}
              ${hasTasks ? `<span class="cal-indicator cal-indicator-tasks" title="${dayTasks.length} task${dayTasks.length === 1 ? '' : 's'}">📋</span>` : ''}
              ${hasReminders ? '<span class="cal-indicator cal-indicator-reminder" title="Reminders">🔔</span>' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('')}
  </div>`;

  container.innerHTML = html;
  const headerTitle = container.querySelector('.cal-header span');
  if (headerTitle) headerTitle.textContent = `${monthNames[mo]} ${y}`;
}
function changeEnhancedMonth(dir) { calDateEnhanced.setMonth(calDateEnhanced.getMonth() + dir); renderCalendarEnhanced(); }

// Instagram-Style Calendar Popup Functions
function openCalendarPopup(year, month, day) {
  const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dateObj = new Date(year, month, day);
  
  // Get data for this date
  const dayMemories = (ENHANCED_STATE.memories || []).filter(mem => {
    const memDate = (mem.date || mem.createdAt || '').split('T')[0];
    return memDate === dateKey;
  });
  
  const dayTasks = (ENHANCED_STATE.tasks || []).filter(task => {
    const taskDate = (task.createdAt || '').split('T')[0];
    return taskDate === dateKey;
  });
  
  const dayReminders = dayTasks.filter(task => task.reminder && task.reminder.trim() !== '');
  
  // Update popup header
  const popupDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  document.getElementById('popupDateTitle').textContent = popupDate;
  document.getElementById('popupDateSubtitle').textContent = dayMemories.length + dayTasks.length + dayReminders.length > 0 ? 'Activities' : 'No Activities';
  
  // Render memories section
  renderPopupMemories(dayMemories);
  
  // Render tasks section
  renderPopupTasks(dayTasks);
  
  // Render reminders section
  renderPopupReminders(dayReminders);
  
  // Show popup with animation
  const popup = document.getElementById('calendarPopup');
  if (popup) {
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCalendarPopup() {
  const popup = document.getElementById('calendarPopup');
  if (popup) {
    popup.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function renderPopupMemories(memories) {
  const container = document.getElementById('memoriesContent');
  const count = document.getElementById('memoriesCount');
  
  count.textContent = memories.length;
  
  if (memories.length === 0) {
    container.innerHTML = `
      <div class="calendar-empty-state">
        <i class="fas fa-brain"></i>
        <p>No memories for this day</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = memories.map(memory => `
    <div class="calendar-memory-item" onclick="viewMemory('${memory.id}')">
      <div class="calendar-memory-icon">
        <i class="fas ${MEM_ICONS[memory.type] || 'fa-sticky-note'}"></i>
      </div>
      <div class="calendar-memory-content">
        <div class="calendar-memory-title">${escHtml(memory.title || memory.content || 'Untitled Memory')}</div>
        <div class="calendar-memory-meta">
          <span class="calendar-memory-category">${memory.category || 'general'}</span>
          ${memory.mood ? `<span class="calendar-memory-mood">${memory.mood}</span>` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderPopupTasks(tasks) {
  const container = document.getElementById('tasksContent');
  const count = document.getElementById('tasksCount');
  
  count.textContent = tasks.length;
  
  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="calendar-empty-state">
        <i class="fas fa-tasks"></i>
        <p>No tasks for this day</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = tasks.map(task => `
    <div class="calendar-task-item" onclick="toggleEnhancedTask('${task.id}')">
      <div class="calendar-task-checkbox ${task.done ? 'completed' : ''}">
        ${task.done ? '<i class="fas fa-check" style="font-size: 0.7rem;"></i>' : ''}
      </div>
      <div class="calendar-task-content">
        <div class="calendar-task-title">${escHtml(task.title)}</div>
        ${task.reminder ? `
          <div class="calendar-task-reminder">
            <i class="fas fa-bell"></i>
            ${escHtml(task.reminder)}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function renderPopupReminders(reminders) {
  const container = document.getElementById('remindersContent');
  const count = document.getElementById('remindersCount');
  
  count.textContent = reminders.length;
  
  if (reminders.length === 0) {
    container.innerHTML = `
      <div class="calendar-empty-state">
        <i class="fas fa-bell"></i>
        <p>No reminders for this day</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = reminders.map(task => `
    <div class="calendar-reminder-item">
      <div class="calendar-reminder-icon">
        <i class="fas fa-bell"></i>
      </div>
      <div class="calendar-reminder-content">
        <div class="calendar-reminder-text">${escHtml(task.reminder)}</div>
        <div class="calendar-reminder-time">
          <i class="fas fa-clock"></i>
          Task: ${escHtml(task.title)}
        </div>
      </div>
    </div>
  `).join('');
}

// Calendar Popup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Close popup on overlay click
  const calendarPopup = document.getElementById('calendarPopup');
  if (calendarPopup) {
    calendarPopup.addEventListener('click', (e) => {
      if (e.target === calendarPopup) {
        closeCalendarPopup();
      }
    });
  }
  
  // Close popup on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCalendarPopup();
    }
  });
  
  // Mobile swipe gestures
  let touchStartY = 0;
  let touchEndY = 0;
  
  calendarPopup?.addEventListener('touchstart', (e) => {
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });
  
  calendarPopup?.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].screenY;
    const swipeDistance = touchStartY - touchEndY;
    
    // Swipe down to close
    if (swipeDistance > 100) {
      closeCalendarPopup();
    }
  }, { passive: true });
});

// Mood chart
let moodChartEnhanced;
const moodDataEnhanced = { happy:4, excited:2, peaceful:3, neutral:5, sad:1, angry:1, love:2 };
document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    moodDataEnhanced[btn.dataset.mood] = (moodDataEnhanced[btn.dataset.mood] || 0) + 1;
    renderMoodChartEnhanced();
    toast(`Mood recorded: ${btn.textContent}`, 'success');
  });
});
function renderMoodChartEnhanced() {
  const ctx = document.getElementById('moodChart')?.getContext('2d');
  if (!ctx) return;
  if (moodChartEnhanced) moodChartEnhanced.destroy();
  const labels = Object.keys(moodDataEnhanced);
  const data = Object.values(moodDataEnhanced);
  moodChartEnhanced = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{ data, backgroundColor:'rgba(0,245,255,.15)', borderColor:'#00f5ff', borderWidth:2,
        pointBackgroundColor:'#00f5ff', pointBorderColor:'#00f5ff' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend:{ display:false } },
      scales: { r: { ticks:{ display:false }, grid:{ color:'rgba(255,255,255,.08)' }, pointLabels:{ color:'#64748b', font:{size:10} } } }
    }
  });
}

/* ════════════════════════════════════════════════
   CHARTS (enhanced)
════════════════════════════════════════════════ */
let expChartEnhanced, taskChartEnhanced;
function buildEnhancedCharts() {
  try {
    const expCtx = document.getElementById('expenseChart')?.getContext('2d');
    const taskCtx = document.getElementById('taskChart')?.getContext('2d');

    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
      console.error('Chart.js is not loaded');
      return;
    }

    // Transaction Chart (Income & Expenses)
    if (expCtx) {
      if (expChartEnhanced) expChartEnhanced.destroy();
      const incomeByCat = {};
      const expenseByCat = {};
      
      // Separate income and expenses by category
      ENHANCED_STATE.expenses.forEach(e => { 
        if (e.type === 'income') {
          incomeByCat[e.category] = (incomeByCat[e.category] || 0) + e.amount;
        } else {
          expenseByCat[e.category] = (expenseByCat[e.category] || 0) + e.amount;
        }
      });
      
      // Get all unique categories from both income and expenses
      const allCategories = [...new Set([...Object.keys(incomeByCat), ...Object.keys(expenseByCat)])];
      const labels = allCategories.length ? allCategories : ['No data'];
      
      const incomeData = labels.map(cat => incomeByCat[cat] || 0);
      const expenseData = labels.map(cat => expenseByCat[cat] || 0);
      
      const colors = labels.map(l => CAT_COLORS[l] || '#a0aec0');

      expChartEnhanced = new Chart(expCtx, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['No data'],
          datasets: [
            {
              label: 'Income (₹)',
              data: incomeData.length ? incomeData : [0],
              backgroundColor: colors.map(c => c + '55'),
              borderColor: colors,
              borderWidth: 2,
              borderRadius: 8,
            },
            {
              label: 'Expenses (₹)',
              data: expenseData.length ? expenseData : [0],
              backgroundColor: colors.map(c => '#ff459b55'),
              borderColor: colors.map(c => '#ff459b'),
              borderWidth: 2,
              borderRadius: 8,
            }
          ]
        },
        options: {
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { 
            legend:{ 
              display:true,
              position:'top',
              labels:{ 
                color:'#64748b',
                font:{ size:12 },
                padding:20
              }
            } 
          },
          scales: {
            x: { 
              grid:{ color:'rgba(255,255,255,.04)' }, 
              ticks:{ color:'#64748b', font:{size:10} } 
            },
            y: { 
              grid:{ color:'rgba(255,255,255,.06)' }, 
              ticks:{ color:'#64748b', font:{size:10}, callback: v => '₹'+v } 
            }
          }
        }
      });
    } else {
      console.warn('Expense chart canvas not found');
    }

    // Task Chart
    if (taskCtx) {
      if (taskChartEnhanced) taskChartEnhanced.destroy();
      const done = ENHANCED_STATE.tasks.filter(t => t.done).length;
      const pending = ENHANCED_STATE.tasks.filter(t => !t.done).length;
      taskChartEnhanced = new Chart(taskCtx, {
        type: 'doughnut',
        data: {
          labels: ['Completed', 'Pending'],
          datasets: [{
            data: [done || 0, pending || 1],
            backgroundColor: ['rgba(0,255,136,.7)', 'rgba(255,45,155,.5)'],
            borderColor: ['#00ff88', '#ff2d9b'],
            borderWidth: 2,
            hoverOffset: 8,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position:'bottom', labels:{ color:'#94a3b8', font:{size:11}, padding:16 } }
          },
          cutout: '68%',
        }
      });
    } else {
      console.warn('Task chart canvas not found');
    }
  } catch (error) {
    console.error('Error building charts:', error);
  }
}

function updateEnhancedCharts() {
  buildEnhancedCharts();
}

// Chart tab switch
document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const type = tab.dataset.chart;
    if (expChartEnhanced) {
      expChartEnhanced.config.type = type;
      expChartEnhanced.update();
    }
  });
  toast('Note saved to memory!', 'success');
});

/* ════════════════════════════════════════════════
   VOICE ASSISTANT (enhanced)
════════════════════════════════════════════════ */
let recognitionEnhanced = null;
let isListeningEnhanced = false;
let orbState = 'idle'; // idle | listening | processing | responding
let assistantAudioContext = null;
let assistantAnalyser = null;
let assistantDataArray = null;
let assistantStream = null;
let assistantAnimationFrame = null;
let assistantActive = false;
let assistantOrbMode = 'idle';

function setOrbState(state) {
  orbState = state;
  drawOrb();
  const statusEl = document.getElementById('voiceStatus');
  if (statusEl) statusEl.textContent = '';
}

function speakEnhanced(text) {
  if (!window.speechSynthesis) {
    setOrbState('idle');
    setAssistantOrbMode('idle');
    updateAssistantStatus('Ready for voice or text');
    return;
  }
  window.speechSynthesis.cancel();
  setOrbState('responding');
  setAssistantOrbMode('speaking');
  updateAssistantStatus('Speaking...');
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95; u.pitch = 1.1; u.volume = 1;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) || voices[0];
  if (preferred) u.voice = preferred;
  u.onend = () => {
    setOrbState('idle');
    setAssistantOrbMode('idle');
    updateAssistantStatus('Ready for voice or text');
  };
  window.speechSynthesis.speak(u);
}

function logVoiceEnhanced(cmd, res) {
  const entry = { id:uidEnhanced(), command:cmd, response:res, timestamp:new Date().toISOString() };
  ENHANCED_STATE.voiceLogs.unshift(entry);
  if (ENHANCED_STATE.voiceLogs.length > 20) ENHANCED_STATE.voiceLogs.pop();
  saveEnhanced();

  const log = document.getElementById('voiceLog');
  if (log) {
    const item = document.createElement('div');
    item.className = 'voice-log-item';
    item.innerHTML = `<div class="cmd"><i class="fas fa-microphone fa-sm"></i> ${escHtml(cmd)}</div><div class="res">${escHtml(res)}</div>`;
    log.insertBefore(item, log.firstChild);
  }

  appendAssistantMessage('assistant', res);
}

function processEnhancedCommand(transcript) {
  const lower = transcript.toLowerCase().trim();
  setOrbState('processing');
  setAssistantOrbMode('processing');
  let response = '';
  const assistantContext = buildAssistantBrainContext();

  // Try to call AI backend first
  fetch(`${CONFIG.API_URL}/voice/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: transcript, memory_context: assistantContext }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.action === 'add_task' && data.data) {
        addTaskFromVoiceEnhanced(data.data);
        response = data.response || `Task "${data.data}" added!`;
      } else if (data.action === 'add_expense' && data.data) {
        response = data.response || 'Expense noted.';
      } else {
        response = data.response || 'Done!';
      }
      logVoiceEnhanced(transcript, response);
      speakEnhanced(response);
    })
    .catch(() => {
      // Offline fallback
      response = processOfflineEnhanced(lower, transcript);
      logVoiceEnhanced(transcript, response);
      setTimeout(() => speakEnhanced(response), 200);
    });
}

function processOfflineEnhanced(lower, original) {
  // Add task
  if (/add task|create task|new task/.test(lower)) {
    const title = lower.replace(/add task|create task|new task/g, '').trim() || 'Voice Task';
    addTaskFromVoiceEnhanced(title);
    return `Task "${title}" added!`;
  }
  // Add expense
  if (/add expense|spent|cost/.test(lower)) {
    const match = lower.match(/(\d+(\.\d+)?)/);
    const catMatch = lower.match(/food|entertainment|transport|health|shopping|utilities/);
    if (match) {
      const exp = { id:uidEnhanced(), title: original, amount:parseFloat(match[1]), type:'expense',
        category: catMatch ? catMatch[0] : 'other', date: new Date().toISOString() };
      ENHANCED_STATE.expenses.unshift(exp); saveEnhanced(); renderEnhancedExpenses();
return `Expense of ₹${match[1]} added!`;
    }
    return 'Please say the amount. e.g. "add expense 50 food"';
  }
  // Navigate
  if (/go to tasks|open tasks/.test(lower)) { smoothTo('section-tasks'); return 'Opening tasks.'; }
  if (/go to expenses|open expenses/.test(lower)) { smoothTo('section-expenses'); return 'Opening expenses.'; }
  if (/go to charts|open analytics/.test(lower)) { smoothTo('section-charts'); return 'Opening analytics.'; }
  // Remember
  if (/remember|save note|note that/.test(lower)) {
    const content = lower.replace(/remember|save note|note that/g,'').trim();
    if (content) { pushEnhancedMemory({ content, type:'note', tags:['voice'] }); return `Got it! Saved: "${content}"`; }
    return 'What would you like me to remember?';
  }
  // Show tasks
  if (/show tasks|my tasks|list tasks/.test(lower)) {
    const pending = ENHANCED_STATE.tasks.filter(t => !t.done);
    return pending.length ? `You have ${pending.length} pending tasks. First: ${pending[0]?.title}` : 'No pending tasks. Great job!';
  }
  const memoryAnswer = answerFromAssistantBrain(lower, original);
  if (memoryAnswer) return memoryAnswer;
  // Greeting
  if (/hello|hi|hey/.test(lower)) return "Hello! I'm your Personal Assistant. How can I help?";
  // Help
  if (/help|what can you do/.test(lower)) return 'I can add tasks, track expenses, save notes, and navigate. Try "add task review code" or "add expense 50 food".';
  // Fallback
  return `I heard: "${original}". Try "add task", "add expense", or "remember".`;
}

function buildAssistantBrainContext() {
  const pendingTasks = ENHANCED_STATE.tasks.filter(t => !t.done);
  const completedTasks = ENHANCED_STATE.tasks.filter(t => t.done);
  const totalSpent = ENHANCED_STATE.expenses
    .filter(e => e.type === 'expense')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const topExpense = ENHANCED_STATE.expenses
    .filter(e => e.type === 'expense')
    .sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
  const recentMemories = ENHANCED_STATE.memories.slice(0, 12).map(m => ({
    content: m.content,
    type: m.type,
    tags: m.tags || [],
    date: m.date || m.createdAt,
    category: m.category || ''
  }));

  return {
    memory_count: ENHANCED_STATE.memories.length,
    recent_memories: recentMemories,
    pending_tasks: pendingTasks.map(t => ({ title: t.title, category: t.category, priority: t.priority })),
    completed_task_count: completedTasks.length,
    expense_count: ENHANCED_STATE.expenses.length,
    total_spent: totalSpent,
    top_expense: topExpense ? { title: topExpense.title, amount: topExpense.amount, category: topExpense.category } : null,
    recent_voice_logs: ENHANCED_STATE.voiceLogs.slice(0, 5).map(v => ({ command: v.command, response: v.response }))
  };
}

function answerFromAssistantBrain(lower, original) {
  const context = buildAssistantBrainContext();
  const words = lower.split(/[^a-z0-9]+/).filter(w => w.length > 2);
  const memories = ENHANCED_STATE.memories || [];
  const matches = memories
    .map(m => {
      const haystack = `${m.content} ${(m.tags || []).join(' ')} ${m.category || ''} ${m.type || ''}`.toLowerCase();
      const score = words.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { ...m, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  if (/summary|summarize|overview|what do you know|analyze|analysis|brain/.test(lower)) {
    const pending = context.pending_tasks.length;
    const latest = memories[0]?.content ? ` Latest memory: ${memories[0].content}` : '';
return `I found ${context.memory_count} memories, ${pending} pending tasks, and ${fmtMoney(context.total_spent)} in tracked spending.${latest}`;
  }

  if (/memory|remember|note|saved|about|find|search|when|what/.test(lower) && matches.length) {
    return `From your memory table: ${matches.map(m => `"${m.content}"`).join(' Also: ')}.`;
  }

  if (/expense|spend|spent|money|cost|budget/.test(lower)) {
    const top = context.top_expense ? ` Your largest saved expense is ${context.top_expense.title} at ${fmtMoney(context.top_expense.amount)}.` : '';
    return `You have ${context.expense_count} saved transactions and ${fmtMoney(context.total_spent)} total spending.${top}`;
  }

  if (/task|todo|work|priority/.test(lower)) {
    const pending = context.pending_tasks;
    return pending.length
      ? `You have ${pending.length} pending tasks. The top ones are: ${pending.slice(0, 3).map(t => `${t.title} (${t.priority})`).join(', ')}.`
      : 'Your task list has no pending tasks right now.';
  }

  if (/memory|remember|note|saved|about|find|search|when|what/.test(lower)) {
    return memories.length
      ? `I checked your memory table but did not find a close match for "${original}". You have ${memories.length} saved memories to search.`
      : 'Your memory table is empty right now. Add a memory and I can use it in replies.';
  }

  return '';
}

function addTaskFromVoiceEnhanced(title) {
  ENHANCED_STATE.tasks.unshift({ id:uidEnhanced(), title, category:'work', priority:'medium', done:false, createdAt:new Date().toISOString() });
  saveEnhanced(); renderEnhancedTasks();
  pushEnhancedMemory({ content:`Voice task added: "${title}"`, type:'voice', tags:['voice','task'] });
}

function startListeningEnhanced() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    toast('Speech recognition not supported. Use Chrome.', 'error'); return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognitionEnhanced = new SR();
  recognitionEnhanced.lang = 'en-US'; recognitionEnhanced.continuous = false; recognitionEnhanced.interimResults = false;
  recognitionEnhanced.onstart = () => { isListeningEnhanced = true; setOrbState('listening'); };
  recognitionEnhanced.onresult = e => { processEnhancedCommand(e.results[0][0].transcript); };
  recognitionEnhanced.onerror = () => { isListeningEnhanced = false; setOrbState('idle'); };
  recognitionEnhanced.onend = () => { isListeningEnhanced = false; if (orbState === 'listening') setOrbState('idle'); };
  recognitionEnhanced.start();
}

function stopListeningEnhanced() {
  recognitionEnhanced?.stop(); isListeningEnhanced = false; setOrbState('idle');
}

document.getElementById('voiceToggle')?.addEventListener('click', () => {
  if (isListeningEnhanced) { stopListeningEnhanced(); const toggle = document.getElementById('voiceToggle'); if (toggle) toggle.innerHTML = '<i class="fas fa-microphone"></i> Start'; }
  else { startListeningEnhanced(); const toggle = document.getElementById('voiceToggle'); if (toggle) toggle.innerHTML = '<i class="fas fa-stop"></i> Stop'; }
});


// Text input command
document.getElementById('sendVoiceText')?.addEventListener('click', () => {
  const val = document.getElementById('voiceTextInput')?.value.trim();
  if (val) { processEnhancedCommand(val); const input = document.getElementById('voiceTextInput'); if (input) input.value = ''; }
});
document.getElementById('voiceTextInput')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) { processEnhancedCommand(val); e.target.value = ''; }
  }
});

// Orb click
document.getElementById('orbCanvas')?.addEventListener('click', event => {
  event.stopPropagation();
  if (isListeningEnhanced) stopListeningEnhanced(); else startListeningEnhanced();
});
document.getElementById('orb-wrap')?.addEventListener('click', () => {
  showAssistantOverlay();
  if (!isListeningEnhanced) startListeningEnhanced();
});

// Wake word listener
(function setupWakeWordEnhanced() {
  return;
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let wakeRec;
  function listen() {
    wakeRec = new SR();
    wakeRec.continuous = true; wakeRec.interimResults = false; wakeRec.lang = 'en-US';
    wakeRec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.toLowerCase();
        if (t.includes('hey assistant') || t.includes('hey personal')) {
          if (!isListeningEnhanced) startListeningEnhanced();
        }
      }
    };
    wakeRec.onend = () => setTimeout(listen, 1000);
    try { wakeRec.start(); } catch {}
  }
  listen();
})();

/* ════════════════════════════════════════════════
   ORB CANVAS (CSS + Canvas 2D Waveform)
════════════════════════════════════════════════ */
(function initOrb() {
  const canvas = document.getElementById('orbCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, R = W / 2;
  let frame = 0;
  let wavePoints = Array.from({ length: 32 }, () => 0);

  window.drawOrb = function() {
    ctx.clearRect(0, 0, W, H);
    frame++;

    // State-based config
    const stateColors = {
      idle:       { core: '#00f5ff', outer: '#002d33', glow: 0.35 },
      listening:  { core: '#00ff88', outer: '#003322', glow: 0.65 },
      processing: { core: '#7b2fff', outer: '#1a0066', glow: 0.55 },
      responding: { core: '#ff2d9b', outer: '#330022', glow: 0.60 },
    };
    const cfg = stateColors[orbState] || stateColors.idle;

    // Glow
    const glowPulse = 0.7 + 0.3 * Math.sin(frame * 0.06);
    const grd = ctx.createRadialGradient(R, R, 0, R, R, R);
    grd.addColorStop(0, cfg.core + 'ff');
    grd.addColorStop(0.45, cfg.core + '99');
    grd.addColorStop(0.75, cfg.core + '33');
    grd.addColorStop(1, cfg.core + '00');
    ctx.save();
    ctx.globalAlpha = cfg.glow * glowPulse;
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Main orb body
    const bodyGrd = ctx.createRadialGradient(R - 8, R - 8, 2, R, R, R - 4);
    bodyGrd.addColorStop(0, cfg.core + 'ee');
    bodyGrd.addColorStop(0.5, cfg.core + '88');
    bodyGrd.addColorStop(1, cfg.outer + 'cc');
    ctx.beginPath();
    ctx.arc(R, R, R - 4, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrd;
    ctx.fill();

    // Inner ring
    ctx.beginPath();
    ctx.arc(R, R, R - 4, 0, Math.PI * 2);
    ctx.strokeStyle = cfg.core + 'cc';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Waveform bars (for listening/responding)
    if (orbState === 'listening' || orbState === 'responding') {
      const bars = 20;
      wavePoints = wavePoints.map((v, i) => {
        const target = (Math.random() > 0.5 ? Math.random() * 0.8 : v * 0.6);
        return v + (target - v) * 0.25;
      });
      ctx.save();
      ctx.globalAlpha = 0.85;
      for (let i = 0; i < bars; i++) {
        const angle = (i / bars) * Math.PI * 2 - Math.PI / 2;
        const amp = (wavePoints[i] || 0) * 10 + 3;
        const x1 = R + Math.cos(angle) * (R - 14);
        const y1 = R + Math.sin(angle) * (R - 14);
        const x2 = R + Math.cos(angle) * (R - 14 + amp);
        const y2 = R + Math.sin(angle) * (R - 14 + amp);
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = cfg.core;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.restore();
    }

    // Rotating particles (processing)
    if (orbState === 'processing') {
      for (let i = 0; i < 6; i++) {
        const angle = (frame * 0.06) + (i / 6) * Math.PI * 2;
        const px = R + Math.cos(angle) * (R - 10);
        const py = R + Math.sin(angle) * (R - 10);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = cfg.core;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(frame * 0.1 + i);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Idle pulse dot
    if (orbState === 'idle') {
      const pulse = 0.6 + 0.4 * Math.sin(frame * 0.05);
      ctx.beginPath();
      ctx.arc(R, R, 5 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.6 * pulse;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  function loop() { window.drawOrb(); requestAnimationFrame(loop); }
  loop();
})();

/* ════════════════════════════════════════════════
   SEED DEMO DATA (first run)
════════════════════════════════════════════════ */
function seedEnhancedData() {
  if (localStorage.getItem('pma_seeded')) return;
  ENHANCED_STATE.tasks = [
    { id:uidEnhanced(), title:'Review project proposal', category:'work', priority:'high', done:false, createdAt:new Date().toISOString() },
    { id:uidEnhanced(), title:'Morning workout', category:'personal', priority:'medium', done:true, createdAt:new Date().toISOString() },
    { id:uidEnhanced(), title:'Read AI research paper', category:'study', priority:'medium', done:false, createdAt:new Date().toISOString() },
    { id:uidEnhanced(), title:'Pay monthly bills', category:'finance', priority:'high', done:false, createdAt:new Date().toISOString() },
    { id:uidEnhanced(), title:'Call family', category:'personal', priority:'low', done:false, createdAt:new Date().toISOString() },
  ];
  ENHANCED_STATE.expenses = [
    { id:uidEnhanced(), title:'Salary Credit', amount:5000, type:'income', category:'salary', date:new Date().toISOString() },
    { id:uidEnhanced(), title:'Netflix Subscription', amount:15.99, type:'expense', category:'entertainment', date:new Date(Date.now()-86400000).toISOString() },
    { id:uidEnhanced(), title:'Grocery Shopping', amount:120.50, type:'expense', category:'food', date:new Date(Date.now()-172800000).toISOString() },
    { id:uidEnhanced(), title:'Freelance Project', amount:850, type:'income', category:'salary', date:new Date(Date.now()-259200000).toISOString() },
    { id:uidEnhanced(), title:'Electric Bill', amount:95, type:'expense', category:'utilities', date:new Date(Date.now()-345600000).toISOString() },
  ];
  ENHANCED_STATE.memories = [
    { id:uidEnhanced(), content:'Back up project files before weekend', type:'note', tags:['work','backup'], createdAt:new Date().toISOString() },
    { id:uidEnhanced(), content:'Doctor appointment next Monday 10 AM', type:'reminder', tags:['health'], createdAt:new Date(Date.now()-3600000).toISOString() },
    { id:uidEnhanced(), content:'Voice command: Added task "Review project proposal"', type:'voice', tags:['voice','task'], createdAt:new Date(Date.now()-7200000).toISOString() },
  ];
  saveEnhanced();
  localStorage.setItem('pma_seeded', '1');
}
seedEnhancedData();

/* ════════════════════════════════════════════════
   HTML ESCAPE
════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════════════════════
   ENHANCED INIT
════════════════════════════════════════════════ */
function enhancedInit() {
  renderEnhancedTasks();
  renderEnhancedExpenses();
  renderCalendarEnhanced();
  
  // Delay chart building to ensure DOM is ready
  setTimeout(() => {
    buildEnhancedCharts();
    renderMoodChartEnhanced();
  }, 100);

  // Init stats
  const total = ENHANCED_STATE.memories.length;
  const weekAgo = Date.now() - 7 * 86400000;
  const tmEl = document.getElementById('totalMemories'); if (tmEl) tmEl.textContent = total;
  const rmEl = document.getElementById('recentMemories');
  if (rmEl) rmEl.textContent = ENHANCED_STATE.memories.filter(m => new Date(m.createdAt).getTime() > weekAgo).length;
  const sbEl = document.getElementById('sb-memories'); if (sbEl) sbEl.textContent = total;

  toast('Dashboard loaded! Say "Hey Assistant" to start.', 'info');
}

// Load voices async
window.speechSynthesis?.addEventListener('voiceschanged', () => {});
window.addEventListener('DOMContentLoaded', enhancedInit);
window.addEventListener('DOMContentLoaded', updateSidebarToggleIcon);
window.addEventListener('resize', updateSidebarToggleIcon);

/* =========================================================================
   MONGODB + TWO ASSISTANTS CONTROLLER
   Chat Assistant -> /api/chat -> phi3:mini
   Hey Assistant voice-only -> /api/voice-assistant -> phi3:mini
   ========================================================================= */
(function initMongoDashboardController() {
  const apiBase = API_BASE_URL;
  let expenseChartMongo = null;
  let wakeRecognition = null;
  let wakeActive = false;

  const asArray = value => Array.isArray(value) ? value : [];
  const normalizeId = item => ({ ...item, id: item.id || item._id });

  function setVoiceSphereState(state, label) {
    const sphere = document.getElementById('voiceSphere');
    const stateEl = document.getElementById('voiceSphereState');
    const overlay = document.getElementById('voiceSphereOverlay');
    if (sphere) {
      sphere.classList.remove('state-idle', 'state-listening', 'state-speaking');
      sphere.classList.add(`state-${state}`);
    }
    if (overlay) {
      document.body?.classList.toggle('voice-sphere-open', state !== 'idle' || isListening);
      overlay.classList.remove('active', 'listening', 'speaking');
      if (state !== 'idle' || isListening) {
        overlay.classList.add('active');
      }
      if (state === 'listening' || isListening) {
        overlay.classList.add('listening');
      }
      if (state === 'speaking') {
        overlay.classList.add('speaking');
      }
    }
    if (stateEl) stateEl.textContent = label;
  }

  function speakVoiceReply(text) {
    if (!('speechSynthesis' in window) || !text) return;
    setVoiceSphereState('speaking', 'Speaking');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onend = () => setVoiceSphereState('idle', 'Idle - say "Hey Assistant"');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async function apiJson(path, options = {}, retryCount = 0) {
    const maxRetries = 2;
    const cleanPath = path.startsWith('/api/') ? path.slice(4) : path;
    const url = `${apiBase}${cleanPath}`;
    
    try {
      console.log(`API Request: ${options.method || 'GET'} ${url}`);
      
      // Add authentication headers if token exists
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(url, {
        headers,
        ...options,
      });
      
      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      const data = await response.json().catch(() => {
        console.warn('Failed to parse JSON response');
        return {};
      });
      
      if (!response.ok) {
        const errorMessage = data.error || `Request failed: ${response.status} ${response.statusText}`;
        console.error(`API Error: ${errorMessage}`, data);
        throw new Error(errorMessage);
      }
      
      console.log('API Success:', data);
      return data;
      
    } catch (error) {
      console.error(`API Error (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Retry on network errors
      if (retryCount < maxRetries && error.name === 'TypeError' && error.message.includes('fetch')) {
        console.log(`Retrying API request... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return apiJson(path, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  function renderMongoTasks(tasks) {
    ENHANCED_STATE.tasks = asArray(tasks).map(task => ({
      id: task._id || task.id,
      title: task.title,
      category: task.category || 'work',
      priority: task.priority || 'medium',
      done: Boolean(task.done),
      createdAt: task.created_at || task.createdAt || new Date().toISOString(),
    }));
    renderEnhancedTasks();
  }

  function renderMongoExpenses(expenses) {
    ENHANCED_STATE.expenses = asArray(expenses).map(expense => ({
      id: expense._id || expense.id,
      title: expense.title || expense.description || 'Expense',
      amount: Number(expense.amount || 0),
      type: expense.type || 'expense',
      category: expense.category || 'other',
      date: expense.date || expense.created_at || new Date().toISOString(),
    }));
    renderEnhancedExpenses();
    renderMongoExpenseChart();
  }

  function renderMongoMemories(memories) {
    ENHANCED_STATE.memories = asArray(memories).map(memory => ({
      id: memory._id || memory.id,
      content: memory.description || memory.content || memory.title || '',
      type: memory.type || 'note',
      tags: memory.tags || [],
      date: memory.date || memory.created_at || new Date().toISOString(),
      category: memory.category || 'general',
      mood: memory.mood || 'neutral',
      createdAt: memory.created_at || new Date().toISOString(),
    }));
    renderCalendarEnhanced();
  }

  function renderMongoExpenseChart() {
    const ctx = document.getElementById('expenseChart')?.getContext('2d');
    if (!ctx || typeof Chart === 'undefined') return;
    const byCategory = {};
    ENHANCED_STATE.expenses
      .filter(expense => expense.type === 'expense')
      .forEach(expense => {
        byCategory[expense.category] = (byCategory[expense.category] || 0) + Number(expense.amount || 0);
      });
    if (expenseChartMongo) expenseChartMongo.destroy();
    expenseChartMongo = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(byCategory),
        datasets: [{
          label: 'Expenses',
          data: Object.values(byCategory),
          backgroundColor: ['#22d3ee', '#818cf8', '#f472b6', '#34d399', '#fbbf24', '#fb7185'],
        }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  async function loadMongoDashboard() {
    try {
      const data = await apiJson('/dashboard');
      renderMongoMemories(data.recent_memories || []);
      renderMongoTasks(data.tasks || []);
      renderMongoExpenses(data.expenses || []);

      const stats = data.stats || {};
      const totalMemories = document.getElementById('totalMemories');
      const statExpenses = document.getElementById('statExpenses');
      const statTasksDone = document.getElementById('statTasksDone');
      const recentMemories = document.getElementById('recentMemories');
      if (totalMemories) totalMemories.textContent = stats.memory_count || 0;
      if (statExpenses) statExpenses.textContent = fmtMoney(stats.spent || 0);
      if (statTasksDone) statTasksDone.textContent = stats.done_tasks || 0;
      if (recentMemories) recentMemories.textContent = asArray(data.recent_memories).length;
    } catch (error) {
      console.warn('Mongo dashboard load failed', error);
      toast('MongoDB dashboard API is not reachable yet.', 'error');
    }
  }

  async function sendChatAssistant(message) {
    appendAssistantMessage('user', message);
    setAssistantOrbMode('processing');
    updateAssistantStatus('Thinking...');
    try {
      const data = await apiJson('/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      const reply = data.reply || data.response || 'No response returned.';
      appendAssistantMessage('assistant', reply);
      setAssistantOrbMode('idle');
      updateAssistantStatus(`Ready - ${data.model || 'local model'}`);
      return reply;
    } catch (error) {
      const reply = error.message || 'Chat assistant is not reachable.';
      appendAssistantMessage('assistant', reply);
      setAssistantOrbMode('idle');
      updateAssistantStatus('Chat unavailable');
      return reply;
    }
  }

  window.sendMessage = async function sendMessage() {
    const input = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    const message = input?.value.trim();
    if (!message || !chatBody) return;

    const addBubble = (role, text) => {
      const bubble = document.createElement('div');
      bubble.className = `chat-msg ${role}`;
      bubble.textContent = text;
      chatBody.appendChild(bubble);
      chatBody.scrollTop = chatBody.scrollHeight;
    };

    addBubble('user', message);
    input.value = '';

    // Add typing indicator
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-msg bot typing-indicator';
    typingBubble.innerHTML = 'Thinking...';
    chatBody.appendChild(typingBubble);
    chatBody.scrollTop = chatBody.scrollHeight;

    try {
      const data = await apiJson('/chat', {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
      chatBody.removeChild(typingBubble);
      addBubble('bot', data.reply || data.response || 'No response returned.');
    } catch (error) {
      chatBody.removeChild(typingBubble);
      addBubble('bot', error.message || 'Error getting reply.');
    }
  };

  function overrideChatInputs() {
    const hub = document.getElementById('hubTextInput');
    const hubSend = document.getElementById('hubSendBtn');
    const chatInput = document.getElementById('chatInput');
    const submitHub = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const value = hub?.value.trim();
      if (!value) return;
      hub.value = '';
      sendChatAssistant(value);
    };
    hubSend?.addEventListener('click', submitHub, true);
    hub?.addEventListener('keydown', event => {
      if (event.key === 'Enter') submitHub(event);
    }, true);
    
    chatInput?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        window.sendMessage();
      }
    });
  }

  function initWakeWordVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSphereState('idle', 'Speech recognition unavailable');
      return;
    }

    window.__stopWakeVoiceAssistant = () => {
      wakeActive = false;
      if (wakeRecognition) {
        wakeRecognition.onend = null;
        try {
          wakeRecognition.stop();
        } catch {
          // Recognition may already be stopped.
        }
        wakeRecognition = null;
      }
    };

    function startWakeLoop() {
      if (wakeActive || isListening) return;
      wakeRecognition = new SpeechRecognition();
      wakeRecognition.continuous = true;
      wakeRecognition.interimResults = false;
      wakeRecognition.lang = 'en-US';
      wakeRecognition.onstart = () => {
        wakeActive = true;
        // Don't show sphere during idle wake word detection
        setVoiceSphereState('idle', 'Listening for wake word...');
      };
      wakeRecognition.onresult = async event => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript.trim();
          if (!/hey assistant/i.test(transcript)) continue;
          setVoiceSphereState('listening', 'Listening');
          try {
            const data = await apiJson('/voice-assistant', {
              method: 'POST',
              body: JSON.stringify({ transcript, activated: true, wake_phrase: 'Hey Assistant' }),
            });
            const reply = data.reply || data.response || '';
            if (reply) {
              logVoiceEnhanced(transcript, reply);
              speakVoiceReply(reply);
            } else {
              setVoiceSphereState('idle', 'Idle - say "Hey Assistant"');
            }
          } catch (error) {
            logVoiceEnhanced(transcript, error.message);
            speakVoiceReply("I'm having trouble connecting to the server. Please check your internet connection and try again.");
          }
        }
      };
      wakeRecognition.onerror = () => setVoiceSphereState('idle', 'Listening for wake word...');
      wakeRecognition.onend = () => {
        wakeActive = false;
        setTimeout(() => {
          if (!isListening) startWakeLoop();
        }, 900);
      };
      try {
        wakeRecognition.start();
      } catch {
        wakeActive = false;
      }
    }

    startWakeLoop();
  }

  document.addEventListener('DOMContentLoaded', () => {
    overrideChatInputs();
    loadMongoDashboard();
    initWakeWordVoiceAssistant();
  });
})();

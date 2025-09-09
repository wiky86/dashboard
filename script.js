// 전역 변수
let tasks = [];
let refreshInterval = null;
let autoRefreshInterval = null;

// DOM 요소들
const elements = {
    totalTasks: document.getElementById('totalTasks'),
    completedTasks: document.getElementById('completedTasks'),
    pendingTasks: document.getElementById('pendingTasks'),
    overdueTasks: document.getElementById('overdueTasks'),
    activeTasksList: document.getElementById('activeTasksList'),
    completedTasksList: document.getElementById('completedTasksList'),
    refreshBtn: document.getElementById('refreshBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    settingsModal: document.getElementById('settingsModal'),
    closeModal: document.querySelector('.close'),
    saveSettings: document.getElementById('saveSettings'),
    cancelSettings: document.getElementById('cancelSettings'),
    categoryFilter: document.getElementById('categoryFilter'),
    deadlineFilter: document.getElementById('deadlineFilter'),
    toggleCompletedLog: document.getElementById('toggleCompletedLog'),
    completedLog: document.getElementById('completedLog'),
    sheetRange: document.getElementById('sheetRange'),
    refreshIntervalSelect: document.getElementById('refreshInterval')
};

// 설정 객체
const settings = {
    sheetId: '',
    sheetRange: 'A:D',
    apiKey: '',
    refreshInterval: 5
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initializeEventListeners();
    loadTasks();
    setupAutoRefresh();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    elements.refreshBtn.addEventListener('click', loadTasks);
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.closeModal.addEventListener('click', closeSettingsModal);
    elements.saveSettings.addEventListener('click', saveSettings);
    elements.cancelSettings.addEventListener('click', closeSettingsModal);
    elements.categoryFilter.addEventListener('change', filterTasks);
    elements.deadlineFilter.addEventListener('change', filterTasks);
    elements.toggleCompletedLog.addEventListener('click', toggleCompletedLog);
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(event) {
        if (event.target === elements.settingsModal) {
            closeSettingsModal();
        }
    });
}

// 설정 로드
function loadSettings() {
    const savedSettings = localStorage.getItem('todoDashboardSettings');
    if (savedSettings) {
        Object.assign(settings, JSON.parse(savedSettings));
        elements.sheetRange.value = settings.sheetRange;
        elements.refreshIntervalSelect.value = settings.refreshInterval;
    }
}

// 설정 저장
function saveSettings() {
    settings.sheetRange = elements.sheetRange.value.trim();
    settings.refreshInterval = parseInt(elements.refreshIntervalSelect.value);
    
    localStorage.setItem('todoDashboardSettings', JSON.stringify(settings));
    closeSettingsModal();
    
    // 자동 새로고침 설정
    setupAutoRefresh();
    
    showNotification('설정이 저장되었습니다.', 'success');
}

// 설정 모달 열기
function openSettingsModal() {
    elements.settingsModal.style.display = 'block';
}

// 설정 모달 닫기
function closeSettingsModal() {
    elements.settingsModal.style.display = 'none';
}

// 자동 새로고침 설정
function setupAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // 기본 5분마다 자동 새로고침
    autoRefreshInterval = setInterval(loadTasks, 5 * 60 * 1000);
    
    // 설정된 간격이 있으면 해당 간격으로 설정
    if (settings.refreshInterval > 0) {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
        refreshInterval = setInterval(loadTasks, settings.refreshInterval * 60 * 1000);
    }
}

// 완료된 작업 로그 토글
function toggleCompletedLog() {
    const isVisible = elements.completedLog.style.display !== 'none';
    elements.completedLog.style.display = isVisible ? 'none' : 'block';
    
    const icon = elements.toggleCompletedLog.querySelector('i');
    const text = elements.toggleCompletedLog.querySelector('span') || elements.toggleCompletedLog.childNodes[1];
    
    if (isVisible) {
        icon.className = 'fas fa-eye-slash';
        if (text) text.textContent = ' 로그 숨기기';
    } else {
        icon.className = 'fas fa-eye';
        if (text) text.textContent = ' 로그 보기';
    }
}

// API 키 테스트 함수 (자격 증명 매개변수 사용)
async function testApiKeyWithCredentials(sheetId, apiKey) {
    if (!sheetId || !apiKey) {
        return false;
    }
    
    try {
        const testUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
        const response = await fetch(testUrl);
        
        if (response.ok) {
            console.log('API 키 테스트 성공');
            return true;
        } else {
            const errorText = await response.text();
            console.error('API 키 테스트 실패:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('API 키 테스트 오류:', error);
        return false;
    }
}

// 구글 시트에서 데이터 로드
async function loadTasks() {
    // 환경 변수 또는 설정에서 자격 증명 가져오기
    const sheetId = '1upfeAj22FEoYAgtSckJLQJ-Tg6FWFxU1ea3IdjfhGzM';
    const apiKey = 'AIzaSyD-zp3ID1MdWeMMQoSMTzHsGcvXZVnNe4k';
    
    if (!sheetId || !apiKey) {
        showNotification('시트 설정을 확인해주세요.', 'error');
        return;
    }
    
    // API 키 테스트
    const apiTest = await testApiKeyWithCredentials(sheetId, apiKey);
    if (!apiTest) {
        showNotification('시트 접근 권한을 확인해주세요.', 'error');
        return;
    }
    
    try {
        elements.activeTasksList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>데이터를 불러오는 중...</p>
            </div>
        `;
        
        elements.completedTasksList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>완료된 작업을 불러오는 중...</p>
            </div>
        `;
        
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${settings.sheetRange}?key=${apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 응답 오류:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            tasks = parseTasksData(data.values);
            updateDashboard();
            showNotification('데이터를 성공적으로 불러왔습니다.', 'success');
        } else {
            throw new Error('시트에 데이터가 없습니다.');
        }
        
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        elements.activeTasksList.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>데이터를 불러올 수 없습니다.</p>
                <p style="font-size: 12px; color: #999;">${error.message}</p>
            </div>
        `;
        showNotification('데이터 로드에 실패했습니다.', 'error');
    }
}

// 시트 데이터를 작업 객체로 변환
function parseTasksData(values) {
    const headers = values[0];
    const rows = values.slice(1);
    
    return rows.map((row, index) => {
        const task = {
            id: index + 1,
            category: row[0] || '', // 구분 (A열)
            title: row[1] || '', // 작업명 (B열)
            dueDate: row[2] || '', // 마감일 (C열)
            status: row[3] || '진행 중', // 진행 상태 (D열)
            createdAt: new Date().toISOString()
        };
        
        // 상태 정규화 - 다양한 상태값 처리
        const statusText = task.status.toLowerCase();
        if (statusText.includes('완료') || statusText.includes('completed')) {
            task.status = 'completed';
        } else if (statusText.includes('시작') || statusText.includes('진행') || statusText.includes('pending')) {
            task.status = 'pending';
        } else {
            task.status = 'pending'; // 기본값
        }
        
        // 마감일 상태 계산
        task.deadlineStatus = calculateDeadlineStatus(task.dueDate);
        
        return task;
    });
}

// 마감일 상태 계산
function calculateDeadlineStatus(dueDateString) {
    if (!dueDateString) return 'safe';
    
    try {
        // 다양한 날짜 형식 처리
        let dueDate;
        
        // "2025. 09. 22" 형식 처리
        if (dueDateString.includes('.')) {
            const cleanedDate = dueDateString.replace(/\s+/g, '').replace(/\./g, '-');
            dueDate = new Date(cleanedDate);
        } else {
            dueDate = new Date(dueDateString);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'overdue';
        if (diffDays < 5) return 'urgent';
        if (diffDays < 10) return 'soon';
        if (diffDays < 20) return 'warning';
        if (diffDays < 30) return 'normal';
        return 'safe';
    } catch (error) {
        console.warn('날짜 파싱 오류:', dueDateString, error);
        return 'safe';
    }
}

// 대시보드 업데이트
function updateDashboard() {
    updateStats();
    updateCategoryFilter();
    renderActiveTasks();
    renderCompletedTasks();
}

// 통계 업데이트
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.status === 'completed').length;
    const pending = tasks.filter(task => task.status === 'pending').length;
    const overdue = tasks.filter(task => task.deadlineStatus === 'overdue' && task.status === 'pending').length;
    
    elements.totalTasks.textContent = total;
    elements.completedTasks.textContent = completed;
    elements.pendingTasks.textContent = pending;
    elements.overdueTasks.textContent = overdue;
}

// 카테고리 필터 업데이트
function updateCategoryFilter() {
    const categories = [...new Set(tasks.map(task => task.category).filter(cat => cat))];
    
    elements.categoryFilter.innerHTML = '<option value="all">전체 구분</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        elements.categoryFilter.appendChild(option);
    });
}

// 진행 중인 작업 렌더링
function renderActiveTasks() {
    const categoryFilter = elements.categoryFilter.value;
    const deadlineFilter = elements.deadlineFilter.value;
    
    let filteredTasks = tasks.filter(task => task.status === 'pending');
    
    if (categoryFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.category === categoryFilter);
    }
    
    if (deadlineFilter !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.deadlineStatus === deadlineFilter);
    }
    
    // 날짜가 적게 남은 것부터 정렬
    filteredTasks.sort((a, b) => {
        // 지연된 작업을 가장 위에
        if (a.deadlineStatus === 'overdue' && b.deadlineStatus !== 'overdue') return -1;
        if (b.deadlineStatus === 'overdue' && a.deadlineStatus !== 'overdue') return 1;
        
        // 둘 다 지연된 작업이면 더 많이 지연된 것을 위에
        if (a.deadlineStatus === 'overdue' && b.deadlineStatus === 'overdue') {
            const aDays = getDaysUntilDeadline(a.dueDate);
            const bDays = getDaysUntilDeadline(b.dueDate);
            return aDays - bDays; // 더 음수(더 지연)가 위로
        }
        
        // 긴급도 순서: urgent > soon > warning > normal > safe
        const priorityOrder = { 'urgent': 1, 'soon': 2, 'warning': 3, 'normal': 4, 'safe': 5 };
        const aPriority = priorityOrder[a.deadlineStatus] || 6;
        const bPriority = priorityOrder[b.deadlineStatus] || 6;
        
        if (aPriority !== bPriority) {
            return aPriority - bPriority;
        }
        
        // 같은 우선순위면 날짜가 가까운 것을 위에
        const aDays = getDaysUntilDeadline(a.dueDate);
        const bDays = getDaysUntilDeadline(b.dueDate);
        return aDays - bDays;
    });
    
    if (filteredTasks.length === 0) {
        elements.activeTasksList.innerHTML = `
            <div class="loading">
                <i class="fas fa-inbox"></i>
                <p>진행 중인 작업이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    elements.activeTasksList.innerHTML = filteredTasks.map(task => `
        <div class="task-item deadline-${task.deadlineStatus}">
            <div class="task-header">
                <div class="task-title">${task.title}</div>
                <div class="task-category">${task.category}</div>
            </div>
            <div class="task-meta">
                <span class="deadline-indicator deadline-${task.deadlineStatus}"></span>
                <span class="deadline-text">${getDeadlineText(task.dueDate, task.deadlineStatus)}</span>
                ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// 완료된 작업 렌더링
function renderCompletedTasks() {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    
    if (completedTasks.length === 0) {
        elements.completedTasksList.innerHTML = `
            <div class="loading">
                <i class="fas fa-check-circle"></i>
                <p>완료된 작업이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    // 최근 완료된 작업부터 정렬
    completedTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    elements.completedTasksList.innerHTML = completedTasks.map(task => `
        <div class="completed-task-item">
            <div class="completed-task-header">
                <div class="completed-task-title">${task.title}</div>
                <div class="completed-task-category">${task.category}</div>
            </div>
            <div class="completed-task-meta">
                <span class="completed-date">
                    <i class="fas fa-check"></i> 완료됨
                </span>
                ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
            </div>
        </div>
    `).join('');
}

// 필터 적용
function filterTasks() {
    renderActiveTasks();
}


// 유틸리티 함수들
function getDaysUntilDeadline(dueDateString) {
    if (!dueDateString) return 999; // 마감일이 없으면 가장 뒤로
    
    try {
        // 다양한 날짜 형식 처리
        let dueDate;
        
        // "2025. 09. 22" 형식 처리
        if (dueDateString.includes('.')) {
            const cleanedDate = dueDateString.replace(/\s+/g, '').replace(/\./g, '-');
            dueDate = new Date(cleanedDate);
        } else {
            dueDate = new Date(dueDateString);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.setHours(0, 0, 0, 0);
        
        const diffTime = dueDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    } catch (error) {
        console.warn('날짜 계산 오류:', dueDateString, error);
        return 999; // 오류 시 가장 뒤로
    }
}

function getDeadlineText(dueDate, status) {
    if (!dueDate) return '마감일 없음';
    
    try {
        // 다양한 날짜 형식 처리
        let dueDateObj;
        
        // "2025. 09. 22" 형식 처리
        if (dueDate.includes('.')) {
            const cleanedDate = dueDate.replace(/\s+/g, '').replace(/\./g, '-');
            dueDateObj = new Date(cleanedDate);
        } else {
            dueDateObj = new Date(dueDate);
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDateObj.setHours(0, 0, 0, 0);
        
        const diffTime = dueDateObj - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return `${Math.abs(diffDays)}일 지연`;
        if (diffDays === 0) return '오늘 마감';
        if (diffDays === 1) return '내일 마감';
        return `${diffDays}일 남음`;
    } catch (error) {
        console.warn('날짜 표시 오류:', dueDate, error);
        return '마감일 오류';
    }
}

function formatDate(dateString) {
    try {
        // 다양한 날짜 형식 처리
        let date;
        
        // "2025. 09. 22" 형식 처리
        if (dateString.includes('.')) {
            const cleanedDate = dateString.replace(/\s+/g, '').replace(/\./g, '-');
            date = new Date(cleanedDate);
        } else {
            date = new Date(dateString);
        }
        
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.warn('날짜 포맷 오류:', dateString, error);
        return dateString;
    }
}

function showNotification(message, type = 'info') {
    // 간단한 알림 시스템
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // 스타일 추가
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1001;
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// CSS 애니메이션 추가
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
document.head.appendChild(style);
// 전역 변수
let tasks = [];
let courses = [];
let todoItems = [];
let refreshInterval = null;
let autoRefreshInterval = null;

// DOM 요소들
const elements = {
    // 통계 관련 요소들 - 주석처리됨
    // totalTasks: document.getElementById('totalTasks'),
    // completedTasks: document.getElementById('completedTasks'),
    // pendingTasks: document.getElementById('pendingTasks'),
    // overdueTasks: document.getElementById('overdueTasks'),
    activeTasksList: document.getElementById('activeTasksList'),
    completedTasksList: document.getElementById('completedTasksList'),
    todoList: document.getElementById('todoList'),
    courseInfoContainer: document.getElementById('courseInfoContainer'),
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
    toggleTodoList: document.getElementById('toggleTodoList'),
    todoLog: document.getElementById('todoLog'),
    sheetRange: document.getElementById('sheetRange'),
    refreshIntervalSelect: document.getElementById('refreshInterval')
};

// 설정 객체
const settings = {
    sheetId: '',
    sheetRange: 'A:E',
    apiKey: '',
    refreshInterval: 5
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    initializeEventListeners();
    loadTasks();
    loadCourses();
    loadTodoItems();
    setupAutoRefresh();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    elements.refreshBtn.addEventListener('click', function() {
        loadTasks();
        loadCourses();
        loadTodoItems();
    });
    elements.settingsBtn.addEventListener('click', openSettingsModal);
    elements.closeModal.addEventListener('click', closeSettingsModal);
    elements.saveSettings.addEventListener('click', saveSettings);
    elements.cancelSettings.addEventListener('click', closeSettingsModal);
    elements.categoryFilter.addEventListener('change', filterTasks);
    elements.deadlineFilter.addEventListener('change', filterTasks);
    elements.toggleCompletedLog.addEventListener('click', toggleCompletedLog);
    elements.toggleTodoList.addEventListener('click', toggleTodoList);
    
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
    
    // 1분마다 일정 체크 (30분 미만 알림용)
    setInterval(checkAllUpcomingTasks, 60 * 1000);
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

// 투두리스트 토글
function toggleTodoList() {
    const isVisible = elements.todoLog.style.display !== 'none';
    elements.todoLog.style.display = isVisible ? 'none' : 'block';
    
    const icon = elements.toggleTodoList.querySelector('i');
    const text = elements.toggleTodoList.querySelector('span') || elements.toggleTodoList.childNodes[1];
    
    if (isVisible) {
        icon.className = 'fas fa-eye-slash';
        if (text) text.textContent = ' 할 일 숨기기';
    } else {
        icon.className = 'fas fa-eye';
        if (text) text.textContent = ' 할 일 보기';
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

// 구글 시트에서 투두리스트 로드
async function loadTodoItems() {
    const sheetId = '1upfeAj22FEoYAgtSckJLQJ-Tg6FWFxU1ea3IdjfhGzM';
    const apiKey = 'AIzaSyD-zp3ID1MdWeMMQoSMTzHsGcvXZVnNe4k';
    
    if (!sheetId || !apiKey) {
        showNotification('시트 설정을 확인해주세요.', 'error');
        return;
    }
    
    try {
        elements.todoList.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>할 일을 불러오는 중...</p>
            </div>
        `;
        
        // 투두리스트 시트 범위 (시트3 탭에서 데이터 가져오기) - 시간 컬럼 추가
        const todoSheetRange = '시트3!A:C';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${todoSheetRange}?key=${apiKey}`;
        
        console.log('Loading todo items from:', url);
        console.log('Sheet ID:', sheetId);
        console.log('API Key:', apiKey ? 'Present' : 'Missing');
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('투두리스트 API 응답 오류:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 0) {
            console.log('Raw todo data from Google Sheets:', data.values);
            
            // 헤더가 있는지 확인 (첫 번째 행이 헤더인 경우)
            const hasHeader = data.values[0] && 
                (data.values[0][0] === '날짜' || 
                 data.values[0][0] === 'Date' || 
                 data.values[0][0].toLowerCase().includes('날짜') ||
                 data.values[0][0].toLowerCase().includes('date') ||
                 data.values[0][1] === '투두리스트' ||
                 data.values[0][1] === 'Todo' ||
                 data.values[0][1].toLowerCase().includes('투두') ||
                 data.values[0][1].toLowerCase().includes('todo'));
            
            const dataRows = hasHeader ? data.values.slice(1) : data.values;
            
            console.log('Has header:', hasHeader);
            console.log('Data rows:', dataRows);
            
            // 빈 행 필터링
            const filteredDataRows = dataRows.filter(row => 
                row && row.length > 0 && (row[0] || row[1])
            );
            
            if (filteredDataRows.length === 0) {
                throw new Error('투두리스트 시트에 유효한 데이터가 없습니다.');
            }
            
            console.log('Filtered data rows:', filteredDataRows);
            
            todoItems = parseTodoData(filteredDataRows);
            console.log('Parsed todo items:', todoItems);
            renderTodoItems();
        } else {
            throw new Error('투두리스트 시트에 데이터가 없습니다.');
        }
        
    } catch (error) {
        console.error('투두리스트 로드 오류:', error);
        elements.todoList.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>할 일을 불러올 수 없습니다.</p>
                <p style="font-size: 12px; color: #999;">오류: ${error.message}</p>
                <p style="font-size: 11px; color: #666; margin-top: 0.5rem;">
                    확인사항:<br>
                    • 시트 탭 이름이 '시트3'인지 확인<br>
                    • A1 셀에 '날짜', B1 셀에 '투두리스트' 헤더가 있는지 확인<br>
                    • A열에 날짜, B열에 할 일 내용이 입력되어 있는지 확인<br>
                    • 브라우저 개발자 도구 콘솔에서 자세한 오류 확인
                </p>
            </div>
        `;
    }
}

// 구글 시트에서 과정 정보 로드
async function loadCourses() {
    const sheetId = '1upfeAj22FEoYAgtSckJLQJ-Tg6FWFxU1ea3IdjfhGzM';
    const apiKey = 'AIzaSyD-zp3ID1MdWeMMQoSMTzHsGcvXZVnNe4k';
    
    if (!sheetId || !apiKey) {
        showNotification('시트 설정을 확인해주세요.', 'error');
        return;
    }
    
    try {
        elements.courseInfoContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i>
                <p>과정 정보를 불러오는 중...</p>
            </div>
        `;
        
        // 과정 정보 시트 범위 (시트2 탭에서 데이터 가져오기)
        const courseSheetRange = '시트2!A:E';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${courseSheetRange}?key=${apiKey}`;
        
        console.log('Loading courses from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('과정 정보 API 응답 오류:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 0) {
            console.log('Raw course data from Google Sheets:', data.values);
            
            // 헤더가 있는지 확인 (첫 번째 행이 헤더인 경우)
            const hasHeader = data.values[0] && 
                (data.values[0][0] === '과정명' || 
                 data.values[0][0] === 'Course Name' || 
                 data.values[0][0].toLowerCase().includes('과정') ||
                 data.values[0][0].toLowerCase().includes('course'));
            
            const dataRows = hasHeader ? data.values.slice(1) : data.values;
            
            if (dataRows.length === 0) {
                throw new Error('과정 정보 시트에 데이터가 없습니다.');
            }
            
            courses = parseCoursesData(dataRows);
            console.log('Parsed courses:', courses);
            renderCourseInfo();
        } else {
            throw new Error('과정 정보 시트에 데이터가 없습니다.');
        }
        
    } catch (error) {
        console.error('과정 정보 로드 오류:', error);
        elements.courseInfoContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>과정 정보를 불러올 수 없습니다.</p>
                <p style="font-size: 12px; color: #999;">오류: ${error.message}</p>
                <p style="font-size: 11px; color: #666; margin-top: 0.5rem;">
                    시트 탭 이름이 '시트2'인지 확인해주세요.<br>
                    A~E열에 데이터가 있는지 확인해주세요.
                </p>
            </div>
        `;
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
        
        // 시트 범위를 강제로 A:E로 설정
        const sheetRange = 'A:E';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetRange}?key=${apiKey}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API 응답 오류:', response.status, errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            console.log('Raw data from Google Sheets:', data.values);
            tasks = parseTasksData(data.values);
            console.log('Parsed tasks:', tasks);
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

// 시트 데이터를 투두리스트 객체로 변환
function parseTodoData(values) {
    console.log('Todo data rows:', values);
    
    return values.map((row, index) => {
        const todoItem = {
            id: index + 1,
            date: row[0] || '', // 날짜 (A열)
            content: row[1] || '', // 할 일 내용 (B열)
            time: row[2] || '', // 시간 (C열)
            createdAt: new Date().toISOString()
        };
        
        console.log(`Todo ${index + 1}:`, todoItem);
        
        // 날짜 파싱
        todoItem.dateObj = parseDate(todoItem.date);
        
        // 시간 파싱
        todoItem.timeObj = parseTime(todoItem.time);
        
        return todoItem;
    });
}

// 시트 데이터를 과정 객체로 변환
function parseCoursesData(values) {
    const headers = values[0];
    const rows = values.slice(1);
    
    console.log('Course Headers:', headers);
    console.log('Course Rows:', rows);
    
    return rows.map((row, index) => {
        const course = {
            id: index + 1,
            courseName: row[0] || '', // 과정명 (A열)
            subject: row[1] || '', // 교과목 (B열)
            startDate: row[2] || '', // 시작일 (C열)
            endDate: row[3] || '', // 종료일 (D열)
            classTime: row[4] || '' // 수업 시간 (E열)
        };
        
        console.log(`Course ${index + 1}:`, course);
        
        // 시작일과 종료일 파싱
        course.startDateObj = parseDate(course.startDate);
        course.endDateObj = parseDate(course.endDate);
        
        return course;
    });
}

// 시트 데이터를 작업 객체로 변환
function parseTasksData(values) {
    const headers = values[0];
    const rows = values.slice(1);
    
    console.log('Headers:', headers);
    console.log('Rows:', rows);
    
    return rows.map((row, index) => {
        const task = {
            id: index + 1,
            category: row[0] || '', // 구분 (A열)
            title: row[1] || '', // 작업명 (B열)
            dueDate: row[2] || '', // 마감일 (C열)
            status: row[3] || '진행 중', // 진행 상태 (D열)
            details: row[4] || '', // 세부 내용 (E열)
            createdAt: new Date().toISOString()
        };
        
        console.log(`Task ${index + 1}:`, task);
        
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

// 카테고리별 이미지 반환
function getCategoryImage(deadlineStatus) {
    const imageMap = {
        'safe': '001.png',      // 여유
        'normal': '002.png',    // 보통
        'warning': '002.png',   // 보통 (warning도 보통으로 처리)
        'soon': '003.png',      // 임박
        'urgent': '004.png',    // 긴급
        'overdue': '005.png'    // 지연
    };
    return imageMap[deadlineStatus] || '002.png'; // 기본값은 보통
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
    // updateStats(); // 통계 업데이트 - 주석처리됨
    updateCategoryFilter();
    renderActiveTasks();
    renderCompletedTasks();
    renderCourseInfo();
    renderTodoItems();
}

// 통계 업데이트 - 주석처리됨
/*
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
*/

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

// 과정 정보 렌더링
function renderCourseInfo() {
    if (!courses || courses.length === 0) {
        elements.courseInfoContainer.innerHTML = `
            <div class="loading">
                <i class="fas fa-graduation-cap"></i>
                <p>과정 정보가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 과정별로 그룹화
    const coursesByProgram = {};
    courses.forEach(course => {
        if (!coursesByProgram[course.courseName]) {
            coursesByProgram[course.courseName] = [];
        }
        coursesByProgram[course.courseName].push(course);
    });
    
    // 각 과정별로 현재 진행 중인 교과목과 다음 교과목 찾기
    const courseInfo = Object.keys(coursesByProgram).map(courseName => {
        const courseList = coursesByProgram[courseName];
        
        // 시작일 기준으로 정렬
        courseList.sort((a, b) => {
            if (!a.startDateObj || !b.startDateObj) return 0;
            return a.startDateObj - b.startDateObj;
        });
        
        // 현재 진행 중인 교과목들 (오늘 날짜가 시작일 이후이고 종료일 이전)
        const currentSubjects = courseList.filter(course => 
            course.startDateObj && course.endDateObj && 
            course.startDateObj <= today && course.endDateObj >= today
        );
        
        // 진행 예정인 교과목들 (시작일이 오늘 이후)
        const upcomingSubjects = courseList.filter(course => 
            course.startDateObj && course.startDateObj > today
        );
        
        // 다음에 진행될 교과목 (가장 가까운 미래 교과목)
        const nextSubject = upcomingSubjects.length > 0 ? upcomingSubjects[0] : null;
        
        // 과정 상태 결정 (진행 중과 예정을 모두 표시)
        let statusIndicators = [];
        
        if (currentSubjects.length > 0) {
            statusIndicators.push({
                type: 'active',
                text: '진행 중',
                color: 'active'
            });
        }
        
        if (nextSubject) {
            statusIndicators.push({
                type: 'upcoming',
                text: '예정',
                color: 'upcoming'
            });
        }
        
        // 상태가 없으면 완료로 표시
        if (statusIndicators.length === 0) {
            statusIndicators.push({
                type: 'completed',
                text: '완료',
                color: 'completed'
            });
        }
        
        return {
            courseName,
            currentSubjects,
            nextSubject,
            statusIndicators
        };
    });
    
    // HTML 생성 (컴팩트 버전)
    elements.courseInfoContainer.innerHTML = courseInfo.map(info => {
        return `
            <div class="course-program compact">
                <div class="course-header">
                    <div class="course-name-section">
                        <div class="course-name">${info.courseName}</div>
                        <div class="course-status-indicators">
                            ${info.statusIndicators.map(indicator => `
                                <div class="course-status-indicator ${indicator.color}">
                                    <span class="status-dot"></span>
                                    <span class="status-text">${indicator.text}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="course-status-badge ${info.statusIndicators[0].color}">
                        <i class="fas fa-${info.statusIndicators[0].type === 'active' ? 'play' : info.statusIndicators[0].type === 'upcoming' ? 'clock' : 'check'}"></i>
                    </div>
                </div>
                <div class="course-content">
                    <div class="current-subjects-compact">
                        ${info.currentSubjects.map(subject => `
                            <div class="subject-item-compact current">
                                <div class="subject-info">
                                    <div class="subject-main">
                                        <span class="subject-name">${subject.subject}</span>
                                        <span class="subject-dates">${formatDate(subject.startDate)} ~ ${formatDate(subject.endDate)}</span>
                                    </div>
                                    <span class="subject-time">${subject.classTime}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${info.nextSubject ? `
                        <div class="next-subjects-compact">
                            <div class="subject-item-compact next">
                                <div class="subject-info">
                                    <div class="subject-main">
                                        <span class="subject-name">${info.nextSubject.subject}</span>
                                        <span class="subject-dates">${formatDate(info.nextSubject.startDate)} ~ ${formatDate(info.nextSubject.endDate)}</span>
                                    </div>
                                    <span class="subject-time">${info.nextSubject.classTime}</span>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
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
        <div class="task-item deadline-${task.deadlineStatus}" data-task-id="${task.id}">
            <img src="${getCategoryImage(task.deadlineStatus)}" alt="${task.deadlineStatus}" class="task-character">
            <div class="task-content">
                <div class="task-header clickable" data-task-id="${task.id}">
                    <div class="task-title">${task.title}</div>
                    <div class="task-deadline-text deadline-${task.deadlineStatus}">${getDeadlineText(task.dueDate, task.deadlineStatus)}</div>
                    <div class="task-category">${task.category}</div>
                    <div class="expand-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="task-meta">
                    <span class="deadline-indicator deadline-${task.deadlineStatus}"></span>
                    ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
                </div>
                <div class="task-details" id="details-${task.id}" style="display: none;">
                    <div class="task-details-content">
                        <h4>세부 내용</h4>
                        <p>${task.details || '세부 내용이 없습니다.'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 이벤트 리스너 추가
    document.querySelectorAll('.task-header.clickable').forEach(header => {
        header.addEventListener('click', function() {
            const taskId = this.getAttribute('data-task-id');
            toggleTaskDetails(taskId);
        });
        
        // 호버 시 미리보기 기능
        header.addEventListener('mouseenter', function() {
            const taskId = this.getAttribute('data-task-id');
            showTaskPreview(taskId);
        });
        
        header.addEventListener('mouseleave', function() {
            hideTaskPreview();
        });
    });
}

// 투두리스트 렌더링
function renderTodoItems() {
    if (!todoItems || todoItems.length === 0) {
        elements.todoList.innerHTML = `
            <div class="loading">
                <i class="fas fa-list-check"></i>
                <p>할 일이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 오늘과 내일 할 일 필터링
    const todayTodos = todoItems.filter(todo => {
        if (!todo.dateObj) return false;
        const todoDate = new Date(todo.dateObj);
        todoDate.setHours(0, 0, 0, 0);
        return todoDate.getTime() === today.getTime();
    });
    
    const tomorrowTodos = todoItems.filter(todo => {
        if (!todo.dateObj) return false;
        const todoDate = new Date(todo.dateObj);
        todoDate.setHours(0, 0, 0, 0);
        return todoDate.getTime() === tomorrow.getTime();
    });
    
    // 30분 미만으로 남은 일정 체크
    checkUpcomingTasks(todayTodos);
    
    if (todayTodos.length === 0 && tomorrowTodos.length === 0) {
        elements.todoList.innerHTML = `
            <div class="loading">
                <i class="fas fa-calendar-check"></i>
                <p>오늘과 내일 할 일이 없습니다.</p>
            </div>
        `;
        return;
    }
    
    elements.todoList.innerHTML = `
        <div class="todo-sections">
            ${todayTodos.length > 0 ? `
                <div class="todo-section">
                    <div class="todo-section-header">
                        <i class="fas fa-calendar-day"></i>
                        <span>오늘 할 일 (${todayTodos.length}개)</span>
                    </div>
                    <div class="todo-items">
                        ${todayTodos.map(todo => `
                            <div class="todo-item today ${isTaskUrgent(todo) ? 'urgent' : ''}">
                                <div class="todo-content">
                                    <div class="todo-text">${todo.content}</div>
                                    ${todo.time ? `<div class="todo-time">${formatTime(todo.time)}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${tomorrowTodos.length > 0 ? `
                <div class="todo-section">
                    <div class="todo-section-header">
                        <i class="fas fa-calendar-plus"></i>
                        <span>내일 할 일 (${tomorrowTodos.length}개)</span>
                    </div>
                    <div class="todo-items">
                        ${tomorrowTodos.map(todo => `
                            <div class="todo-item tomorrow">
                                <div class="todo-content">
                                    <div class="todo-text">${todo.content}</div>
                                    ${todo.time ? `<div class="todo-time">${formatTime(todo.time)}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
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
        <div class="completed-task-item deadline-${task.deadlineStatus}" data-task-id="${task.id}">
            <img src="006.png" alt="완료된 작업" class="task-character">
            <div class="task-content">
                <div class="completed-task-header clickable" data-task-id="${task.id}">
                    <div class="completed-task-title">${task.title}</div>
                    <div class="completed-task-category">${task.category}</div>
                    <div class="expand-icon">
                        <i class="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div class="completed-task-meta">
                    <span class="completed-date">
                        <i class="fas fa-check"></i> 완료됨
                    </span>
                    ${task.dueDate ? `<span><i class="fas fa-calendar"></i> ${formatDate(task.dueDate)}</span>` : ''}
                </div>
                <div class="task-details" id="details-${task.id}" style="display: none;">
                    <div class="task-details-content">
                        <h4>세부 내용</h4>
                        <p>${task.details || '세부 내용이 없습니다.'}</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    // 완료된 작업에도 이벤트 리스너 추가
    document.querySelectorAll('.completed-task-header.clickable').forEach(header => {
        header.addEventListener('click', function() {
            const taskId = this.getAttribute('data-task-id');
            toggleTaskDetails(taskId);
        });
        
        // 호버 시 미리보기 기능
        header.addEventListener('mouseenter', function() {
            const taskId = this.getAttribute('data-task-id');
            showTaskPreview(taskId);
        });
        
        header.addEventListener('mouseleave', function() {
            hideTaskPreview();
        });
    });
}

// 필터 적용
function filterTasks() {
    renderActiveTasks();
}

// 세부 내용 토글 함수
function toggleTaskDetails(taskId) {
    const detailsElement = document.getElementById(`details-${taskId}`);
    const expandIcon = document.querySelector(`[data-task-id="${taskId}"] .expand-icon i`);
    
    if (expandIcon) {
        const isVisible = detailsElement && detailsElement.style.display !== 'none';
        
        if (isVisible) {
            // 숨기기
            if (detailsElement) {
                detailsElement.style.display = 'none';
            }
            expandIcon.className = 'fas fa-chevron-down';
        } else {
            // 보이기
            if (detailsElement) {
                detailsElement.style.display = 'block';
            }
            expandIcon.className = 'fas fa-chevron-up';
        }
    }
}

// 호버 시 미리보기 표시
function showTaskPreview(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (!task || !task.details) return;
    
    // 기존 미리보기 제거
    hideTaskPreview();
    
    // 미리보기 툴팁 생성
    const tooltip = document.createElement('div');
    tooltip.className = 'task-preview-tooltip';
    tooltip.id = 'preview-tooltip';
    
    // 세부 내용의 일부만 표시 (최대 100자)
    const previewText = task.details.length > 100 
        ? task.details.substring(0, 100) + '...' 
        : task.details;
    
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <div class="tooltip-header">
                <i class="fas fa-info-circle"></i>
                <span>세부 내용 미리보기</span>
            </div>
            <div class="tooltip-body">
                ${previewText}
            </div>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    // 마우스 위치에 툴팁 표시
    const updateTooltipPosition = (e) => {
        tooltip.style.left = (e.clientX + 10) + 'px';
        tooltip.style.top = (e.clientY - 10) + 'px';
    };
    
    document.addEventListener('mousemove', updateTooltipPosition);
    tooltip._updatePosition = updateTooltipPosition;
}

// 미리보기 숨기기
function hideTaskPreview() {
    const tooltip = document.getElementById('preview-tooltip');
    if (tooltip) {
        if (tooltip._updatePosition) {
            document.removeEventListener('mousemove', tooltip._updatePosition);
        }
        tooltip.remove();
    }
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
    if (!dueDate) return 'D-?';
    
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
        
        if (diffDays < 0) return `D+${Math.abs(diffDays)}`;
        if (diffDays === 0) return 'D-Day';
        if (diffDays === 1) return 'D-1';
        return `D-${diffDays}`;
    } catch (error) {
        console.warn('날짜 표시 오류:', dueDate, error);
        return 'D-?';
    }
}

function parseDate(dateString) {
    if (!dateString) return null;
    
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
        
        // 유효한 날짜인지 확인
        if (isNaN(date.getTime())) {
            console.warn('유효하지 않은 날짜:', dateString);
            return null;
        }
        
        return date;
    } catch (error) {
        console.warn('날짜 파싱 오류:', dateString, error);
        return null;
    }
}

function parseTime(timeString) {
    if (!timeString) return null;
    
    try {
        // 다양한 시간 형식 처리
        let time;
        
        // "14:30", "14:30:00", "2:30 PM" 등 형식 처리
        if (timeString.includes(':')) {
            const timeParts = timeString.split(':');
            if (timeParts.length >= 2) {
                const hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                
                if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                    time = new Date();
                    time.setHours(hours, minutes, 0, 0);
                    return time;
                }
            }
        }
        
        // "2:30 PM" 형식 처리
        const pmMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (pmMatch) {
            let hours = parseInt(pmMatch[1]);
            const minutes = parseInt(pmMatch[2]);
            const ampm = pmMatch[3].toUpperCase();
            
            if (ampm === 'PM' && hours !== 12) {
                hours += 12;
            } else if (ampm === 'AM' && hours === 12) {
                hours = 0;
            }
            
            time = new Date();
            time.setHours(hours, minutes, 0, 0);
            return time;
        }
        
        console.warn('유효하지 않은 시간 형식:', timeString);
        return null;
    } catch (error) {
        console.warn('시간 파싱 오류:', timeString, error);
        return null;
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

function formatTime(timeString) {
    try {
        const time = parseTime(timeString);
        if (!time) return timeString;
        
        return time.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    } catch (error) {
        console.warn('시간 포맷 오류:', timeString, error);
        return timeString;
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

// 30분 미만으로 남은 일정 체크 함수
function checkUpcomingTasks(todayTodos) {
    const now = new Date();
    const urgentTasks = todayTodos.filter(todo => isTaskUrgent(todo));
    
    if (urgentTasks.length > 0) {
        showVideoPopup();
    }
}

// 모든 일정을 체크하는 함수 (자동 체크용)
function checkAllUpcomingTasks() {
    if (!todoItems || todoItems.length === 0) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 오늘 할 일 필터링
    const todayTodos = todoItems.filter(todo => {
        if (!todo.dateObj) return false;
        const todoDate = new Date(todo.dateObj);
        todoDate.setHours(0, 0, 0, 0);
        return todoDate.getTime() === today.getTime();
    });
    
    checkUpcomingTasks(todayTodos);
}

// 일정이 긴급한지 확인하는 함수 (30분 미만)
function isTaskUrgent(todo) {
    if (!todo.timeObj) return false;
    
    const now = new Date();
    const taskTime = new Date(todo.dateObj);
    taskTime.setHours(todo.timeObj.getHours(), todo.timeObj.getMinutes(), 0, 0);
    
    const timeDiff = taskTime - now;
    const minutesDiff = timeDiff / (1000 * 60);
    
    // 30분 미만으로 남았고, 아직 지나지 않은 일정
    return minutesDiff <= 30 && minutesDiff >= 0;
}

// 영상 팝업 표시 함수
function showVideoPopup() {
    // 이미 팝업이 표시되어 있으면 중복 실행 방지
    if (document.getElementById('video-popup')) return;
    
    const popup = document.createElement('div');
    popup.id = 'video-popup';
    popup.className = 'video-popup-overlay';
    
    popup.innerHTML = `
        <div class="video-popup-content">
            <div class="video-popup-header">
                <h3>⏰ 곧 시작할 일정이 있습니다!</h3>
                <button class="video-popup-close" onclick="closeVideoPopup()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="video-popup-body">
                <video id="hiphop-camel-video" autoplay muted loop>
                    <source src="힙합낙타.mp4" type="video/mp4">
                    브라우저가 비디오를 지원하지 않습니다.
                </video>
                <p class="video-popup-message">30분 미만으로 남은 일정이 있습니다. 준비해주세요!</p>
                <div class="video-popup-timer">
                    <span id="popup-timer">5:00</span> 후 자동으로 닫힙니다
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    
    // 5분(300초) 타이머 시작
    startPopupTimer();
}

// 팝업 타이머 변수
let popupTimerInterval = null;

// 팝업 타이머 시작 함수
function startPopupTimer() {
    let timeLeft = 300; // 5분 = 300초
    
    const updateTimer = () => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const timerElement = document.getElementById('popup-timer');
        
        if (timerElement) {
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        if (timeLeft <= 0) {
            closeVideoPopup();
            return;
        }
        
        timeLeft--;
    };
    
    // 즉시 한 번 실행
    updateTimer();
    
    // 1초마다 업데이트
    popupTimerInterval = setInterval(updateTimer, 1000);
}

// 영상 팝업 닫기 함수
function closeVideoPopup() {
    const popup = document.getElementById('video-popup');
    if (popup) {
        const video = document.getElementById('hiphop-camel-video');
        if (video) {
            video.pause();
        }
        
        // 타이머 정리
        if (popupTimerInterval) {
            clearInterval(popupTimerInterval);
            popupTimerInterval = null;
        }
        
        popup.remove();
    }
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
    
    /* 영상 팝업 스타일 */
    .video-popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease-out;
    }
    
    .video-popup-content {
        background-color: hsl(var(--card));
        border-radius: calc(var(--radius) + 0.5rem);
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid hsl(var(--border));
        max-width: 600px;
        width: 90%;
        overflow: hidden;
        animation: popupSlideIn 0.3s ease-out;
    }
    
    .video-popup-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid hsl(var(--border));
        background-color: hsl(var(--muted) / 0.3);
    }
    
    .video-popup-header h3 {
        margin: 0;
        color: hsl(var(--foreground));
        font-size: 1.25rem;
        font-weight: 600;
    }
    
    .video-popup-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background-color: transparent;
        border: none;
        color: hsl(var(--muted-foreground));
        cursor: pointer;
        transition: all 0.2s ease-in-out;
    }
    
    .video-popup-close:hover {
        background-color: hsl(var(--muted));
        color: hsl(var(--foreground));
    }
    
    .video-popup-body {
        padding: 1.5rem;
        text-align: center;
    }
    
    .video-popup-body video {
        width: 100%;
        max-width: 400px;
        height: auto;
        border-radius: var(--radius);
        margin-bottom: 1rem;
    }
    
    .video-popup-message {
        margin: 0 0 1rem 0;
        color: hsl(var(--foreground));
        font-size: 1rem;
        font-weight: 500;
    }
    
    .video-popup-timer {
        background-color: hsl(var(--muted) / 0.3);
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        padding: 0.75rem 1rem;
        font-size: 0.9rem;
        color: hsl(var(--muted-foreground));
        text-align: center;
    }
    
    .video-popup-timer #popup-timer {
        font-weight: 600;
        color: hsl(var(--primary));
        font-size: 1.1rem;
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes popupSlideIn {
        from {
            opacity: 0;
            transform: scale(0.9) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: scale(1) translateY(0);
        }
    }
    
    /* 긴급한 할 일 스타일 */
    .todo-item.urgent {
        border-left: 4px solid hsl(0 84.2% 60.2%);
        background-color: hsl(0 84.2% 60.2% / 0.1);
        animation: urgentTodoPulse 2s ease-in-out infinite;
    }
    
    .todo-time {
        font-size: 0.8rem;
        color: hsl(var(--muted-foreground));
        margin-top: 0.25rem;
        font-weight: 500;
    }
    
    .todo-item.urgent .todo-time {
        color: hsl(0 84.2% 60.2%);
        font-weight: 600;
    }
    
    @keyframes urgentTodoPulse {
        0% {
            background-color: hsl(0 84.2% 60.2% / 0.1);
            box-shadow: 0 0 0 0 hsl(0 84.2% 60.2% / 0.4);
        }
        50% {
            background-color: hsl(0 84.2% 60.2% / 0.2);
            box-shadow: 0 0 0 5px hsl(0 84.2% 60.2% / 0.2);
        }
        100% {
            background-color: hsl(0 84.2% 60.2% / 0.1);
            box-shadow: 0 0 0 0 hsl(0 84.2% 60.2% / 0.4);
        }
    }
`;
document.head.appendChild(style);

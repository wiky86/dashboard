# 🖥️ 로컬 PC 배포 가이드

## 📋 필요 사항

### **하드웨어**
- 작은 PC (라즈베리파이, 미니PC, 구형 노트북 등)
- 모니터 (권장: 24인치 이상)
- 키보드/마우스 (초기 설정용)

### **소프트웨어**
- Windows 10/11 또는 Linux
- Python 3.7 이상
- 웹 브라우저 (Chrome, Edge, Firefox)

## 🚀 설치 및 실행

### **1단계: Python 설치**
```bash
# Windows
# https://python.org에서 Python 다운로드 및 설치

# Linux (Ubuntu/Debian)
sudo apt update
sudo apt install python3 python3-pip

# Linux (CentOS/RHEL)
sudo yum install python3 python3-pip
```

### **2단계: 파일 복사**
1. 모든 프로젝트 파일을 PC에 복사
2. 원하는 폴더에 저장 (예: `C:\Dashboard\`)

### **3단계: 실행 방법**

#### **일반 모드**
```bash
# 배치 파일 더블클릭 또는
start-dashboard.bat
```

#### **키오스크 모드 (추천)**
```bash
# 배치 파일 더블클릭 또는
start-kiosk.bat
```

## ⚙️ 키오스크 모드 특징

### **자동화 기능**
- ✅ **자동 시작**: PC 부팅 시 자동 실행
- ✅ **전체화면**: 모니터 전체 화면 사용
- ✅ **자동 새로고침**: 1분마다 데이터 업데이트
- ✅ **간소화 UI**: 설정 버튼 등 숨김

### **사용자 인터랙션**
- ✅ **필터링**: 구분별, 마감일별 필터 사용 가능
- ✅ **완료 로그**: 항상 표시되어 진행 상황 확인
- ❌ **설정 변경**: 키오스크 모드에서는 불가

## 🔧 자동 시작 설정

### **Windows 자동 시작**

1. **작업 스케줄러 사용**
   ```
   시작 → 작업 스케줄러 → 기본 작업 만들기
   트리거: 컴퓨터 시작 시
   동작: 프로그램 시작
   프로그램: C:\Dashboard\start-kiosk.bat
   ```

2. **시작 폴더 사용**
   ```
   Win + R → shell:startup
   start-kiosk.bat 바로가기 복사
   ```

### **Linux 자동 시작**

1. **systemd 서비스 생성**
   ```bash
   sudo nano /etc/systemd/system/dashboard.service
   ```
   
   ```ini
   [Unit]
   Description=Dashboard Service
   After=network.target
   
   [Service]
   Type=simple
   User=pi
   WorkingDirectory=/home/pi/Dashboard
   ExecStart=/usr/bin/python3 -m http.server 8000
   Restart=always
   
   [Install]
   WantedBy=multi-user.target
   ```

2. **서비스 활성화**
   ```bash
   sudo systemctl enable dashboard.service
   sudo systemctl start dashboard.service
   ```

## 🖥️ 모니터 설정

### **권장 설정**
- **해상도**: 1920x1080 이상
- **방향**: 가로 (Landscape)
- **밝기**: 중간 정도
- **자동 꺼짐**: 비활성화

### **브라우저 설정**
- **전체화면**: F11 또는 F4
- **확대/축소**: 100% (Ctrl + 0)
- **개발자 도구**: 비활성화 (F12)

## 🔄 유지보수

### **정기 점검**
- **주 1회**: 데이터 로드 상태 확인
- **월 1회**: 구글 시트 권한 확인
- **분기 1회**: API 키 갱신 검토

### **문제 해결**

#### **데이터가 로드되지 않는 경우**
1. 인터넷 연결 확인
2. 구글 시트 공유 설정 확인
3. API 키 상태 확인

#### **브라우저가 자동으로 열리지 않는 경우**
1. 기본 브라우저 설정 확인
2. 방화벽 설정 확인
3. 배치 파일 경로 확인

#### **PC가 느려진 경우**
1. 불필요한 프로그램 종료
2. 브라우저 캐시 정리
3. 시스템 재시작

### **백업**
- **주 1회**: 프로젝트 파일 백업
- **월 1회**: 구글 시트 데이터 백업

## 📱 원격 관리 (선택사항)

### **TeamViewer 설치**
- 원격으로 PC 상태 확인
- 문제 발생 시 즉시 해결

### **모바일 알림**
- 구글 시트 변경 시 알림 설정
- 작업 완료 시 자동 알림

## 💡 팁

### **성능 최적화**
- SSD 사용 권장
- 4GB RAM 이상 권장
- 불필요한 서비스 비활성화

### **전력 관리**
- 절전 모드 비활성화
- 화면 보호기 비활성화
- USB 절전 비활성화

### **보안**
- 자동 업데이트 활성화
- 방화벽 설정
- 정기적인 백업

## 🆘 긴급 상황

### **PC가 멈춘 경우**
1. 전원 버튼 5초간 누르기
2. 재시작 후 자동 실행 확인
3. 문제 지속 시 TeamViewer로 원격 접속

### **데이터가 보이지 않는 경우**
1. 브라우저 새로고침 (F5)
2. 서버 재시작
3. 구글 시트 상태 확인

이 가이드를 따라하면 안정적인 로컬 대시보드를 운영할 수 있습니다!

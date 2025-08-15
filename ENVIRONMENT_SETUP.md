# 🔧 환경변수 설정 가이드

## 📂 파일 구조

```
irys-canvas/
├── .env.local          # Backend/Contract 환경변수
├── .env.example        # Backend 템플릿
├── frontend/
│   ├── .env.local      # Frontend 환경변수 
│   └── env.example     # Frontend 템플릿
```

## ⚙️ 설정 단계

### 1. Backend/Contract 환경 설정

```bash
# 루트 디렉토리에서
cp .env.example .env.local
```

**필수 수정 항목:**
- `PRIVATE_KEY`: 실제 개인키 입력 (보안 주의!)
- `CONTRACT_ADDRESS`: 배포된 컨트랙트 주소
- `IMPLEMENTATION_ADDRESS`: 구현 컨트랙트 주소

### 2. Frontend 환경 설정

```bash
# frontend 디렉토리에서
cd frontend
cp env.example .env.local
```

**필수 수정 항목:**
- `VITE_WALLETCONNECT_PROJECT_ID`: [WalletConnect Cloud](https://cloud.walletconnect.com/)에서 발급
- `VITE_CONTRACT_ADDRESS`: Backend와 동일한 컨트랙트 주소
- `VITE_IMPLEMENTATION_ADDRESS`: Backend와 동일한 구현 주소

## 🔐 보안 가이드

### 절대 하지 말 것:
- ❌ 실제 private key를 git에 커밋
- ❌ `.env.local` 파일을 버전관리에 포함
- ❌ 프로덕션 키를 개발환경에서 사용

### 권장사항:
- ✅ 개발용 테스트넷 키만 사용
- ✅ 프로덕션용 키는 별도 관리
- ✅ 환경별 다른 설정 파일 유지

## 🌍 환경별 설정

### Development (개발)
```bash
VITE_IRYS_NETWORK=testnet
NODE_ENV=development
```

### Production (프로덕션)
```bash
VITE_IRYS_NETWORK=mainnet
NODE_ENV=production
```

## 🔧 변수 설명

### Core Network Settings
- `VITE_IRYS_NETWORK`: 사용할 네트워크 (testnet/mainnet)
- `VITE_CHAIN_ID`: 체인 ID (1270)
- `VITE_IRYS_TOKEN`: 사용할 토큰 유형

### Contract Settings  
- `PIXEL_PRICE`: 픽셀당 가격 (wei 단위)
- `CANVAS_WIDTH/HEIGHT`: 캔버스 크기
- `MAX_CANVAS_SIZE`: 최대 캔버스 크기

### URLs
- `VITE_IRYS_GATEWAY_URL`: Irys 게이트웨이 URL
- `VITE_IRYS_EXPLORER_URL`: 블록 탐색기 URL
- `VITE_IRYS_RPC`: RPC 엔드포인트

## 🚨 문제 해결

### 환경변수가 로드되지 않을 때:
1. 파일명 확인: `.env.local` (점으로 시작)
2. 변수명 확인: `VITE_` 접두사 필요 (Frontend)
3. 앱 재시작 필요

### WalletConnect 연결 실패:
1. `VITE_WALLETCONNECT_PROJECT_ID` 확인
2. [WalletConnect Cloud](https://cloud.walletconnect.com/)에서 새 프로젝트 생성

### 컨트랙트 연결 실패:
1. `VITE_CONTRACT_ADDRESS` 확인
2. 네트워크 설정 확인 (`VITE_CHAIN_ID`)
3. RPC URL 연결 상태 확인

## 📝 체크리스트

- [ ] Backend `.env.local` 파일 생성
- [ ] Frontend `.env.local` 파일 생성  
- [ ] Private key 설정 (개발용)
- [ ] WalletConnect Project ID 설정
- [ ] Contract 주소 설정
- [ ] 앱 재시작 후 테스트

---

⚠️ **중요**: 실제 자금이 있는 private key는 절대 코드에 포함하지 마세요!
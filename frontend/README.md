# IPRAYS Frontend

Irys 네트워크와 Programmable Data를 활용한 픽셀 캔버스 프론트엔드 애플리케이션입니다.

## 🚀 주요 기능

### Irys 네트워크 통합
- **실시간 연결**: Irys 테스트넷/메인넷과의 실시간 연결
- **Programmable Data**: 픽셀 데이터를 Irys에 업로드하고 Access List 생성
- **자동 fallback**: PD 방식 실패 시 일반 픽셀 배치로 자동 전환
- **잔액 관리**: Irys 계정 자금 조달 및 잔액 모니터링

### 픽셀 캔버스
- **실시간 편집**: 100x100 픽버스에서 실시간 픽셀 배치
- **낙관적 업데이트**: 즉시 UI 반영 후 블록체인 확인
- **에러 복구**: 자동 재시도 및 에러 처리
- **배치 처리**: 여러 픽셀 동시 배치 지원

### 블록체인 연동
- **스마트 컨트랙트**: PlaceCanvas.sol과의 완전한 연동
- **가스 최적화**: 자동 가스 추정 및 최적화
- **트랜잭션 모니터링**: 실시간 트랜잭션 상태 추적

## 🛠️ 기술 스택

- **프레임워크**: React 18 + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: React Context + Hooks
- **블록체인**: Ethers.js + Wagmi
- **Irys 통합**: @irys/sdk
- **UI 컴포넌트**: Radix UI + Tailwind CSS
- **에러 처리**: 커스텀 에러 핸들러 + 재시도 로직

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
```bash
cp env.example .env.local
```

`.env.local` 파일을 편집하여 다음 값들을 설정하세요:

```env
# Irys 네트워크 설정
VITE_IRYS_NETWORK=testnet
VITE_IRYS_TOKEN=ethereum
VITE_IRYS_RPC=https://testnet-rpc.irys.xyz/v1
VITE_IRYS_WS=wss://testnet-rpc.irys.xyz/v1/ws

# 컨트랙트 설정
VITE_CONTRACT_ADDRESS=your_contract_address_here
VITE_CHAIN_ID=1270

# 블록체인 설정
VITE_BLOCK_CONFIRMATIONS=3
VITE_MAX_GAS_LIMIT=500000
VITE_GAS_MULTIPLIER=1.2

# 재시도 설정
VITE_MAX_RETRIES=3
VITE_RETRY_DELAY=1000
```

### 3. 개발 서버 실행
```bash
npm run dev
```

애플리케이션이 `http://localhost:8080`에서 실행됩니다.

## 🔧 설정 옵션

### 네트워크 설정
- **testnet**: Irys 테스트넷 (기본값)
- **mainnet**: Irys 메인넷

### 토큰 설정
- **ethereum**: ETH 기반
- **polygon**: MATIC 기반
- **arbitrum**: ARB 기반

### 가스 설정
- **maxGasLimit**: 최대 가스 한도 (기본값: 500,000)
- **gasMultiplier**: 가스 승수 (기본값: 1.2)

## 📱 사용법

### 1. 지갑 연결
- MetaMask 또는 다른 Web3 지갑을 연결합니다
- 지원되는 네트워크: Irys 테스트넷 (Chain ID: 1270)

### 2. Irys 연결
- "Irys에 연결" 버튼을 클릭하여 Irys 네트워크에 연결
- 연결 성공 시 잔액이 표시됩니다

### 3. 픽셀 배치
- 캔버스에서 원하는 위치를 클릭하여 픽셀 배치
- Irys가 연결된 경우 Programmable Data 방식으로 처리
- 연결되지 않은 경우 일반 픽셀 배치 방식 사용

### 4. 캔버스 상태 업로드
- "캔버스 상태 업로드" 버튼으로 전체 캔버스를 Irys에 저장
- 업로드된 데이터는 영구적으로 저장됩니다

## 🔄 Programmable Data 플로우

### 1. 데이터 업로드
```
픽셀 데이터 → Irys 네트워크 → Transaction ID 반환
```

### 2. Access List 생성
```
Transaction ID + Offset + Length → Access List 생성
```

### 3. 스마트 컨트랙트 호출
```
Access List + 픽셀 좌표 → Programmable Data 읽기 → 픽셀 배치
```

### 4. Fallback 메커니즘
```
PD 방식 실패 → 레거시 PD 방식 → 일반 픽셀 배치
```

## 🚨 에러 처리

### 자동 재시도
- 네트워크 에러: 최대 3회 재시도
- Irys 연결 에러: 최대 3회 재시도
- 블록체인 에러: 사용자 취소가 아닌 경우 2회 재시도

### 에러 타입
- **IRYS_ERROR**: Irys 네트워크 관련 에러
- **IRYS_PD_ERROR**: Programmable Data 처리 에러
- **BLOCKCHAIN_ERROR**: 블록체인 트랜잭션 에러
- **PIXEL_PLACEMENT_ERROR**: 픽셀 배치 에러

## 📊 모니터링

### 실시간 상태
- Irys 연결 상태
- 잔액 (30초마다 자동 새로고침)
- 업로드 진행 상황
- 트랜잭션 상태

### 로그
- 콘솔에 상세한 디버그 정보 출력
- 에러 발생 시 상세한 컨텍스트 정보
- 성공/실패 통계

## 🔮 향후 계획

- [ ] 배치 픽셀 업로드 최적화
- [ ] 다중 체인 지원
- [ ] 오프라인 모드 지원
- [ ] 고급 에러 복구 메커니즘
- [ ] 성능 메트릭 대시보드

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🆘 문제 해결

### 일반적인 문제들

**Irys 연결 실패**
- 지갑이 올바른 네트워크에 연결되어 있는지 확인
- 환경 변수 설정 확인
- 네트워크 연결 상태 확인

**컨트랙트 호출 실패**
- 가스 한도 확인
- 컨트랙트 주소 설정 확인
- 블록체인 네트워크 상태 확인

**Programmable Data 에러**
- Irys 트랜잭션 ID 유효성 확인
- Access List 생성 권한 확인
- 데이터 크기 제한 확인

### 디버그 모드

개발자 도구 콘솔에서 상세한 로그를 확인할 수 있습니다:

```javascript
// Irys 연결 상태 확인
console.log('Irys 연결 상태:', window.irysStatus)

// 컨트랙트 인스턴스 확인
console.log('컨트랙트:', window.contractInstance)
```

## 📞 지원

문제가 발생하거나 질문이 있으시면 이슈를 생성해주세요.

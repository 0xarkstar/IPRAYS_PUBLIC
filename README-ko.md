# 🎨 IPRAYS - 분산형 픽셀 아트 플랫폼

**Irys 블록체인 기반의 r/place 스타일 픽셀 캔버스 dApp**

Irys Programmable Data를 활용한 분산형 픽셀 아트 플랫폼으로, 사용자들이 협력하여 1024x1024 픽셀 캔버스에 그림을 그릴 수 있습니다.

📖 **[English Documentation](./README.md)**

## 🎯 프로젝트 개요

IPRAYS는 **Irys Network**의 **Programmable Data** 기술을 활용한 차세대 분산형 캔버스 애플리케이션입니다. 각 픽셀 배치는 블록체인에 영구적으로 기록되며, 실시간으로 전 세계 사용자들과 협력하여 디지털 아트를 만들 수 있습니다.

## ✨ 주요 기능

- **🖼️ 실시간 픽셀 캔버스**: 1024x1024 픽셀 고해상도 캔버스
- **⚡ Irys Programmable Data**: 온체인 데이터 직접 읽기/쓰기  
- **🔄 업그레이드 가능 컨트랙트**: UUPS 프록시 패턴 적용
- **💡 Optimistic UI**: 즉시 반응하는 사용자 인터페이스
- **🛡️ Rate Limiting**: 주소별 픽셀 배치 제한
- **💰 자동 인출**: Treasury 자동 관리 시스템
- **📱 반응형 디자인**: 모바일 친화적 터치 인터페이스
- **🌐 다중 네트워크**: 테스트넷/메인넷 자동 전환

## 🏗️ 아키텍처

### 스마트 컨트랙트
```
contracts/
├── PlaceCanvas.sol        # 메인 업그레이드 가능 컨트랙트
├── PlaceCanvasProxy.sol   # UUPS 프록시
└── ProgrammableData.sol   # Irys PD 통합 라이브러리
```

**주요 기능:**
- **픽셀 배치**: `placePixel()`, `placePixelWithProgrammableData()`
- **Rate Limiting**: 주소별 배치 간격 제한
- **Treasury 관리**: 자동 인출 및 수동 관리
- **업그레이드**: UUPS 패턴으로 안전한 업그레이드

### 프론트엔드
```
frontend/src/
├── components/           # React 컴포넌트
│   ├── EnhancedPixelCanvas.tsx  # 메인 캔버스
│   └── ui/              # shadcn/ui 컴포넌트
├── lib/
│   ├── contract.ts      # 블록체인 상호작용
│   └── irysClient.ts    # Irys 클라이언트
├── hooks/
│   ├── useCanvasSync.ts # 실시간 동기화
│   └── useIrys.tsx      # Irys 통합
└── config/
    └── irys.ts         # 네트워크 설정
```

**기술 스택:**
- **React 18 + TypeScript**: 타입 안전한 모던 프론트엔드
- **Vite**: 빠른 개발 및 빌드 도구
- **Wagmi + Viem**: 이더리움 지갑 및 컨트랙트 상호작용
- **shadcn/ui + Tailwind CSS**: 아름답고 반응형인 UI 컴포넌트
- **Zustand**: Optimistic 업데이트를 위한 상태 관리

## 🚀 시작하기

### 전제 조건
- Node.js 18+
- npm 또는 yarn
- Metamask 등 Web3 지갑

### 설치

1. **저장소 클론**
```bash
git clone https://github.com/your-repo/iprays.git
cd iprays
```

2. **의존성 설치**
```bash
# 루트 디렉토리에서 (컨트랙트용)
npm install

# 프론트엔드
cd frontend
npm install
```

3. **환경 변수 설정**
```bash
# 루트 디렉토리에 .env 파일 생성
PRIVATE_KEY=your_private_key
IRYS_TESTNET_RPC=https://testnet-rpc.irys.xyz/v1/execution-rpc

# frontend/.env 파일 생성
VITE_CONTRACT_ADDRESS=0xE00d7cB8083BE1cf1b4C47A7BA3ab78cAE32fe21
VITE_IRYS_NETWORK=testnet
VITE_CHAIN_ID=1270
```

### 개발 서버 실행

1. **컨트랙트 컴파일**
```bash
npx hardhat compile
```

2. **프론트엔드 개발 서버**
```bash
cd frontend
npm run dev
```

3. **브라우저에서 열기**
```
http://localhost:5173
```

## 🔧 배포

### 컨트랙트 배포

1. **테스트넷 배포**
```bash
npx hardhat run scripts/deploy-upgradeable.cjs --network irysTestnet
```

### 프론트엔드 배포

1. **빌드**
```bash
cd frontend
npm run build
```

2. **정적 파일 배포**
`frontend/dist/` 디렉토리를 원하는 호스팅 서비스에 배포

## 📖 사용법

### 픽셀 배치

1. **지갑 연결**: Metamask 등으로 Irys 네트워크에 연결
2. **색상 선택**: 좌측 색상 팔레트에서 원하는 색상 선택
3. **픽셀 클릭**: 캔버스에서 배치할 위치 클릭
4. **트랜잭션 승인**: 지갑에서 트랜잭션 승인

### Programmable Data 사용

```typescript
// Irys에 픽셀 데이터 업로드
const pixelData = {
  x: 100,
  y: 200,
  color: "#FF0000",
  timestamp: Date.now()
};

const uploadResult = await uploadPixelData(pixelData);

// Access List 생성
const accessList = await createAccessList(uploadResult.id, 0, 1024);

// 컨트랙트 호출
await placePixelWithProgrammableData(100, 200, uploadResult.id);
```

### 캔버스 컨트롤
- **줌**: 마우스 휠 또는 +/- 버튼
- **팬**: 드래그로 캔버스 이동
- **그리드**: 격자 표시/숨김
- **미리보기**: 그리드 없는 깔끔한 뷰

## 🌐 네트워크 정보

### Irys 테스트넷
- **RPC**: `https://testnet-rpc.irys.xyz/v1/execution-rpc`
- **Chain ID**: `1270`
- **Explorer**: `https://testnet-explorer.irys.xyz`
- **Currency**: mIrys (mIRYS)

### 배포된 컨트랙트
- **프록시**: `0xE00d7cB8083BE1cf1b4C47A7BA3ab78cAE32fe21`
- **구현**: `0x8F2A8bad6CB14231F3676B00E38b1ab04e005859`

## 🔒 보안

### 스마트 컨트랙트
- **ReentrancyGuard**: 재진입 공격 방지
- **Pausable**: 긴급 정지 기능
- **Ownable**: 관리자 권한 제어
- **Rate Limiting**: 스팸 방지

### 프론트엔드
- **입력 검증**: 모든 사용자 입력 검증
- **에러 핸들링**: 우아한 실패 처리
- **보안 헤더**: XSS/CSRF 방지

## 📋 로드맵

- [x] **v1.0**: 기본 픽셀 캔버스 기능
- [x] **v1.1**: Irys Programmable Data 통합
- [x] **v1.2**: UUPS 업그레이드 가능 컨트랙트
- [x] **v1.3**: Rate Limiting 및 Treasury 관리
- [ ] **v2.0**: 멀티 캔버스 지원
- [ ] **v2.1**: NFT 미팅 및 갤러리
- [ ] **v2.2**: 커뮤니티 거버넌스

## 🤝 기여하기

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🔗 유용한 링크

- **🏠 홈페이지**: https://iprays.vercel.app
- **📚 Irys 네트워크**: https://irys.xyz
- **📖 Irys 문서**: https://docs.irys.xyz
- **🔍 테스트넷 익스플로러**: https://testnet-explorer.irys.xyz
- **💧 테스트넷 Faucet**: https://faucet.irys.xyz

## 🙏 감사의 말

- **[Irys](https://irys.xyz)** - Programmable Data 플랫폼 제공
- **[OpenZeppelin](https://openzeppelin.com)** - 보안 스마트 컨트랙트 라이브러리
- **[shadcn/ui](https://ui.shadcn.com)** - 아름다운 UI 컴포넌트
- **[Vite](https://vitejs.dev)** - 빠른 빌드 도구
- **[ethers.js](https://ethers.org)** - 이더리움 상호작용 라이브러리

## 📞 지원 및 문의

문제가 발생하거나 질문이 있으시면:
- 🐛 **GitHub Issues**: 버그 리포트 및 기능 요청
- 💬 **Discord**: 커뮤니티 참여 및 실시간 지원
- 📚 **문서**: 상세한 사용법 및 API 레퍼런스

---

**🎨 함께 그려나가는 분산형 캔버스에 오신 것을 환영합니다!**

> "모든 픽셀이 이야기를 담고, 모든 색상이 꿈을 그립니다."
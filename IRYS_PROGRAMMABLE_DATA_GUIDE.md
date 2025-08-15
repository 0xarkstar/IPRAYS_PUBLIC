# 📚 Irys Programmable Data 통합 가이드

## 🔍 Programmable Data란?

Irys Programmable Data(PD)는 **스마트 컨트랙트가 오프체인에 저장된 데이터를 신뢰성 있게 읽을 수 있도록** 하는 혁신적인 기술입니다.

### 핵심 개념
- **오프체인 저장 + 온체인 검증**: 대용량 데이터는 Irys에 저장하고, 스마트 컨트랙트에서 필요한 부분만 읽어서 처리
- **Access List 기반**: EIP-1559 트랜잭션의 Access List를 통해 읽을 데이터 범위를 미리 선언
- **가스 효율성**: 필요한 데이터만 선택적으로 읽어 가스 비용 최적화

## 🏗️ 아키텍처 개요

```
[프론트엔드]
1. 데이터를 Irys에 업로드 → transactionId 획득
2. Access List 생성: irysClient.programmable_data.read(transactionId, offset, length)
3. EIP-1559 트랜잭션에 Access List 포함하여 컨트랙트 호출

[스마트 컨트랙트]
4. ProgrammableData 라이브러리 상속
5. readBytes() 호출 → Access List에서 데이터 읽기
6. 읽은 데이터를 파싱하여 비즈니스 로직 실행
```

## 📋 실제 사양 vs 현재 구현

### ✅ 실제 Irys PD 사양
```solidity
// 올바른 방식
import "@irys/precompile-libraries/libraries/ProgrammableData.sol";

contract MyContract is ProgrammableData {
    function processData() public {
        // Access List에서 미리 정의된 데이터 읽기
        (bool success, bytes memory data) = readBytes();
        require(success, "reading failed");
        // 데이터 처리...
    }
}
```

```typescript
// 프론트엔드
const accessList = await irysClient.programmable_data
    .read(transactionId, startOffset, length)
    .toAccessList();

const tx = {
    accessList: [accessList],
    type: 2 // EIP-1559 필수
};
await wallet.sendTransaction(tx);
```

### ❌ 잘못된 구현 (기존)
```solidity
// 잘못된 방식
function readBytes(uint256 offset, uint256 length) // 파라미터로 범위 지정 ❌
function processData(string txId, uint256 offset, uint256 length) // 실행 시점에 지정 ❌
```

## 🔧 현재 프로젝트 구현 상태

### 컨트랙트 개선사항
- ✅ **실제 사양 적용**: `readBytes()` (파라미터 없음) 추가
- ✅ **레거시 호환**: 기존 방식도 유지하여 점진적 마이그레이션 지원
- ✅ **함수 분리**: 
  - `placePixelWithProgrammableData(x, y, irysTxId)` - 새로운 방식
  - `placePixelWithProgrammableDataLegacy(x, y, irysTxId, offset, length)` - 기존 방식

### 프론트엔드 개선사항
- ✅ **Access List 생성**: `createAccessList(transactionId, offset, length)` 추가
- ✅ **EIP-1559 트랜잭션**: Access List 포함 트랜잭션 지원
- ✅ **Fallback 메커니즘**: 새로운 방식 실패 시 레거시 방식으로 자동 전환
- ✅ **전역 상태 관리**: `IrysProvider`로 연결 상태 공유

## 🚀 사용법

### 1. 컨트랙트 배포
```bash
npx hardhat compile
npx hardhat run --network irysTestnet scripts/deploy-testnet.js
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npm run dev
```

### 3. PD 플로우 테스트
1. **Irys 연결**: 우측 패널에서 "Connect to Irys" 클릭
2. **픽셀 배치**: Enhanced Canvas에서 픽셀 클릭
3. **데이터 업로드**: 자동으로 Irys에 JSON 업로드
4. **Access List 생성**: `createAccessList()` 호출
5. **온체인 기록**: `placePixelWithProgrammableData()` 실행

## 🔍 디버깅 및 로그

### 콘솔 로그 확인
```javascript
// Access List 생성 로그
console.log('Generated Access List for PD:', { 
    transactionId, startOffset, length, accessList 
});

// PD 경로 선택 로그
console.log('Using Programmable Data path for:', { irysId, accessList });
```

### 실패 시 Fallback
```typescript
// 새로운 방식 실패 시 자동으로 레거시 방식 사용
try {
    // Access List 방식
    receipt = await placePixelWithPDWrite(x, y, irysId, accessList, value);
} catch (pdError) {
    // 레거시 방식으로 fallback
    receipt = await placePixelWithPDWriteLegacy(x, y, irysId, 0, length, value);
}
```

## 📊 모니터링

### 이벤트 추적
- `PixelDataRead`: PD 읽기 성공 시 발생
- `ProgrammableDataProcessed`: 데이터 처리 완료 시 발생

### 상태 확인
```solidity
// PD 처리 여부 확인
bool processed = contract.isProcessedIrysData(irysTxId);

// PD 상세 데이터 조회
bytes memory details = contract.getIrysPixelDetails(irysTxId);
```

## 🔮 실제 SDK 연동 준비

### 필요한 변경사항
1. **SDK 설치**: `npm install @irys/js` (실제 출시 후)
2. **실제 연결**: 모의 구현을 실제 SDK로 교체
3. **인증 처리**: 지갑 서명 및 업로드 권한 관리
4. **프리컴파일 확인**: 실제 네트워크의 프리컴파일 주소 확인

### 마이그레이션 경로
```typescript
// 현재 (모의)
const mockResponse = { id: 'mock_id', ... };

// 실제 SDK 연동 후
const irys = new Irys({ network: 'mainnet', token: 'ethereum', key });
const receipt = await irys.upload(data);
const accessList = await irys.programmable_data
    .read(receipt.id, 0, data.length)
    .toAccessList();
```

## ⚠️ 주의사항

### 가스 비용
- Access List에 포함된 **모든 청크에 대해 가스 비용 지불**
- 실제로 읽지 않는 데이터도 비용 발생
- 필요한 범위만 정확히 지정 필요

### 보안
- Access List는 **트랜잭션 생성 시점에 고정**
- 실행 중 임의로 다른 데이터 읽기 불가능
- 데이터 무결성은 Irys 네트워크에서 보장

### 제한사항
- 영구 저장소(ledgerId 0)에 업로드된 데이터만 PD로 읽기 가능
- 번들러를 통한 DataItems는 현재 미지원 (향후 지원 예정)

## 🎯 모범 사례

1. **효율적인 데이터 구조**: JSON 대신 압축된 바이너리 형태 고려
2. **청크 단위 최적화**: 필요한 부분만 정확히 요청
3. **에러 처리**: Access List 생성/PD 읽기 실패에 대한 Fallback 준비
4. **모니터링**: PD 사용량 및 비용 추적

---

**참고 링크**:
- [Irys Programmable Data 공식 예제](https://github.com/Irys-xyz/irys/blob/master/fixtures/contracts/src/IrysProgrammableDataBasic.sol)
- [E2E 테스트 코드](https://github.com/Irys-xyz/irys-js/blob/master/tests/programmableData.ts)

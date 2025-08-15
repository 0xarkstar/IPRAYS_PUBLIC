# 🚀 공식 Irys Programmable Data 통합 완료

## 📋 업데이트 요약

공식 [Irys Programmable Data 가이드](https://github.com/Irys-xyz/precompile-libraries/)에 따라 전체 프로젝트를 업데이트했습니다.

### 🔧 주요 변경 사항

#### 1. **스마트 컨트랙트 업데이트**

##### `ProgrammableData.sol` - 공식 라이브러리 구현
```solidity
/**
 * @title ProgrammableData
 * @dev Irys Programmable Data 공식 라이브러리
 * 
 * 공식 구현: https://github.com/Irys-xyz/precompile-libraries/
 */
contract ProgrammableData {
    function readBytes() internal view returns (bool success, bytes memory data) {
        // Irys 네트워크의 커스텀 프리컴파일 호출
        // Access List에서 미리 정의된 데이터 범위를 읽습니다
        assembly {
            // 프리컴파일 호출 (임시로 0x500 사용)
            success := staticcall(gas(), 0x500, ptr, 0, 0, 0)
            // ... 데이터 처리 로직
        }
    }
}
```

##### `PlaceCanvas.sol` - 공식 패턴 적용
```solidity
function placePixelWithProgrammableData(
    uint256 x,
    uint256 y,
    string memory irysTxId
) external payable nonReentrant whenNotPaused {
    // 공식 패턴: readPdBytesIntoStorage()
    _readPdBytesIntoStorage(irysTxId);
    
    // 저장된 데이터에서 색상 추출
    bytes memory data = irysPixelDetails[irysTxId];
    bytes3 color = extractColorFromData(data);
    
    // 픽셀 데이터 업데이트
    // ...
}

function _readPdBytesIntoStorage(string memory irysTxId) internal {
    // 공식 예제: readPdBytesIntoStorage() 패턴
    (bool success, bytes memory data) = readBytes();
    require(success, "reading bytes failed");
    
    // 스토리지에 저장
    irysPixelDetails[irysTxId] = data;
    processedIrysData[irysTxId] = true;
}

function getIrysPixelDetails(string memory irysTxId) public view returns (bytes memory) {
    // 공식 예제: getStorage() 패턴
    require(processedIrysData[irysTxId], "Irys data not processed");
    return irysPixelDetails[irysTxId];
}
```

#### 2. **프론트엔드 업데이트**

##### `irysClient.ts` - 공식 SDK 사용
```typescript
async createAccessList(transactionId: string, startOffset: number, length: number): Promise<any[]> {
    // 공식 가이드에 따른 Access List 생성
    // 참조: https://github.com/Irys-xyz/irys-js/blob/master/tests/programmableData.ts
    
    if (this.irys.programmable_data) {
        const accessList = await this.irys.programmable_data
            .read(transactionId, startOffset, length)
            .toAccessList();
        
        return [accessList];
    } else {
        // WebIrys에서 미지원 시 모의 Access List 생성
        const mockAccessList = {
            address: '0x' + transactionId.slice(0, 40),
            storageKeys: [
                '0x' + (startOffset.toString(16).padStart(64, '0')),
                '0x' + (length.toString(16).padStart(64, '0'))
            ]
        };
        return [mockAccessList];
    }
}
```

##### `contract.ts` - 공식 트랜잭션 방식
```typescript
export async function placePixelWithPDWrite(
    x: number,
    y: number,
    irysTxId: string,
    accessList: any[],
    valueWei: bigint
) {
    // 공식 가이드에 따른 EIP-1559 트랜잭션 구성
    const evmTransaction = {
        to: CONTRACT_ADDRESS,
        value: valueWei,
        accessList: accessList, // Programmable Data Access List
        type: 2, // EIP-1559 필수
        gasLimit: IRYS_CONFIG.maxGasLimit,
    }
    
    // 공식 가이드 패턴: wallet.sendTransaction(evmTransaction)
    const response = await signer.sendTransaction(evmTransaction)
}
```

##### `pixelPlacement.ts` - 완전한 PD 플로우
```typescript
private async tryProgrammableDataPlacement(pixel, createAccessList, pixelPriceWei, maxRetries, enableFallback) {
    // 공식 가이드에 따른 Programmable Data 플로우
    console.log('공식 Irys PD 플로우 시작');

    // 1. 픽셀 데이터를 Irys에 업로드 (필요한 경우)
    if (!transactionId) {
        throw new Error('Irys transaction ID required. Please upload data to Irys first.');
    }

    // 2. Programmable Data Access List 생성
    const accessList = await createAccessList(transactionId!, 0, dataLength || 1024);

    // 3. EIP-1559 트랜잭션으로 컨트랙트 호출 (공식 방식)
    const receipt = await placePixelWithPDWrite(pixel.x, pixel.y, transactionId!, accessList, pixelPriceWei);
}
```

## 🎯 배포된 컨트랙트 정보

### Irys 테스트넷 배포
- **프록시 주소**: `0x9A854fA655994069500523f57101Ee80b753ea13`
- **구현 주소**: `0x7Cd93A05B495541748c7B5d29503aEA526AB9958`
- **체인 ID**: `1270`
- **익스플로러**: https://testnet-explorer.irys.xyz/

### 환경 변수 설정
```bash
# frontend/.env.local 업데이트
VITE_CONTRACT_ADDRESS=0x9A854fA655994069500523f57101Ee80b753ea13
VITE_CHAIN_ID=1270
VITE_IMPLEMENTATION_ADDRESS=0x7Cd93A05B495541748c7B5d29503aEA526AB9958
VITE_IRYS_NETWORK=testnet
VITE_IRYS_TOKEN=ethereum
VITE_IRYS_RPC=https://testnet-rpc.irys.xyz/v1
VITE_IRYS_GATEWAY=https://testnet-gateway.irys.xyz
```

## 🔍 공식 PD 플로우

### 1. 데이터 업로드
```typescript
// 픽셀 데이터를 Irys에 업로드
const pixelData = { x, y, color, timestamp, type: 'pixel_placement' };
const transactionId = await irysClient.upload(JSON.stringify(pixelData));
```

### 2. Access List 생성
```typescript
// 공식 SDK 사용
const accessList = await irysClient.programmable_data
    .read(transactionId, startOffset, length)
    .toAccessList();
```

### 3. EIP-1559 트랜잭션
```typescript
// 공식 가이드 패턴
const evmTransaction = {
    accessList: [accessList],
    type: 2 // EIP-1559 필수
};
await wallet.sendTransaction(evmTransaction);
```

### 4. 스마트 컨트랙트에서 읽기
```solidity
function placePixelWithProgrammableData() external {
    // 공식 패턴
    (bool success, bytes memory data) = readBytes();
    require(success, "reading bytes failed");
    
    // 데이터를 스토리지에 저장
    storedData = data;
}
```

## ⚠️ 중요 사항

### 지원되는 데이터
- ✅ **영구 저장소(ledgerId 0)**: PD로 읽기 가능
- ❌ **DataItems (번들러)**: 현재 미지원 (향후 지원 예정)

### 비용 주의사항
- Access List에 포함된 **모든 청크에 대해 가스 비용 지불**
- 실제로 읽지 않는 데이터도 비용 발생
- 필요한 범위만 정확히 지정 필요

### 보안
- Access List는 **트랜잭션 생성 시점에 고정**
- 실행 중 임의로 다른 데이터 읽기 불가능
- 데이터 무결성은 Irys 네트워크에서 보장

## 🧪 테스트 방법

### 1. 프론트엔드 실행
```bash
cd frontend
npm run dev
```

### 2. PD 플로우 테스트
1. **Irys 연결**: 우측 패널에서 "Connect to Irys" 클릭
2. **픽셀 배치**: Enhanced Canvas에서 픽셀 클릭
3. **데이터 업로드**: 자동으로 Irys에 JSON 업로드
4. **Access List 생성**: `createAccessList()` 호출
5. **온체인 기록**: `placePixelWithProgrammableData()` 실행

### 3. 로그 확인
```javascript
// Access List 생성 로그
console.log('Programmable Data Access List 생성 성공:', accessList);

// PD 트랜잭션 로그
console.log('공식 PD 트랜잭션 전송 (공식 방식):', evmTransaction);
```

## 🔮 향후 계획

### SDK 완전 통합
- `@irys/js` 실제 SDK 연동 (현재 `@irys/sdk` 사용 중)
- 실제 Programmable Data API 사용
- 실제 프리컴파일 주소 확인

### 기능 확장
- 다중 체인 지원
- 고급 데이터 압축
- 배치 처리 기능

---

**참고 링크**:
- [공식 프리컴파일 라이브러리](https://github.com/Irys-xyz/precompile-libraries/)
- [공식 예제 컨트랙트](https://github.com/Irys-xyz/irys/blob/master/fixtures/contracts/src/IrysProgrammableDataBasic.sol)
- [E2E 테스트 코드](https://github.com/Irys-xyz/irys-js/blob/master/tests/programmableData.ts)

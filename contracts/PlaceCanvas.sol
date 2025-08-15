// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Irys Programmable Data library
import "./ProgrammableData.sol";

/**
 * @title PlaceCanvas
 * @dev r/place style canvas smart contract utilizing Irys Programmable Data
 * 
 * Programmable Data Features:
 * - Direct data reading from Irys
 * - Data access through Access Lists
 * - EIP-1559 transaction support
 * 
 * Payment Token: Irys Native Token (mIrys)
 * - Pixel placement: 1.0 mIrys (0.001 Irys)
 * 
 * Canvas Size: 1024x1024 pixels (fixed)
 * 
 * Upgradeable: Uses UUPS proxy pattern
 */
contract PlaceCanvas is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable, 
    UUPSUpgradeable,
    ProgrammableData 
    {
    
    // State variables
    uint256 public constant CANVAS_SIZE = 1024; // Fixed canvas size
    // Funding removed; track total pixels instead
    uint256 public pixelPrice;
    uint256 public maxProgrammableReadLength;
    uint256 public totalPixelsPlaced;
    
    // Treasury & auto-withdraw settings
    address payable public treasury;
    uint256 public autoWithdrawThreshold; // in wei; 0 disables auto-withdraw
    // On-chain rate limit
    uint256 public minPlacementInterval; // seconds; 0 disables
    mapping(address => uint256) public lastPlacementAt; // last placement timestamp per address
    
    // Events
    event PixelPlaced(uint256 indexed x, uint256 indexed y, bytes3 color, address indexed user, uint256 timestamp);
    // funding removed
    event PixelDataRead(uint256 indexed x, uint256 indexed y, string irysTxId, uint256 timestamp);
    event ProgrammableDataProcessed(string irysTxId, bytes data, uint256 timestamp);
    event PixelPriceUpdated(uint256 newPrice, uint256 timestamp);
    event MaxProgrammableReadLengthUpdated(uint256 newLength, uint256 timestamp);
    event TreasuryUpdated(address indexed newTreasury, uint256 timestamp);
    event AutoWithdrawThresholdUpdated(uint256 newThreshold, uint256 timestamp);
    event FundsWithdrawn(address indexed to, uint256 amount, uint256 timestamp);
    event AutoWithdraw(address indexed to, uint256 amount, uint256 timestamp);
    event UpgradedVersion(uint256 newVersion);
    event RateLimitUpdated(uint256 newInterval, uint256 timestamp);
    
    // 매핑: 픽셀 위치 -> 마지막 배치 정보
    mapping(uint256 => PixelData) public pixels;
    
    // Irys에서 읽어온 상세 데이터를 임시 저장 (Programmable Data 활용)
    mapping(string => bytes) private irysPixelDetails;
    // 무결성 확인을 위한 PD 해시(최적화 경로)
    mapping(string => bytes32) private irysPixelHash;
    
    // Programmable Data 읽기 기록
    mapping(string => bool) private processedIrysData;
    
    // 버전 관리
    uint256 public version;
    
    struct PixelData {
        bytes3 color;
        address placedBy;
        uint256 timestamp;
        string irysTxId; // Irys 트랜잭션 ID
        bool isProgrammableData; // Programmable Data 사용 여부
    }
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @dev Initialize contract (for UUPS proxy)
     * @param _pixelPrice Pixel placement price (wei)
     * @param _owner Owner address
     */
    function initialize(uint256 _pixelPrice, address _owner) public initializer {
        __Ownable_init(_owner);
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        require(_pixelPrice > 0, "Invalid pixel price");
        require(_owner != address(0), "Invalid owner address");
        
        pixelPrice = _pixelPrice;
        maxProgrammableReadLength = 1024;
        treasury = payable(_owner);
        autoWithdrawThreshold = 0; // disabled by default
        minPlacementInterval = 60; // 60 seconds rate limiting by default
        // establish version for upgraded deployments
        if (version == 0) {
            version = 2;
            emit UpgradedVersion(version);
        }
    }
    
    /**
     * @dev UUPS 업그레이드 권한 (소유자만)
     * @param newImplementation 새로운 구현 컨트랙트 주소
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /**
     * @dev 픽셀 배치 함수 (기존 방식)
     * @param x x 좌표
     * @param y y 좌표
     * @param color 픽셀 색상 (RGB)
     * @param irysTxId Irys에 저장된 데이터의 트랜잭션 ID
     */
    function placePixel(
        uint256 x,
        uint256 y,
        bytes3 color,
        string memory irysTxId
    ) external payable nonReentrant whenNotPaused {
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Pixel outside canvas bounds");
        require(msg.value >= pixelPrice, "Insufficient payment for pixel placement");
        if (minPlacementInterval > 0) {
            uint256 last = lastPlacementAt[msg.sender];
            require(block.timestamp >= last + minPlacementInterval, "Placement rate limited");
            lastPlacementAt[msg.sender] = block.timestamp;
        }
        
        // 픽셀 데이터 업데이트
        pixels[getPixelKey(x, y)] = PixelData({
            color: color,
            placedBy: msg.sender,
            timestamp: block.timestamp,
            irysTxId: irysTxId,
            isProgrammableData: false
        });
        
        // increase total pixel count
        totalPixelsPlaced += 1;

        emit PixelPlaced(x, y, color, msg.sender, block.timestamp);
        _autoWithdrawIfNeeded();
    }
    
    /**
     * @dev Programmable Data를 활용한 픽셀 배치 함수 (공식 방식)
     * 
     * 공식 가이드: https://github.com/Irys-xyz/irys/blob/master/fixtures/contracts/src/IrysProgrammableDataBasic.sol
     * 
     * 사용법:
     * 1. 프론트엔드에서 irysClient.programmable_data.read(transactionId, startOffset, length).toAccessList() 생성
     * 2. EIP-1559 트랜잭션에 accessList 포함하여 이 함수 호출
     * 3. 영구 저장소(ledgerId 0)에 업로드된 데이터만 읽기 가능
     * 
     * @param x x 좌표
     * @param y y 좌표
     * @param irysTxId Irys 트랜잭션 ID (검증용, Access List에 이미 포함되어야 함)
     */
    function placePixelWithProgrammableData(
        uint256 x,
        uint256 y,
        string memory irysTxId
    ) external payable nonReentrant whenNotPaused {
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Pixel outside canvas bounds");
        require(msg.value >= pixelPrice, "Insufficient payment for pixel placement");
        require(!processedIrysData[irysTxId], "Irys data already processed");
        require(bytes(irysTxId).length > 0, "Invalid Irys txId");
        if (minPlacementInterval > 0) {
            uint256 last = lastPlacementAt[msg.sender];
            require(block.timestamp >= last + minPlacementInterval, "Placement rate limited");
            lastPlacementAt[msg.sender] = block.timestamp;
        }
        
        // Official Irys Programmable Data pattern: read chunk into storage
        _readPdChunkIntoStorage(irysTxId);
        
        // 저장된 데이터에서 색상 추출
        bytes memory data = irysPixelDetails[irysTxId];
        bytes3 color = extractColorFromData(data);
        
        // 픽셀 데이터 업데이트
        pixels[getPixelKey(x, y)] = PixelData({
            color: color,
            placedBy: msg.sender,
            timestamp: block.timestamp,
            irysTxId: irysTxId,
            isProgrammableData: true
        });
        
        // increase total pixel count
        totalPixelsPlaced += 1;
        
        emit PixelPlaced(x, y, color, msg.sender, block.timestamp);
        emit PixelDataRead(x, y, irysTxId, block.timestamp);
        emit ProgrammableDataProcessed(irysTxId, data, block.timestamp);
        _autoWithdrawIfNeeded();
    }
    
    /**
     * @dev Official Irys Programmable Data reading pattern
     * Based on official IrysProgrammableDataBasic.sol implementation
     * 
     * Follows the official pattern:
     * 1. Call readBytes() from ProgrammableData contract
     * 2. Validate the returned data
     * 3. Store data with transaction ID for reference
     * 
     * @param irysTxId Irys transaction ID for data identification
     */
    function _readPdChunkIntoStorage(string memory irysTxId) internal {
        // Official Irys pattern: Call readBytes() to get data from access list
        (bool success, bytes memory data) = readBytes();
        require(success, "reading bytes failed");
        
        // Validate data size (JSON pixel data should be reasonable size)
        require(data.length >= 8 && data.length <= maxProgrammableReadLength, "Invalid PD payload size");
        
        // Store data in contract storage using official pattern
        irysPixelDetails[irysTxId] = data;
        irysPixelHash[irysTxId] = keccak256(data);
        processedIrysData[irysTxId] = true;
    }
    
    /**
     * @dev Official Irys Programmable Data retrieval pattern
     * Based on official getStorage() pattern from IrysProgrammableDataBasic.sol
     * 
     * @param irysTxId Irys transaction ID to retrieve data for
     * @return Stored Programmable Data bytes
     */
    function getStoredPDData(string memory irysTxId) public view returns (bytes memory) {
        require(processedIrysData[irysTxId], "Programmable data not processed");
        return irysPixelDetails[irysTxId];
    }
    
    /**
     * @dev Legacy function for backward compatibility
     * @deprecated Use getStoredPDData() instead
     */
    function getIrysPixelDetails(string memory irysTxId) public view returns (bytes memory) {
        return getStoredPDData(irysTxId);
    }
    
    /**
     * @dev 저장된 Programmable Data 해시 조회(최적화 경로)
     */
    function getIrysPixelHash(string memory irysTxId) external view returns (bytes32) {
        require(processedIrysData[irysTxId], "Irys data not processed");
        return irysPixelHash[irysTxId];
    }
    
    

    /**
     * @dev PD 처리 여부 확인(중복 방지용)
     */
    function isProcessedIrysData(string memory irysTxId) external view returns (bool) {
        return processedIrysData[irysTxId];
    }
    
    /**
     * @dev 데이터에서 색상 추출 (JSON 파싱)
     * @param data Irys에서 읽어온 데이터
     * @return 추출된 색상
     */
    function extractColorFromData(bytes memory data) internal pure returns (bytes3) {
        // JSON 데이터에서 색상 추출
        // 예: {"color": "#FF0000", "user": "0x...", "timestamp": 1234567890}
        
        // 간단한 JSON 파싱 (실제로는 더 정교한 파싱 필요)
        string memory dataString = string(data);
        
        // "#" 문자 찾기
        uint256 hashIndex = findSubstring(dataString, "#");
        require(hashIndex != type(uint256).max, "Invalid PD color format");
        // 6자리 hex 색상 추출
        require(hashIndex + 7 <= bytes(dataString).length, "Invalid PD color length");
        bytes memory colorBytes = new bytes(6);
        for (uint256 i = 0; i < 6; i++) {
            colorBytes[i] = bytes(dataString)[hashIndex + 1 + i];
        }
        string memory colorHex = string(colorBytes);
        return hexStringToBytes3(colorHex);
    }
    
    /**
     * @dev 문자열에서 부분 문자열 찾기
     * @param source 원본 문자열
     * @param target 찾을 문자열
     * @return 찾은 위치 (없으면 type(uint256).max)
     */
    function findSubstring(string memory source, string memory target) internal pure returns (uint256) {
        bytes memory sourceBytes = bytes(source);
        bytes memory targetBytes = bytes(target);
        
        if (targetBytes.length > sourceBytes.length) {
            return type(uint256).max;
        }
        
        for (uint256 i = 0; i <= sourceBytes.length - targetBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < targetBytes.length; j++) {
                if (sourceBytes[i + j] != targetBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    /**
     * @dev hex 문자열을 bytes3로 변환
     * @param hexString hex 문자열 (예: "FF0000")
     * @return bytes3 색상
     */
    function hexStringToBytes3(string memory hexString) internal pure returns (bytes3) {
        require(bytes(hexString).length == 6, "Invalid hex string length");
        
        bytes memory hexBytes = bytes(hexString);
        bytes3 result;
        
        for (uint256 i = 0; i < 6; i += 2) {
            uint8 high = hexCharToByte(hexBytes[i]);
            uint8 low = hexCharToByte(hexBytes[i + 1]);
            uint8 byteValue = (high << 4) | low;
            
            if (i == 0) result = bytes3(uint24(byteValue) << 16);
            else if (i == 2) result |= bytes3(uint24(byteValue) << 8);
            else result |= bytes3(uint24(byteValue));
        }
        
        return result;
    }
    
    /**
     * @dev hex 문자를 byte로 변환
     * @param c hex 문자
     * @return byte 값
     */
    function hexCharToByte(bytes1 c) internal pure returns (uint8) {
        if (c >= 0x30 && c <= 0x39) return uint8(c) - 0x30; // 0-9
        if (c >= 0x41 && c <= 0x46) return uint8(c) - 0x41 + 10; // A-F
        if (c >= 0x61 && c <= 0x66) return uint8(c) - 0x61 + 10; // a-f
        revert("Invalid hex character");
    }
    
    /**
     * @dev 주소를 hex 문자열로 변환
     * @param addr 주소
     * @return hex 문자열
     */
    function toHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(addr)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            buffer[2*i] = char(hi);
            buffer[2*i+1] = char(lo);
        }
        return string(buffer);
    }
    
    /**
     * @dev uint256을 문자열로 변환
     * @param value 변환할 값
     * @return 문자열
     */
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev byte를 hex 문자로 변환
     * @param b byte 값
     * @return c hex 문자
     */
    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
    
    // funding removed
    
    /**
     * @dev 픽셀 정보 조회
     * @param x x 좌표
     * @param y y 좌표
     * @return color 픽셀 색상
     * @return placedBy 배치한 사용자 주소
     * @return timestamp 배치 시간
     * @return irysTxId Irys 트랜잭션 ID
     * @return isProgrammableData Programmable Data 사용 여부
     */
    function getPixel(uint256 x, uint256 y) external view returns (
        bytes3 color,
        address placedBy,
        uint256 timestamp,
        string memory irysTxId,
        bool isProgrammableData
    ) {
        require(x < CANVAS_SIZE && y < CANVAS_SIZE, "Pixel outside canvas bounds");
        
        PixelData memory pixel = pixels[getPixelKey(x, y)];
        return (pixel.color, pixel.placedBy, pixel.timestamp, pixel.irysTxId, pixel.isProgrammableData);
    }
    
    /**
     * @dev 픽셀 키 생성 (x, y 좌표를 단일 키로 변환)
     * @param x x 좌표
     * @param y y 좌표
     * @return 픽셀 키
     */
    function getPixelKey(uint256 x, uint256 y) internal pure returns (uint256) {
        return (x << 128) | y;
    }
    
    /**
     * @dev 지정 범위 픽셀 색상을 packed bytes(RGBRGB...)로 반환
     */
    function getPixelsPacked(
        uint256 startX,
        uint256 startY,
        uint256 rows,
        uint256 cols
    ) external view returns (bytes memory) {
        require(startX < CANVAS_SIZE && startY < CANVAS_SIZE, "Start out of bounds");
        require(rows > 0 && cols > 0, "Invalid size");
        uint256 endX = startX + cols;
        uint256 endY = startY + rows;
        require(endX <= CANVAS_SIZE && endY <= CANVAS_SIZE, "Range out of bounds");
        bytes memory packed = new bytes(rows * cols * 3);
        uint256 idx = 0;
        for (uint256 y = startY; y < endY; y++) {
            for (uint256 x = startX; x < endX; x++) {
                PixelData memory p = pixels[getPixelKey(x, y)];
                packed[idx++] = p.color[0];
                packed[idx++] = p.color[1];
                packed[idx++] = p.color[2];
            }
        }
        return packed;
    }
    
    /**
     * @dev Get current canvas info
     * @return width current width (1024)
     * @return height current height (1024)
     * @return totalPixels total placed pixels
     * @return pixelPriceWei pixel price in wei
     * @return maxSize max canvas size
     */
    function getCanvasInfo() external view returns (
        uint256 width,
        uint256 height,
        uint256 totalPixels,
        uint256 pixelPriceWei,
        uint256 maxSize
    ) {
        return (CANVAS_SIZE, CANVAS_SIZE, totalPixelsPlaced, pixelPrice, CANVAS_SIZE);
    }
    
    // funding withdrawal removed
    
    /**
     * @dev 픽셀 가격 업데이트 (관리자만)
     * @param newPrice 새로운 픽셀 가격
     */
    function setPixelPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        pixelPrice = newPrice;
        emit PixelPriceUpdated(newPrice, block.timestamp);
    }

    /**
     * @dev Set treasury address (receiver of withdrawals)
     */
    function setTreasury(address payable newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury, block.timestamp);
    }

    /**
     * @dev Set auto-withdraw threshold in wei. 0 disables auto-withdraw.
     */
    function setAutoWithdrawThreshold(uint256 newThresholdWei) external onlyOwner {
        autoWithdrawThreshold = newThresholdWei;
        emit AutoWithdrawThresholdUpdated(newThresholdWei, block.timestamp);
    }
    
    /**
     * @dev Set on-chain min placement interval per address (seconds). 0 disables.
     */
    function setMinPlacementInterval(uint256 secondsInterval) external onlyOwner {
        require(secondsInterval <= 1 days, "Interval too large");
        minPlacementInterval = secondsInterval;
        emit RateLimitUpdated(secondsInterval, block.timestamp);
    }

    /**
     * @dev Manually withdraw funds to a recipient (defaults to treasury when address(0)).
     */
    function withdraw(uint256 amountWei, address payable to) external onlyOwner nonReentrant {
        address payable recipient = to == address(0) ? treasury : to;
        require(recipient != address(0), "Treasury not set");
        require(amountWei <= address(this).balance, "Insufficient balance");
        _payout(recipient, amountWei, true);
    }

    /**
     * @dev Withdraw all contract balance to recipient (defaults to treasury).
     */
    function withdrawAll(address payable to) external onlyOwner nonReentrant {
        address payable recipient = to == address(0) ? treasury : to;
        require(recipient != address(0), "Treasury not set");
        uint256 amount = address(this).balance;
        _payout(recipient, amount, true);
    }

    /**
     * @dev Internal: auto-withdraw when balance >= threshold. Never reverts user flow on failure.
     */
    function _autoWithdrawIfNeeded() internal {
        if (autoWithdrawThreshold == 0) return;
        if (address(this).balance < autoWithdrawThreshold) return;
        if (treasury == address(0)) return;
        uint256 amount = address(this).balance;
        // Non-reverting auto-withdraw to avoid breaking placements
        (bool ok, ) = treasury.call{value: amount}("");
        if (ok) {
            emit AutoWithdraw(treasury, amount, block.timestamp);
        }
    }

    function _payout(address payable to, uint256 amount, bool emitEvent) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "Withdraw failed");
        if (emitEvent) emit FundsWithdrawn(to, amount, block.timestamp);
    }

    /**
     * @dev 최대 Programmable Data 읽기 길이 업데이트 (관리자만)
     * @param newLength 새로운 최대 길이
     */
    function setMaxProgrammableReadLength(uint256 newLength) external onlyOwner {
        require(newLength > 0 && newLength <= 8192, "Invalid length");
        maxProgrammableReadLength = newLength;
        emit MaxProgrammableReadLengthUpdated(newLength, block.timestamp);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
    
    // multi-place removed per requirements
}

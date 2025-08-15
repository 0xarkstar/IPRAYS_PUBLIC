// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title PlaceCanvasProxy
 * @dev PlaceCanvas 컨트랙트를 위한 UUPS 프록시
 * 
 * 이 프록시는 PlaceCanvas의 구현을 가리키며,
 * 업그레이드 시 새로운 구현으로 교체할 수 있습니다.
 */
contract PlaceCanvasProxy is ERC1967Proxy {
    
    /**
     * @dev 프록시 생성자
     * @param _implementation 구현 컨트랙트 주소
     * @param _data 초기화 데이터 (initialize 함수 호출용)
     */
    constructor(
        address _implementation,
        bytes memory _data
    ) ERC1967Proxy(_implementation, _data) {}
}

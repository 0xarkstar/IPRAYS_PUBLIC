// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProgrammableData
 * @dev Official Irys Programmable Data library
 * 
 * Official implementation: https://github.com/Irys-xyz/precompile-libraries/
 * 
 * Usage:
 * 1. Generate irysClient.programmable_data.read(transactionId, startOffset, length).toAccessList() in frontend
 * 2. Include accessList in EIP-1559 transaction and send
 * 3. Call readBytes() in contract (no parameters)
 * 
 * Note: Only data uploaded to permanent storage (ledgerId 0) can be read
 *       DataItems are currently unsupported (planned for future support)
 */
contract ProgrammableData {
    
    /**
     * @dev Function to read Programmable Data defined in Access List
     * This function works through Irys network's custom precompile.
     * 
     * @return success Whether reading was successful
     * @return data Retrieved data (range defined in Access List)
     */
    function readBytes() internal view returns (bool success, bytes memory data) {
        // Call Irys network's custom precompile
        // Read predefined data range from Access List
        assembly {
            // Prepare empty call data in memory (readBytes() has no parameters)
            let ptr := mload(0x40)
            
            // Official Irys Programmable Data precompile address
            // Testnet: 0x0000000000000000000000000000000000000100
            // Mainnet: 0x0000000000000000000000000000000000000100
            success := staticcall(gas(), 0x0000000000000000000000000000000000000100, ptr, 0, 0, 0)
            
            if success {
                // Get returned data size
                let dataSize := returndatasize()
                
                // Allocate memory
                data := mload(0x40)
                mstore(0x40, add(data, add(dataSize, 0x20)))
                
                // Store data size
                mstore(data, dataSize)
                
                // Copy actual data
                returndatacopy(add(data, 0x20), 0, dataSize)
            }
        }
        
        return (success, data);
    }
    
    /**
     * @dev Legacy compatibility function (deprecated)
     * 
     * Note: Actual Irys PD only supports Access List method.
     * This function is maintained only for compatibility with existing code.
     * 
     * @param startOffset Start offset (unused)
     * @param length Data length (unused)
     * @return success Always false (not supported)
     * @return data Empty data
     */
    function readBytes(uint256 startOffset, uint256 length) internal pure returns (bool success, bytes memory data) {
        // Legacy method is not supported
        // Must use Access List method
        startOffset; // Prevent compiler warning
        length; // Prevent compiler warning
        
        return (false, new bytes(0));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ProgrammableData
 * @dev Official Irys Programmable Data library
 * 
 * Based on official Irys implementation:
 * - Repository: https://github.com/Irys-xyz/precompile-libraries/
 * - Example: https://github.com/Irys-xyz/irys/blob/master/fixtures/contracts/src/IrysProgrammableDataBasic.sol
 * - E2E Test: https://github.com/Irys-xyz/irys-js/blob/master/tests/programmableData.ts
 * 
 * Official Usage Pattern:
 * 1. Frontend: Generate access list using irys.programmableData.read(txId, offset, length)
 * 2. Frontend: Create EIP-1559 transaction with access list
 * 3. Contract: Call readBytes() to get data from access list (no parameters needed)
 * 4. Contract: Process and store data as needed
 * 
 * Requirements:
 * - Only works with permanent storage transactions (ledgerId 0)
 * - Bundled DataItems currently unsupported
 * - Must use EIP-1559 transactions with access lists
 * - Charged per chunk requested (even unread chunks)
 */
contract ProgrammableData {
    
    /**
     * @dev Official Irys Programmable Data precompile function
     * Reads bytes from access list defined in EIP-1559 transaction
     * 
     * Based on official pattern from IrysProgrammableDataBasic.sol
     * 
     * @return success Whether the precompile call was successful
     * @return data The byte data retrieved from Irys network
     */
    function readBytes() internal view returns (bool success, bytes memory data) {
        // Call Irys network's custom precompile at address 0x100
        // This precompile reads data ranges specified in the transaction's access list
        assembly {
            // Prepare call to precompile (no input data needed)
            let ptr := mload(0x40)
            
            // Official Irys Programmable Data precompile address
            // Address: 0x0000000000000000000000000000000000000100
            success := staticcall(gas(), 0x0000000000000000000000000000000000000100, ptr, 0, 0, 0)
            
            if success {
                // Get returned data size
                let dataSize := returndatasize()
                
                // Allocate memory for data
                data := mload(0x40)
                mstore(0x40, add(data, add(dataSize, 0x20)))
                
                // Store data length at the beginning
                mstore(data, dataSize)
                
                // Copy actual data from returndata
                returndatacopy(add(data, 0x20), 0, dataSize)
            }
        }
        
        return (success, data);
    }
    
}

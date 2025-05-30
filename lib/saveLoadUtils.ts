// lib/saveLoadUtils.ts

const SHIFT_KEY = 5; // Simple Caesar cipher shift for obfuscation

/**
 * Obfuscates the game state into a portable save code.
 * @param state The game state object to save.
 * @returns A string representing the obfuscated save code.
 */
export function obfuscateState(state: object): string {
  try {
    const jsonString = JSON.stringify(state);
    // Step 1: Base64 encode
    const base64Encoded = btoa(jsonString);
    // Step 2: Simple character shift
    let shiftedString = '';
    for (let i = 0; i < base64Encoded.length; i++) {
      shiftedString += String.fromCharCode(base64Encoded.charCodeAt(i) + SHIFT_KEY);
    }
    return shiftedString;
  } catch (error) {
    console.error("Error obfuscating state:", error);
    return "Error: Could not generate save code.";
  }
}

/**
 * Deobfuscates a save code back into a game state object.
 * @param code The save code string.
 * @returns The game state object if deobfuscation is successful, otherwise null.
 */
export function deobfuscateCode(code: string): object | null {
  try {
    // Step 1: Reverse character shift
    let unshiftedString = '';
    for (let i = 0; i < code.length; i++) {
      unshiftedString += String.fromCharCode(code.charCodeAt(i) - SHIFT_KEY);
    }
    // Step 2: Base64 decode
    const jsonString = atob(unshiftedString);
    return JSON.parse(jsonString);
  } catch (error) {
    // console.error("Error deobfuscating code:", error); // Can be noisy if user pastes garbage
    return null;
  }
}

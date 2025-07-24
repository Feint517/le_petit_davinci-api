/**
 * Generates a secure random password
 * @returns {string} A randomly generated password of 10 characters
 */
const generateRandomPassword = (): string => {
    const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    let password: string = '';
    for (let i: number = 0; i < 10; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
};

/**
 * Generates a 4-digit random PIN
 * @returns {string} A randomly generated 4-digit PIN as a string
 */
const generateRandomPin = (): string => {
    return Math.floor(1000 + Math.random() * 9000).toString(); // Generates a number between 1000-9999
};

export { generateRandomPassword, generateRandomPin };

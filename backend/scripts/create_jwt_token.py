import secrets
import string

def generate_jwt_secret(length=32):
    """
    Generates a cryptographically secure random string suitable for a JWT secret.

    Args:
        length (int): The desired length of the secret in characters.
                      A length of 32 characters (16 bytes converted to hex)
                      is a good starting point for security.

    Returns:
        str: A random hexadecimal string.
    """
    # secrets.token_hex(nbytes) returns a random text string, in hexadecimal.
    # Each byte is converted to two hex digits, so length will be nbytes * 2.
    # To get a secret of 'length' characters, we need length / 2 bytes.
    return secrets.token_hex(length // 2)

# Generate a 64-character (32-byte) secret
jwt_secret = generate_jwt_secret(64)
print(f"Your new JWT_SECRET: {jwt_secret}")

# You can also generate a URL-safe base64 encoded string
# This will result in a slightly shorter string for the same number of bytes
# jwt_secret_url_safe = secrets.token_urlsafe(32) # Generates 32 random bytes, then Base64 encodes
# print(f"Your new URL-safe JWT_SECRET: {jwt_secret_url_safe}")

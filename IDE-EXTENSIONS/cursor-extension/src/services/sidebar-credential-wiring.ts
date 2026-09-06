export interface RouterCredentialService {
    getStoredCredentials(): Promise<{ token: string } | null>;
}

/** Resolve a usable token without exposing the credential source to the router. */
export async function resolveRouterCredential(
    credentialService: RouterCredentialService | null,
): Promise<string | null> {
    if (!credentialService) return null;

    try {
        const credential = await credentialService.getStoredCredentials();
        return credential?.token?.trim() ? credential.token.trim() : null;
    } catch {
        return null;
    }
}

declare module 'intuit-oauth' {
    export default class OAuthClient {
        static scopes: {
            Accounting: string;
            Payment: string;
            Payroll: string;
            OpenId: string;
            Profile: string;
            Email: string;
            Phone: string;
            Address: string;
        };
        static environment: {
            sandbox: string;
            production: string;
        };

        constructor(config: {
            clientId: string;
            clientSecret: string;
            environment: string;
            redirectUri: string;
            logging?: boolean;
        });

        environment: string;
        clientId: string;
        clientSecret: string;
        redirectUri: string;

        authorizeUri(options: {
            scope: string | string[];
            state?: string;
        }): string;

        createToken(url: string): Promise<AuthResponse>;
        refresh(): Promise<AuthResponse>;
        isAccessTokenValid(): boolean;
        getToken(): any;
        setToken(token: any): void;
        makeApiCall(options: any): Promise<any>;
    }

    interface AuthResponse {
        getJson(): any;
        token: {
            realmId: string;
            [key: string]: any;
        };
    }
}

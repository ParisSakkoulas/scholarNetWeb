export interface Register {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
}

export interface RegisterResponse {
    message: string;
}

export interface Login {
    identifier: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    role: string;
    status: string;
}



export interface EmailVerify {
    token: string;
}

export interface VerifyEmailResponse {
    message: string;
}
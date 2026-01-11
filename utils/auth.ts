import { UserEntity } from '../types';
import { DatabaseService } from './db';

const SESSION_KEY = 'chronos_active_session';

const hashPassword = (password: string): string => {
    // Basic obscuring for prototype storage
    return btoa(unescape(encodeURIComponent(password + "_chronos_salt_v1"))); 
};

const verifyPassword = (password: string, hash: string): boolean => {
    return hash === hashPassword(password);
};

export const AuthService = {
    me: async (): Promise<UserEntity | null> => {
        return AuthService.getCurrentUser();
    },

    register: (email: string, password: string, displayName: string, language: 'EN' | 'RU'): UserEntity => {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error(language === 'RU' ? "Введите email" : "Email required");
        
        const users = DatabaseService.users.getAll();
        const existingUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
        
        if (existingUser) {
            throw new Error(language === 'RU' ? "Аккаунт с таким email уже существует" : "Account already exists");
        }

        const newUser: UserEntity = {
            id: crypto.randomUUID(),
            displayName: displayName.trim() || cleanEmail.split('@')[0],
            email: cleanEmail,
            passwordHash: hashPassword(password),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastLoginAt: Date.now(),
            preferredLanguage: language,
            aiTonePreference: 'Coach',
            isGuest: false,
            theme: 'dark',
            notifications: true,
            onboardingCompleted: false, 
            coachingProfile: {
                mainGoal: '',
                biggestObstacle: '',
                productiveHours: 'MORNING',
                motivationStyle: 'ANALYTICAL'
            }
        };

        // Attempt write
        DatabaseService.users.insert(newUser);
        
        // Verification Read
        const saved = DatabaseService.users.getById(newUser.id);
        if (!saved) {
            throw new Error(language === 'RU' ? "Ошибка базы данных: пользователь не сохранен" : "DB Error: User not saved");
        }

        AuthService.setSession(newUser);
        return newUser;
    },

    login: (email: string, password: string, language: 'EN' | 'RU'): UserEntity => {
        const cleanEmail = email.trim().toLowerCase();
        const users = DatabaseService.users.getAll();
        
        const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!user) {
             throw new Error(language === 'RU' ? `Пользователь ${cleanEmail} не найден. Проверьте email или зарегистрируйтесь.` : "User not found");
        }

        if (user.passwordHash && !verifyPassword(password, user.passwordHash)) {
             throw new Error(language === 'RU' ? "Неверный пароль" : "Invalid password");
        }

        const updatedUser = { ...user, lastLoginAt: Date.now() };
        DatabaseService.users.update(updatedUser);
        AuthService.setSession(updatedUser);
        return updatedUser;
    },

    loginGuest: (language: 'EN' | 'RU'): UserEntity => {
        const guestId = `guest_${Date.now()}`;
        const guestUser: UserEntity = {
            id: guestId,
            displayName: language === 'RU' ? 'Гость' : 'Guest',
            email: '',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastLoginAt: Date.now(),
            preferredLanguage: language,
            aiTonePreference: 'Coach',
            isGuest: true,
            theme: 'dark',
            notifications: false,
            onboardingCompleted: false,
            coachingProfile: {
                mainGoal: 'Улучшить продуктивность',
                biggestObstacle: 'Прокрастинация',
                productiveHours: 'MORNING',
                motivationStyle: 'ANALYTICAL'
            }
        };
        
        DatabaseService.users.insert(guestUser);
        AuthService.setSession(guestUser);
        return guestUser;
    },

    setSession: (user: UserEntity) => {
        localStorage.setItem(SESSION_KEY, user.id);
    },

    getCurrentUser: (): UserEntity | null => {
        try {
            const userId = localStorage.getItem(SESSION_KEY);
            if (!userId) return null;

            const user = DatabaseService.users.getById(userId);
            if (user) {
                // Ensure critical fields exist
                if (!user.coachingProfile) {
                    user.coachingProfile = { mainGoal: '', biggestObstacle: '', productiveHours: 'MORNING', motivationStyle: 'ANALYTICAL' };
                    DatabaseService.users.update(user);
                }
                return user;
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    logout: () => {
        localStorage.removeItem(SESSION_KEY);
    },

    updateUser: (user: UserEntity) => {
        DatabaseService.users.update(user);
    },
    
    initDevSeed: () => {
        const users = DatabaseService.users.getAll();
        const demoEmail = 'demo@chronos.local';
        if (!users.find((u) => u.email === demoEmail)) {
            const demoUser: UserEntity = {
                id: 'demo-user-id',
                displayName: 'Демо Пользователь',
                email: demoEmail,
                passwordHash: hashPassword('Demo1234'),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastLoginAt: Date.now(),
                preferredLanguage: 'RU',
                aiTonePreference: 'Coach',
                isGuest: false,
                theme: 'dark',
                notifications: true,
                onboardingCompleted: true, 
                coachingProfile: {
                    mainGoal: 'Тестирование системы',
                    biggestObstacle: 'Хаос',
                    productiveHours: 'MORNING',
                    motivationStyle: 'ANALYTICAL'
                }
            };
            DatabaseService.users.insert(demoUser);
        }
    }
};
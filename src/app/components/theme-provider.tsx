import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type UserTheme = "dark" | "light" | "system";
export type AppTheme = Exclude<UserTheme, "system">;
export type Theme = UserTheme;

export const THEME_STORAGE_KEY = "gardening-ui-theme";
const VALID_THEMES = ["light", "dark", "system"] as const;

type ThemeProviderProps = {
	children: ReactNode;
	defaultTheme?: UserTheme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: UserTheme;
	userTheme: UserTheme;
	appTheme: AppTheme;
	setTheme: (theme: UserTheme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

function parseUserTheme(value: string | null | undefined, fallback: UserTheme): UserTheme {
	if (value && VALID_THEMES.includes(value as UserTheme)) return value as UserTheme;
	return fallback;
}

function getStoredUserTheme(storageKey: string, fallback: UserTheme): UserTheme {
	if (typeof window === "undefined") return fallback;
	try {
		return parseUserTheme(localStorage.getItem(storageKey), fallback);
	} catch {
		return fallback;
	}
}

function getSystemTheme(): AppTheme {
	if (typeof window === "undefined") return "light";
	return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveAppTheme(userTheme: UserTheme): AppTheme {
	return userTheme === "system" ? getSystemTheme() : userTheme;
}

function applyThemeToRoot(userTheme: UserTheme) {
	if (typeof document === "undefined") return;
	const appTheme = resolveAppTheme(userTheme);
	const root = document.documentElement;

	root.classList.remove("light", "dark", "system");
	root.classList.add(appTheme);
	if (userTheme === "system") root.classList.add("system");
	root.style.colorScheme = appTheme;
}

function setStoredTheme(storageKey: string, theme: UserTheme) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(storageKey, theme);
	} catch {
		/* ignore */
	}
}

export function buildThemeInitScript(storageKey: string = THEME_STORAGE_KEY): string {
	return `(function(){try{var k=${JSON.stringify(storageKey)};var s=localStorage.getItem(k);var u=(s==='light'||s==='dark'||s==='system')?s:'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var a=u==='system'?(d?'dark':'light'):u;var r=document.documentElement;r.classList.remove('light','dark','system');r.classList.add(a);if(u==='system')r.classList.add('system');r.style.colorScheme=a;}catch(_){var dd=window.matchMedia('(prefers-color-scheme: dark)').matches;var aa=dd?'dark':'light';var rr=document.documentElement;rr.classList.remove('light','dark','system');rr.classList.add(aa);rr.classList.add('system');rr.style.colorScheme=aa;}})();`;
}

export function ThemeProvider({
	children,
	defaultTheme = "system",
	storageKey = THEME_STORAGE_KEY,
}: ThemeProviderProps) {
	const [userTheme, setUserTheme] = useState<UserTheme>(() => getStoredUserTheme(storageKey, defaultTheme));
	const [systemTheme, setSystemTheme] = useState<AppTheme>(() => getSystemTheme());

	useEffect(() => {
		applyThemeToRoot(userTheme);
	}, [userTheme]);

	useEffect(() => {
		if (typeof window === "undefined" || userTheme !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const onChange = () => {
			setSystemTheme(mq.matches ? "dark" : "light");
			applyThemeToRoot("system");
		};
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, [userTheme]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const onStorage = (event: StorageEvent) => {
			if (event.key !== storageKey) return;
			setUserTheme(parseUserTheme(event.newValue, defaultTheme));
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, [storageKey, defaultTheme]);

	const appTheme = useMemo<AppTheme>(
		() => (userTheme === "system" ? systemTheme : userTheme),
		[userTheme, systemTheme],
	);

	const value: ThemeProviderState = {
		theme: userTheme,
		userTheme,
		appTheme,
		setTheme: (nextTheme) => {
			setUserTheme(nextTheme);
			if (nextTheme === "system") setSystemTheme(getSystemTheme());
			setStoredTheme(storageKey, nextTheme);
			applyThemeToRoot(nextTheme);
		},
	};

	return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeProviderContext);
	if (!context) {
		throw new Error("useTheme must be used within a ThemeProvider");
	}
	return context;
}

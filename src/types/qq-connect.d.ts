declare interface QCType {
  Login: {
    (options: {
      btnId: string;
      size?: 'A_XL' | 'A_L' | 'A_M' | 'A_S' | 'B_M' | 'B_S';
      scope?: string;
      display?: 'pc' | 'mobile';
    }): void;
    check: () => boolean;
    signOut: () => void;
    getMe: (callback: (openId: string, accessToken: string) => void) => void;
    openId: string;
  };
  api: (api: string) => {
    success: <T>(callback: (response: T) => void) => {
      error: (callback: (error: any) => void) => void;
    };
  };
}

declare global {
  interface Window {
    QC: QCType;
  }
}

export {};

declare interface Window {
  QC: {
    Login: {
      check: () => boolean;
      getMe: (callback: (openId: string, accessToken: string) => void) => void;
      signOut: () => void;
    };
    api: (path: string) => {
      success: (callback: (response: any) => void) => any;
      error: (callback: (error: any) => void) => any;
    };
  };
}

// 扩展 ImportMetaEnv 类型
interface ImportMetaEnv {
  VITE_QQ_APP_ID: string;
  VITE_QQ_APP_KEY: string;
  VITE_QQ_REDIRECT_URI: string;
} 